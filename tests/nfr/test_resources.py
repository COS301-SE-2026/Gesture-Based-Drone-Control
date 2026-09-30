"""
Start-up time and resource stability

QR-41 / NFR1.1 -> time until the operator can start: backend process launch ->
/api/health answers (Electron opens the window only then), and first gesture frame
after the dashboard subscribes
QR-42 / NFR1.2 -> memory stays flat over a sustained run (no per-frame leak in
engine, stabilizer, adapter, event log or serialization)
"""

from __future__ import annotations

import asyncio
import os
import socket
import subprocess
import sys
import time
import tracemalloc
import urllib.request

import pytest

from tests.nfr._helpers import REPO_ROOT, emit, summarize, write_samples
from tests.nfr._perf import LandmarkScript, PacedVideoCamera, clip_config, paced_camera_factory

TARGET_COLD_START_S = 10.0
TARGET_FIRST_FRAME_S = 3.0
TARGET_HEAP_GROWTH_KB = 1024
COLD_STARTS = 3


def _free_port() -> int:
	with socket.socket() as s:
		s.bind(('127.0.0.1', 0))
		return s.getsockname()[1]


def _cold_start_seconds(tmp_path) -> float:
	port = _free_port()
	env = {
		**os.environ,
		'PYTHONPATH': os.pathsep.join([str(REPO_ROOT), str(REPO_ROOT / 'apps' / 'backend')]),
		'SQLITE_DB_PATH': str(tmp_path / f'cold-{port}.db'),
	}
	start = time.perf_counter()
	proc = subprocess.Popen(
		[
			sys.executable,
			'-m',
			'uvicorn',
			'app.main:app',
			'--port',
			str(port),
			'--app-dir',
			'apps/backend',
			'--log-level',
			'warning',
		],
		cwd=REPO_ROOT,
		env=env,
		stdout=subprocess.DEVNULL,
		stderr=subprocess.DEVNULL,
	)
	try:
		deadline = start + 60
		while time.perf_counter() < deadline:
			if proc.poll() is not None:
				raise RuntimeError(f'backend exited with {proc.returncode} during start-up')
			try:
				with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=1) as r:
					if r.status == 200:
						return time.perf_counter() - start
			except OSError:
				pass
			time.sleep(0.05)
		raise TimeoutError('backend never answered /api/health')
	finally:
		proc.terminate()
		try:
			proc.wait(timeout=10)
		except subprocess.TimeoutExpired:
			proc.kill()


async def _first_frame_seconds() -> tuple[float, float]:
	import app.api.gestures as gestures_api
	from app.cv.stream import GestureStream

	stream = GestureStream()
	start = time.perf_counter()
	queue = await stream.subscribe()
	payload = await asyncio.wait_for(queue.get(), timeout=30)
	first_frame = time.perf_counter() - start
	assert payload is not None

	await stream.unsubscribe(queue)
	await stream.shutdown()
	del gestures_api

	# first switch to ML costs one model load (cached by the pipeline afterwards)
	from services.cv_pipeline.gestures.recognizers.ml_based import MLBasedRecognizer

	start = time.perf_counter()
	MLBasedRecognizer()
	swap = time.perf_counter() - start
	return first_frame, swap


