"""
Full-system real-time performance, measured on the production chain:

  camera thread -> BoundedFrameQueue -> MediaPipe -> GestureEngine (ML)
  -> GestureStream broadcast (JPEG + fan-out) -> GestureAdapter -> DroneAdapter

QR-26 / NFR1.1 -> hand-detection stage latency under live load
QR-29 / NFR1.1 -> frame timestamp -> command dispatched, p95 <= 200 ms
QR-30 / NFR1.1 -> gesture onset -> command dispatched (includes the
stabilizer's deliberate hold), p95 <= 200 ms
QR-31 / NFR1.2 -> pipeline capacity: processed fps with a 90 fps source >= 30
QR-32 / NFR1.2 -> whole-process CPU at 30 fps <= 70 % of the machine
QR-33 / NFR1.2 -> frames dropped at the camera's native 30 fps <= 1 %
QR-34 / NFR1.3 -> every one of 10 live clients receives >= 24 fps while an
11th, stalled client is connected
"""

from __future__ import annotations

import asyncio
import contextlib
import time
from dataclasses import dataclass, field

import pytest
from tests.nfr._perf import CpuMeter, LandmarkScript, paced_camera_factory, reference_clip

from services.cv_pipeline.hand_detection.mediapipe_detector import HandDetectionPipeline
from services.drone_control.adapters.dummy_drone_adapter import DummyDroneAdapter
from services.input.gesture_events import GestureEventLog
from services.input.sources.gesture_adapter import GestureAdapter
from tests.nfr._helpers import emit, summarize, write_samples

TARGET_E2E_P95_MS = 200.0
TARGET_DETECT_P95_MS = 100.0
TARGET_FPS = 30.0
TARGET_CPU_PCT = 70.0
TARGET_DROP_PCT = 1.0
TARGET_CLIENT_FPS = 24.0

WARMUP_S = 3.0
WINDOW_S = 30.0
CAPACITY_WINDOW_S = 8.0
OBSERVERS = 10


class ProbedGestureAdapter(GestureAdapter):
	"""The production adapter, remembering which frame it is resolving"""

	current_frame_ts: float = 0.0
	current_frame_index: int = 0

	def _process_payload(self, payload) -> None:
		self.current_frame_ts = payload.timestamp
		self.current_frame_index = payload.frame_index
		super()._process_payload(payload)


@dataclass
class LiveRun:
	fps: int
	window_start: float = 0.0
	window_end: float = 0.0
	dispatches: list[tuple[int, float, float, str]] = field(default_factory=list)
	detect_ms: list[tuple[float, float]] = field(default_factory=list)
	receipts: dict[int, list[tuple[float, float]]] = field(default_factory=dict)
	captured_at_start: int = 0
	captured_at_end: int = 0
	cpu_machine_pct: float = 0.0
	cpu_single_core_pct: float = 0.0
	script: LandmarkScript | None = None

	@property
	def seconds(self) -> float:
		return self.window_end - self.window_start

	def in_window(self, ts: float) -> bool:
		return self.window_start <= ts <= self.window_end


