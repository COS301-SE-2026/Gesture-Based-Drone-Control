"""
Latency budget, stage by stage, NFR1.1 bounds the whole frame -> disptach path at
200ms p95, each stage here gets its own slice of that budget so a regression points
at the stage that casued it

QR-03 / NFR1.1 -> single-frame recognition latency, rule based engine
QR-25/NFR1.1 -> single frame recognitiion latency, ML engine
QR-27 / NFR1.1 -> PipellineEvent -> GestureFramePayload
QR28/NFR1,1 -> payload -> command resovled -> DroneAdapter.execute() done
"""

from __future__ import annotations

import asyncio
import time

import pytest

from services.cv_pipeline.gestures.recognizers.ml_based import MLBasedRecognizer
from services.cv_pipeline.gestures.recognizers.rule_based import RuleBasedRecognizer
from tests.nfr._helpers import emit, hand, load_dataset, p95, summarize, write_samples

TARGET_P95_MS = 50.0
TARGET_SERIALIZE_P95_MS = 20.0
TARGET_DISPATCH_P95_MS = 30.0


def _time_recognizer(recognizer) -> list[float]:
	features, _ = load_dataset()
	hands = [hand(f) for f in features]

	for h in hands[:50]:
		recognizer.interpret_gesture(h)

	samples_ms = []
	for h in hands:
		start = time.perf_counter()
		recognizer.interpret_gesture(h)
		samples_ms.append((time.perf_counter() - start) * 1000)
	return samples_ms


def test_recognition_latency_p95():
	samples_ms = _time_recognizer(RuleBasedRecognizer())

	value = round(p95(samples_ms), 4)
	passed = value < TARGET_P95_MS

	write_samples('QR-03', {'recognition_ms': samples_ms})
	emit(
		'QR-03',
		'NFR1.1',
		'p95 single-frame recognition latency (ms)',
		actual=value,
		target=f'< {TARGET_P95_MS}',
		passed=passed,
		frames=len(samples_ms),
		mean_ms=round(sum(samples_ms) / len(samples_ms), 4),
		stats=summarize(samples_ms, 4),
		method=(
			'RuleBaedRecognizer.intepret_gesture timed on every sample of the labelled dataset'
		),
		chart={'kind': 'histogram', 'column': 'recognition_ms', 'unit': 'ms'},
	)

	assert passed, f'p95 latency {value} ms exceeds {TARGET_P95_MS} ms'


def test_ml_recognition_latency_p95():
	try:
		recognizer = MLBasedRecognizer()
	except FileNotFoundError:
		pytest.skip('trained ML model (gesture_mlp.joblib) not available')

	samples_ms = _time_recognizer(recognizer)
	stats = summarize(samples_ms, 4)
	passed = stats['p95'] < TARGET_P95_MS

	write_samples('QR-25', {'recognition_ms': samples_ms})
	emit(
		'QR-25',
		'NFR1.1',
		'p95 single-frame recognition latency, ML engine (ms)',
		actual=stats['p95'],
		target=f'< {TARGET_P95_MS}',
		passed=passed,
		stats=stats,
		method=(
			'MLBasedRecognizer.interpret_gesture (feature extraction + MLP predict_proba + '
			'finger-state helper) timed on every sample of the labelled dataset.'
		),
		chart={'kind': 'histogram', 'column': 'recognition_ms', 'unit': 'ms'},
	)
	assert passed, f'ML p95 {stats["p95"]} ms exceeds {TARGET_P95_MS} ms'