def test_time_to_ready(tmp_path):
	import services.cv_pipeline.processing.pipeline as pipeline_mod

	cold = [_cold_start_seconds(tmp_path) for _ in range(COLD_STARTS)]

	with pytest.MonkeyPatch.context() as mp:
		mp.setattr(pipeline_mod, 'CameraFeed', paced_camera_factory(clip_config().video_path, 30))
		first_frame, swap = asyncio.run(_first_frame_seconds())

	worst_cold = round(max(cold), 2)
	passed = worst_cold <= TARGET_COLD_START_S and first_frame <= TARGET_FIRST_FRAME_S

	write_samples(
		'QR-41',
		{
			'stage': [f'cold start {i + 1}' for i in range(COLD_STARTS)]
			+ ['first gesture frame', 'ML model load'],
			'seconds': [round(c, 3) for c in cold] + [round(first_frame, 3), round(swap, 3)],
		},
	)
	emit(
		'QR-41',
		'NFR1.1',
		'slowest backend cold start: process launch -> /api/health OK (s)',
		actual=worst_cold,
		target=f'<= {TARGET_COLD_START_S} s; first gesture frame <= {TARGET_FIRST_FRAME_S} s',
		passed=passed,
		cold_starts_s=[round(c, 2) for c in cold],
		first_gesture_frame_s=round(first_frame, 3),
		ml_model_load_s=round(swap, 3),
		method=(
			'uvicorn started as a new process (imports, DB create, seed) and polled every '
			'50 ms, exactly what Electron waits for before opening the window. First gesture '
			'frame: GestureStream.subscribe() until the first payload arrives (MediaPipe init '
			'+ first frame; physical webcam open time excluded).'
		),
		chart={
			'kind': 'bars',
			'column': 'seconds',
			'label': 'stage',
			'unit': 's',
			'threshold': TARGET_COLD_START_S,
		},
	)
	assert worst_cold <= TARGET_COLD_START_S, f'cold start {cold}'
	assert first_frame <= TARGET_FIRST_FRAME_S, f'first gesture frame took {first_frame:.2f} s'


def test_memory_stays_flat():
	from app.cv.serialization import serialize_event

	from services.cv_pipeline.gestures.gesture_engine import GestureEngine
	from services.cv_pipeline.gestures.recognizers.ml_based import MLBasedRecognizer
	from services.cv_pipeline.hand_detection.mediapipe_detector import HandDetectionResult
	from services.cv_pipeline.processing.pipeline import HandMetrics, PipelineEvent
	from services.input.gesture_events import GestureEventLog
	from services.input.sources.gesture_adapter import GestureAdapter

	camera = PacedVideoCamera(clip_config(fps=1000))
	camera.open()
	script = LandmarkScript()
	engine = GestureEngine(MLBasedRecognizer())
	adapter = GestureAdapter(event_log=GestureEventLog())
	commands = 0

	def count(_command) -> None:
		nonlocal commands
		commands += 1

	adapter.set_handler(count)

	warmup, measured, every = 500, 4000, 250
	heap_kb: list[float] = []
	tracemalloc.start()
	try:
		for i in range(warmup + measured):
			frame = camera.capture_image()
			hands = script.hands_for(frame.frame_index)
			detection = HandDetectionResult(hands=hands, frame_index=frame.frame_index)
			event = PipelineEvent(
				frame=frame,
				engine_result=engine.process(detection),
				detection=detection,
				fps=30.0,
				hand_metrics=[HandMetrics(h.handedness, h.confidence, 0.1) for h in hands],
			)
			adapter._process_payload(serialize_event(event, include_frame=True))
			if i >= warmup and (i - warmup) % every == 0:
				heap_kb.append(tracemalloc.get_traced_memory()[0] / 1024)
		heap_kb.append(tracemalloc.get_traced_memory()[0] / 1024)
	finally:
		tracemalloc.stop()
		camera.close()

	growth = round(heap_kb[-1] - heap_kb[0], 1)
	passed = growth <= TARGET_HEAP_GROWTH_KB

	write_samples('QR-42', {'frame': [i * every for i in range(len(heap_kb))], 'heap_kb': heap_kb})
	emit(
		'QR-42',
		'NFR1.2',
		f'Python heap growth over {measured} frames after warm-up (KB)',
		actual=growth,
		target=f'<= {TARGET_HEAP_GROWTH_KB}',
		passed=passed,
		heap_kb=summarize(heap_kb, 1),
		commands_emitted=commands,
		method=(
			'tracemalloc over the per-frame path: ML recognition, stabilizer, JPEG '
			'serialization, GestureAdapter and the gesture history log. A leak of even one '
			'small object per frame would show as steady growth.'
		),
		chart={'kind': 'series', 'column': 'heap_kb', 'unit': 'KB'},
	)
	assert passed, f'heap grew {growth} KB over {measured} frames'