async def _live_run(mp: pytest.MonkeyPatch, fps: int, window_s: float, observers: int) -> LiveRun:
	import app.api.gestures as gestures_api
	import app.cv.stream as stream_mod

	import services.cv_pipeline.processing.pipeline as pipeline_mod

	run = LiveRun(fps=fps, script=LandmarkScript())
	cameras = []
	camera_factory = paced_camera_factory(str(reference_clip()), fps)

	def build_camera(config):
		cam = camera_factory(config)
		cameras.append(cam)
		return cam

	real_detect = HandDetectionPipeline.detect_hands

	def detect_and_inject(self, frame):
		start = time.perf_counter()
		real = real_detect(self, frame)
		run.detect_ms.append((frame.timestamp, (time.perf_counter() - start) * 1000))
		return run.script.inject(frame, real)

	mp.setattr(pipeline_mod, 'CameraFeed', build_camera)
	mp.setattr(HandDetectionPipeline, 'detect_hands', detect_and_inject)
	mp.setattr(stream_mod, 'LINGER_SECONDS', 0.1)

	stream = gestures_api.stream
	await stream.set_recognizer_mode('ml')

	drone = DummyDroneAdapter()
	await drone.connect()
	adapter = ProbedGestureAdapter(event_log=GestureEventLog())
	loop = asyncio.get_running_loop()

	def handler(command) -> None:
		# same shape as input.py _make_handler: schedule execute on the loop
		frame_ts = adapter.current_frame_ts
		frame_index = adapter.current_frame_index

		async def execute() -> None:
			await drone.execute(command)
			run.dispatches.append((frame_index, frame_ts, time.monotonic(), command.type.name))

		loop.create_task(execute())

	adapter.set_handler(handler)
	await adapter.start()

	tasks: list[asyncio.Task] = []
	queues: list[asyncio.Queue] = []

	async def observe(client_id: int, queue: asyncio.Queue) -> None:
		log = run.receipts.setdefault(client_id, [])
		while True:
			payload = await queue.get()
			if payload is None:
				return
			log.append((time.monotonic(), payload.timestamp))

	for client_id in range(observers):
		queue = await stream.subscribe()
		queues.append(queue)
		tasks.append(asyncio.create_task(observe(client_id, queue)))

	# a browser tab that stopped reading: its queue is never drained
	stalled = await stream.subscribe() if observers else None

	try:
		await asyncio.sleep(WARMUP_S)
		run.window_start = time.monotonic()
		run.captured_at_start = sum(c.frames_delivered for c in cameras)
		with CpuMeter() as cpu:
			await asyncio.sleep(window_s)
		run.window_end = time.monotonic()
		run.captured_at_end = sum(c.frames_delivered for c in cameras)
		run.cpu_machine_pct = cpu.machine_pct
		run.cpu_single_core_pct = cpu.single_core_pct
		# let in-flight executes land before tearing down
		await asyncio.sleep(0.3)
	finally:
		await adapter.stop()
		for task in tasks:
			task.cancel()
			with contextlib.suppress(asyncio.CancelledError):
				await task
		for queue in [*queues, stalled]:
			if queue is not None:
				await stream.unsubscribe(queue)
		await stream.shutdown()
		await stream.set_recognizer_mode('rule')
	return run


@pytest.fixture(scope='module')
def steady_run() -> LiveRun:
	with pytest.MonkeyPatch.context() as mp:
		return asyncio.run(_live_run(mp, fps=30, window_s=WINDOW_S, observers=OBSERVERS))


@pytest.fixture(scope='module')
def capacity_run() -> LiveRun:
	with pytest.MonkeyPatch.context() as mp:
		return asyncio.run(_live_run(mp, fps=90, window_s=CAPACITY_WINDOW_S, observers=0))


def _processed_in_window(run: LiveRun) -> list[tuple[int, float]]:
	return [(i, ts) for i, ts in run.script.processed if run.in_window(ts)]


# NFR1.1 latency


def test_detection_stage_latency(steady_run: LiveRun):
	samples = [ms for ts, ms in steady_run.detect_ms if steady_run.in_window(ts)]
	stats = summarize(samples)
	value = stats['p95']
	passed = value <= TARGET_DETECT_P95_MS

	write_samples('QR-26', {'detect_ms': samples})
	emit(
		'QR-26',
		'NFR1.1',
		'p95 MediaPipe hand-detection time per frame, live at 30 fps (ms)',
		actual=value,
		target=f'<= {TARGET_DETECT_P95_MS}',
		passed=passed,
		stats=stats,
		method=(
			'MediaPipe Hands (model_complexity=0) timed on every 640x480 frame of real '
			'footage while the full pipeline, broadcast and 11 clients run. No hand is in '
			'the footage, so the palm detector runs on every frame (its slowest path).'
		),
		chart={'kind': 'histogram', 'column': 'detect_ms', 'unit': 'ms', 'threshold': 100},
	)
	assert passed, f'detector p95 {value} ms over {TARGET_DETECT_P95_MS} ms budget'


