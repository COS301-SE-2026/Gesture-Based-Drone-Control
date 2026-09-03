"""
QR-18 / NFR1.2 -> sustaining throughput: the frame queue stays bounded under load
and drops the oldest frame rather than blocking or growing without limit
QR-19 / NFR3.2 -> false-positive suppresion: the stabilizer rejects a single noise
frame but still switches once a new gesture holds long enough
"""

from __future__ import annotations

from services.cv_pipeline.gestures.recognizers.gesture_recognizer import (
	FingerState,
	Gesture,
	GestureResult,
)
from services.cv_pipeline.gestures.stabilizer import GestureStabilizer
from services.cv_pipeline.hand_detection.mediapipe_detector import Handedness
from services.cv_pipeline.processing.async_queue import BoundedFrameQueue
from tests.nfr._helpers import emit

QUEUE_SIZE = 2
PUSHES = 100


def _result(gesture: Gesture) -> GestureResult:
	return GestureResult(
		gesture=gesture,
		finger_state=FingerState(),
		handedness=Handedness.RIGHT,
		confidence=0.95,
	)


def _stable(stabilizer: GestureStabilizer, gesture: Gesture) -> Gesture:
	return stabilizer.stabilize([_result(gesture)])[0].gesture


def test_queue_stays_bounded_and_drops_oldest():
	queue = BoundedFrameQueue[int](maxsize=QUEUE_SIZE)

	max_seen = 0
	for i in range(PUSHES):
		queue.try_put_nowait(i)
		max_seen = max(max_seen, queue.qsize())

	expected_drops = PUSHES - QUEUE_SIZE
	bounded = max_seen <= QUEUE_SIZE
	dropped_right = queue.drop_count == expected_drops

	passed = bounded and dropped_right

	emit(
		'QR-18',
		'NFR1.2',
		'max queue depth under sustained load',
		actual=max_seen,
		target=f'<= {QUEUE_SIZE}',
		passed=passed,
		pushes=PUSHES,
		drop_count=queue.drop_count,
		expected_drops=expected_drops,
	)

	assert bounded, f'queue grew to {max_seen}, exceeds bound {QUEUE_SIZE}'
	assert dropped_right, f'drop_count {queue.drop_count} != expected {expected_drops}'


def test_stabilizer_rejects_single_frame_noise():
	stab = GestureStabilizer(window=5, min_agreement=3)

	for _ in range(4):
		_stable(stab, Gesture.FIST)

	after_noise = _stable(stab, Gesture.OPEN_PALM)
	noise_rejected = after_noise == Gesture.FIST

	switched = None
	for _ in range(5):
		switched = _stable(stab, Gesture.OPEN_PALM)
	switch_works = switched == Gesture.OPEN_PALM

	passed = noise_rejected and switch_works

	emit(
		'QR-19',
		'NFR3.2',
		'single-frame noise suppressed by stabilizer',
		actual='rejected' if noise_rejected else 'leaked',
		target='rejected',
		passed=passed,
		switches_on_sustained_hold=switch_works,
		window=5,
		min_agreement=3,
	)

	assert noise_rejected, 'a single noise frame changed the stabilized gesture'
	assert switch_works, 'stabilizer never switched on a sustained new gesture'