def test_frame_serialization_latency():
	from app.cv.serialization import serialize_event

	from services.cv_pipeline.gestures.gesture_engine import GestureEngine
	from services.cv_pipeline.hand_detection.mediapipe_detector import HandDetectionResult
	from services.cv_pipeline.processing.pipeline import HandMetrics, PipelineEvent
	from tests.nfr._perf import LandmarkScript, PacedVideoCamera, clip_config

	camera = PacedVideoCamera(clip_config(fps=1000))
	camera.open()
	script = LandmarkScript()
	engine = GestureEngine()
	samples_ms: list[float] = []
	sizes: list[int] = []
	try:
		for _ in range(600):
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
			start = time.perf_counter()
			payload = serialize_event(event, include_frame=True)
			samples_ms.append((time.perf_counter() - start) * 1000)
			sizes.append(len(payload.frame_jpeg or ''))
	finally:
		camera.close()

	stats = summarize(samples_ms[20:])
	passed = stats['p95'] <= TARGET_SERIALIZE_P95_MS

	write_samples('QR-27', {'serialize_ms': samples_ms[20:]})
	emit(
		'QR-27',
		'NFR1.1',
		'p95 frame serialization for broadcast (JPEG + landmarks) (ms)',
		actual=stats['p95'],
		target=f'<= {TARGET_SERIALIZE_P95_MS}',
		passed=passed,
		stats=stats,
		mean_payload_kb=round(sum(sizes) / len(sizes) / 1024, 1),
		method=(
			'serialize_event(include_frame=True) on real 640x480 frames with 1-2 hands: '
			'JPEG q60 encode, base64 and the pydantic model the WebSocket sends.'
		),
		chart={'kind': 'histogram', 'column': 'serialize_ms', 'unit': 'ms'},
	)
	assert passed, f'serialization p95 {stats["p95"]} ms exceeds {TARGET_SERIALIZE_P95_MS} ms'


def test_command_resolution_and_dispatch_latency():
	from app.cv.serialization import GestureFramePayload, HandOut, LandmarkOut

	from services.drone_control.adapters.dummy_drone_adapter import DummyDroneAdapter
	from services.input.gesture_events import GestureEventLog
	from services.input.sources.gesture_adapter import GestureAdapter
	from tests.nfr._perf import SCRIPT

	lm = [LandmarkOut(x=0.5, y=0.5, z=0.0)] * 21

	def payload(i: int, right: str, left: str | None) -> GestureFramePayload:
		hands = [
			HandOut(
				handedness='RIGHT',
				gesture=right,
				fingers=1,
				confidence=0.95,
				speed=0.0,
				landmarks=lm,
			)
		]
		if left:
			hands.append(
				HandOut(
					handedness='LEFT',
					gesture=left,
					fingers=1,
					confidence=0.95,
					speed=0.0,
					landmarks=lm,
				)
			)
		return GestureFramePayload(frame_index=i, timestamp=time.monotonic(), fps=30.0, hands=hands)

	async def scenario() -> list[float]:
		drone = DummyDroneAdapter()
		await drone.connect()
		adapter = GestureAdapter(event_log=GestureEventLog())
		pending: list = []
		adapter.set_handler(pending.append)

		samples: list[float] = []
		for i in range(3000):
			(right, left), _ = SCRIPT[(i // 30) % len(SCRIPT)]
			frame = payload(i, right, left)
			start = time.perf_counter()
			adapter._process_payload(frame)
			for command in pending:
				await drone.execute(command)
			if pending:
				samples.append((time.perf_counter() - start) * 1000)
			pending.clear()
		return samples

	samples = asyncio.run(scenario())
	stats = summarize(samples, 4)
	passed = stats['p95'] <= TARGET_DISPATCH_P95_MS

	write_samples('QR-28', {'dispatch_ms': samples})
	emit(
		'QR-28',
		'NFR1.1',
		'p95 gesture payload -> command resolved and executed (ms)',
		actual=stats['p95'],
		target=f'<= {TARGET_DISPATCH_P95_MS}',
		passed=passed,
		stats=stats,
		method=(
			'GestureAdapter confidence gate, two-hand/one-hand resolution, stability hold '
			'and history log, then DroneAdapter.execute() on the dummy drone.'
		),
		chart={'kind': 'histogram', 'column': 'dispatch_ms', 'unit': 'ms'},
	)
	assert passed, f'dispatch p95 {stats["p95"]} ms exceeds {TARGET_DISPATCH_P95_MS} ms'