def test_frame_to_dispatch_latency(steady_run: LiveRun):
	samples = [
		(done - frame_ts) * 1000
		for _, frame_ts, done, _ in steady_run.dispatches
		if steady_run.in_window(frame_ts)
	]
	assert samples, 'no commands were dispatched during the measurement window'
	stats = summarize(samples)
	value = stats['p95']
	passed = value <= TARGET_E2E_P95_MS

	write_samples('QR-29', {'frame_to_dispatch_ms': samples})
	emit(
		'QR-29',
		'NFR1.1',
		'p95 frame timestamp -> command dispatched to drone (ms)',
		actual=value,
		target=f'<= {TARGET_E2E_P95_MS}',
		passed=passed,
		stats=stats,
		commands_dispatched=len(samples),
		method=(
			'Latency from CapturedFrame.timestamp to DroneAdapter.execute() returning, for '
			'every command the GestureAdapter emitted in a 30 s window at 30 fps. Includes '
			'queue wait, detection, ML recognition, stabilizer, JPEG encode, fan-out, '
			'adapter resolution and dispatch.'
		),
		chart={
			'kind': 'histogram',
			'column': 'frame_to_dispatch_ms',
			'unit': 'ms',
			'threshold': TARGET_E2E_P95_MS,
		},
	)
	assert passed, f'frame->dispatch p95 {value} ms exceeds {TARGET_E2E_P95_MS} ms'


def test_gesture_onset_to_command_latency(steady_run: LiveRun):
	run = steady_run
	script = run.script
	latencies: list[float] = []
	missed: list[str] = []

	segments = sorted(seg for seg, ts in script.onsets.items() if run.in_window(ts))
	for seg in segments:
		expected = script.expected_command(seg)
		if expected == script.expected_command(seg - 1):
			continue
		onset = script.onsets[seg]
		hits = [
			done
			for index, frame_ts, done, name in run.dispatches
			if name == expected and frame_ts >= onset and script.segment(index) == seg
		]
		if hits:
			latencies.append((min(hits) - onset) * 1000)
		else:
			missed.append(f'segment {seg}: {expected}')

	assert latencies, 'no gesture transitions fell inside the measurement window'
	stats = summarize(latencies)
	value = stats['p95']
	passed = value <= TARGET_E2E_P95_MS and not missed

	write_samples('QR-30', {'onset_to_command_ms': latencies})
	emit(
		'QR-30',
		'NFR1.1',
		'p95 new gesture shown -> its command dispatched (ms)',
		actual=value,
		target=f'<= {TARGET_E2E_P95_MS}, no missed gestures',
		passed=passed,
		stats=stats,
		transitions=len(latencies) + len(missed),
		missed=missed,
		method=(
			'What the operator feels: time from the first frame showing a new gesture to '
			'its command reaching the drone. Includes the deliberate 3-of-5 stabilizer vote '
			'and the 2-frame adapter hold that suppress false positives (NFR3.2).'
		),
		chart={
			'kind': 'histogram',
			'column': 'onset_to_command_ms',
			'unit': 'ms',
			'threshold': TARGET_E2E_P95_MS,
		},
	)
	assert not missed, f'gestures that never produced their command: {missed}'
	assert value <= TARGET_E2E_P95_MS, f'onset->command p95 {value} ms'


# NFR1.2 throughput and resources


def _fps_series(stamps: list[float], start: float, end: float) -> list[int]:
	"""Frames per whole second across the window (for the chart)"""
	buckets = [0] * max(1, int(end - start))
	for ts in stamps:
		idx = int(ts - start)
		if 0 <= idx < len(buckets):
			buckets[idx] += 1
	return buckets


def test_pipeline_capacity(capacity_run: LiveRun):
	run = capacity_run
	processed = _processed_in_window(run)
	fps = len(processed) / run.seconds
	source_fps = (run.captured_at_end - run.captured_at_start) / run.seconds
	passed = fps >= TARGET_FPS

	series = _fps_series([ts for _, ts in processed], run.window_start, run.window_end)
	write_samples('QR-31', {'second': list(range(len(series))), 'processed_fps': series})
	emit(
		'QR-31',
		'NFR1.2',
		'sustained processed frames/s with a 90 fps source (capacity)',
		actual=round(fps, 1),
		target=f'>= {TARGET_FPS}',
		passed=passed,
		source_fps=round(source_fps, 1),
		source_limited=fps >= 0.97 * source_fps,
		window_s=round(run.seconds, 1),
		method=(
			'The camera is paced at 90 fps, three times a webcam, so the pipeline rather '
			'than the camera is the bottleneck. Counts frames fully processed (detected, '
			'recognised, broadcast) per second over the window.'
		),
		chart={'kind': 'series', 'column': 'processed_fps', 'unit': 'fps', 'threshold': 30},
	)
	assert passed, f'pipeline sustained only {fps:.1f} fps (< {TARGET_FPS})'


def test_cpu_budget_at_native_rate(steady_run: LiveRun):
	value = round(steady_run.cpu_machine_pct, 1)
	passed = value <= TARGET_CPU_PCT
	emit(
		'QR-32',
		'NFR1.2',
		'whole-process CPU at 30 fps with 11 clients (% of machine)',
		actual=value,
		target=f'<= {TARGET_CPU_PCT}',
		passed=passed,
		single_core_equivalent_pct=round(steady_run.cpu_single_core_pct, 1),
		window_s=round(steady_run.seconds, 1),
		method=(
			'time.process_time() over the steady-state window: every thread of the backend '
			'process (camera, MediaPipe, event loop). Divided by wall time and core count.'
		),
	)
	assert passed, f'CPU {value}% of machine exceeds {TARGET_CPU_PCT}%'


def test_no_frames_dropped_at_native_rate(steady_run: LiveRun):
	run = steady_run
	captured = run.captured_at_end - run.captured_at_start
	processed = len(_processed_in_window(run))
	dropped = max(0, captured - processed)
	pct = round(100.0 * dropped / captured, 2) if captured else 100.0
	passed = captured > 0 and pct <= TARGET_DROP_PCT

	series = _fps_series(
		[ts for _, ts in _processed_in_window(run)], run.window_start, run.window_end
	)
	write_samples('QR-33', {'second': list(range(len(series))), 'processed_fps': series})
	emit(
		'QR-33',
		'NFR1.2',
		'frames dropped by the bounded queue at 30 fps (%)',
		actual=pct,
		target=f'<= {TARGET_DROP_PCT}',
		passed=passed,
		captured=captured,
		processed=processed,
		effective_fps=round(processed / run.seconds, 1),
		method=(
			'Frames the camera delivered vs frames the consumer processed in the window. '
			'The queue drops the oldest frame when the consumer falls behind (QR-18), so '
			'any shortfall here is lost frames.'
		),
		chart={'kind': 'series', 'column': 'processed_fps', 'unit': 'fps', 'threshold': 30},
	)
	assert passed, f'{pct}% of frames dropped ({dropped}/{captured})'


# NFR1.3 delivery to the dashboard (server side)


def test_every_client_keeps_frame_rate(steady_run: LiveRun):
	run = steady_run
	rates: dict[str, float] = {}
	lag_ms: list[float] = []
	for client_id, log in run.receipts.items():
		window = [(rx, ts) for rx, ts in log if run.in_window(rx)]
		rates[f'client {client_id}'] = round(len(window) / run.seconds, 1)
		lag_ms.extend((rx - ts) * 1000 for rx, ts in window)

	assert rates, 'no observer clients recorded any frames'
	worst = min(rates.values())
	passed = worst >= TARGET_CLIENT_FPS

	write_samples('QR-34', {'client': list(rates), 'fps': list(rates.values())})
	emit(
		'QR-34',
		'NFR1.3',
		f'lowest frame rate received by any of {OBSERVERS} clients, 1 stalled client present',
		actual=worst,
		target=f'>= {TARGET_CLIENT_FPS}',
		passed=passed,
		per_client_fps=rates,
		capture_to_client_ms=summarize(lag_ms),
		method=(
			'Ten subscribers read the live GestureStream while an eleventh never reads. '
			'Each client has its own 1-slot drop-oldest queue, so the stalled one must not '
			'slow the others. The browser-side render rate is QR-48.'
		),
		chart={'kind': 'bars', 'column': 'fps', 'label': 'client', 'unit': 'fps', 'threshold': 24},
	)
	assert passed, f'slowest client received {worst} fps: {rates}'
