"""
3 layers:
-> CalibrationSession: rolling-window pass logic, success display timing,
sequence advancement
-> CalibrationManager: status transitions, skip, restart semantics
-> REST endpoints + flgiht gating: start/skip/status routes and the
require_calibrated depedency

All timins is done through synthetic frame timestamps,
so no sleeping and no flakiness
"""

from __future__ import annotations

import pytest
from app.cv.calibration import (
	CALIBRATION_SEQUENCE,
	CalibrationManager,
	CalibrationPhase,
	CalibrationSession,
	CalibrationStatus,
)
from app.cv.serialization import GestureFramePayload, HandOut, LandmarkOut
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

FPS = 30.0
DT = 1.0 / FPS


def make_frame(
	frame_index: int,
	timestamp: float,
	gesture: str | None = None,
) -> GestureFramePayload:
	"""
	Build a synthetic frame showing one hand (or none) doing a 'gesture'
	"""
	hands: list[HandOut] = []
	if gesture is not None:
		hands.append(
			HandOut(
				handedness='RIGHT',
				gesture=gesture,
				fingers=0,
				confidence=0.95,
				speed=0.01,
				landmarks=[LandmarkOut(x=0.5, y=0.5, z=0.0) for _ in range(21)],
			)
		)
	return GestureFramePayload(
		frame_index=frame_index,
		timestamp=timestamp,
		fps=FPS,
		hands=hands,
	)


class FrameFeeder:
	"""
	Feeds frames at a steady 30 Fps and tracks time
	"""

	def __init__(self, target) -> None:
		self.target = target
		self.index = 0
		self.time = 0.0
		self.last_payload = None

	def feed(self, gesture: str | None, n: int = 1):
		for _ in range(n):
			self.index += 1
			self.time += DT
			frame = make_frame(self.index, self.time, gesture)
			self.last_payload = self.target.process_frame(frame)
		return self.last_payload


# CalibrationSession


class TestCalibrationSession:
	def test_starts_awaiting_first_gesture(self):
		session = CalibrationSession()
		assert session.phase is CalibrationPhase.AWAITING_GESTURE
		assert session.target_gesture == CALIBRATION_SEQUENCE[0]
		assert session.completed_gestures == []

	def test_passes_after_min_frames_of_correct_gesture(self):
		session = CalibrationSession()
		feeder = FrameFeeder(session)
		target = session.target_gesture

		# 44 perfect frames: ratio 1.0 but min_frames not yet reached
		feeder.feed(target, n=44)
		assert session.phase is CalibrationPhase.AWAITING_GESTURE

		# 45th frame corsses min_frame -> pass
		payload = feeder.feed(target)
		assert session.phase is CalibrationPhase.SUCCESS_DISPLAY
		assert payload.phase is CalibrationPhase.SUCCESS_DISPLAY
		assert session.completed_gestures == [target]

	def test_does_not_pass_below_ratio(self):
		session = CalibrationSession()
		feeder = FrameFeeder(session)
		target = session.target_gesture

		# alternate correct/wrong -> 50% ratio, never reaches 80%
		for _ in range(120):
			feeder.feed(target)
			feeder.feed('UNKNOWN')
		assert session.phase is CalibrationPhase.AWAITING_GESTURE
		assert session.completed_gestures == []

	def test_no_hand_counts_as_unmatched(self):
		session = CalibrationSession()
		feeder = FrameFeeder(session)
		target = session.target_gesture

		# hand visiible oonly half the time -> 50% ratio, no pass
		for _ in range(120):
			feeder.feed(target)
			feeder.feed(None)
		assert session.phase is CalibrationPhase.AWAITING_GESTURE

	def test_occasional_misclassified_frames_still_pass(self):
		"""
		The whole point of the rolling window: noise tolerance
		"""
		session = CalibrationSession()
		feeder = FrameFeeder(session)
		target = session.target_gesture

		# 9 correct : 1 wrong = 90% ratio, comfortably above 0.8
		for _ in range(10):
			feeder.feed(target, n=9)
			feeder.feed('UNKNOWN')
		assert session.phase is CalibrationPhase.SUCCESS_DISPLAY

	def test_old_frames_age_out_of_window(self):
		session = CalibrationSession()
		feeder = FrameFeeder(session)
		target = session.target_gesture

		# a bad start (all wrong for 3s) then perfect frames: the bad
		# frames age out and the gesture passes without a reset
		feeder.feed('UNKNOWN', n=90)
		feeder.feed(target, n=120)
		assert session.phase is CalibrationPhase.SUCCESS_DISPLAY

	def test_success_display_lasts_two_seconds_then_advances(self):
		session = CalibrationSession()
		feeder = FrameFeeder(session)
		first = session.target_gesture

		feeder.feed(first, n=45)
		assert session.phase is CalibrationPhase.SUCCESS_DISPLAY

		# just under 2 seconds of further frames: still displaying
		feeder.feed(first, n=int(2.0 * FPS) - 2)
		assert session.phase is CalibrationPhase.SUCCESS_DISPLAY
		assert session.target_gesture == first

		# cross the 2 second mark -> next gesture
		feeder.feed(first, n=3)
		assert session.phase is CalibrationPhase.AWAITING_GESTURE
		assert session.target_gesture == CALIBRATION_SEQUENCE[1]

	def test_window_resets_between_gestures(self):
		session = CalibrationSession()
		feeder = FrameFeeder(session)
		first = session.target_gesture

		feeder.feed(first, n=45)
		# frames during success display must not count toward gesture 2
		payload = feeder.feed(first, n=5)
		assert payload.window.frames == 0

	def test_full_sequence_completes(self):
		session = CalibrationSession()
		feeder = FrameFeeder(session)

		for expected in CALIBRATION_SEQUENCE:
			assert session.target_gesture == expected
			feeder.feed(expected, n=45)  # pass gesture
			feeder.feed(None, n=int(2.0 * FPS) + 2)  # sit out success display

		assert session.phase is CalibrationPhase.DONE
		assert session.target_gesture is None
		assert session.completed_gestures == list(CALIBRATION_SEQUENCE)

	def test_payload_shape_for_overlay(self):
		"""
		Frontend contract: landmarks + matched flag for the skeleton
		"""

		session = CalibrationSession()
		feeder = FrameFeeder(session)
		target = session.target_gesture

		wrong = feeder.feed('UNKNOWN')
		assert wrong.matched is False
		assert wrong.target_gesture == target
		assert wrong.detected_gesture == 'UNKNOWN'
		assert len(wrong.hands[0].landmarks) == 21

		right = feeder.feed(target)
		assert right.matched is True
		assert right.detected_gesture == target
		assert right.window.required_ratio == pytest.approx(0.8)


# CalibrationManager
class TestCalibrationManager:
	def test_initial_state_not_calibrated(self):
		manager = CalibrationManager()
		assert manager.status is CalibrationStatus.NOT_STARTED
		assert manager.is_calibrated is False

	def test_process_frame_without_session_raises(self):
		manager = CalibrationManager()
		with pytest.raises(RuntimeError):
			manager.process_frame(make_frame(1, 0.1))

	def test_skip_marks_calibrated(self):
		manager = CalibrationManager()
		manager.skip()
		assert manager.status is CalibrationStatus.SKIPPED
		assert manager.is_calibrated is True

	def test_completing_sequence_marks_calibrated(self):
		manager = CalibrationManager()
		manager.start()
		feeder = FrameFeeder(manager)

		for gesture in CALIBRATION_SEQUENCE:
			feeder.feed(gesture, n=45)
			if gesture != CALIBRATION_SEQUENCE[-1]:
				feeder.feed(None, n=int(2.0 * FPS) + 2)

		# last gesture: session enters SUCCESS_DISPLAY: play out the
		# display window until the session reports DONE
		# manager refuses further frames once completed so stop feeding
		for _ in range(int(2.0 * FPS) + 2):
			feeder.feed(None)
			if manager.status is CalibrationStatus.COMPLETED:
				break
		assert manager.status is CalibrationStatus.COMPLETED
		assert manager.is_calibrated is True

	def test_restart_regates_flight(self):
		manager = CalibrationManager()
		manager.skip()
		assert manager.is_calibrated is True

		manager.start()
		assert manager.status is CalibrationStatus.IN_PROGRESS
		assert manager.is_calibrated is False


# REST endpoints + flight gating


@pytest.fixture()
def client():
	"""
	Fresh app with the calibration router and a dummy gate flight route.
	The module-lvel manager is reset around each test so tests
	cannot leak state into each other.
	"""
	from app.api import calibration as calibration_module
	from app.dependencies import require_calibrated

	app = FastAPI()
	app.include_router(calibration_module.router)

	@app.post('/api/drone/takeoff-test', dependencies=[Depends(require_calibrated)])
	async def takeoff_test() -> dict:
		return {'ok': True}

	calibration_module.manager.reset()
	yield TestClient(app)
	calibration_module.manager.reset()


class TestCalibrationEndpoints:
	def test_status_initially_not_started(self, client):
		body = client.get('/api/calibration/status').json()
		assert body['status'] == 'not_started'
		assert body['is_calibrated'] is False
		assert body['sequence'] == list(CALIBRATION_SEQUENCE)
		assert body['last_frame'] is None

	def test_start_reports_first_target(self, client):
		body = client.post('/api/calibration/start').json()
		assert body['status'] == 'in_progress'
		assert body['target_gesture'] == CALIBRATION_SEQUENCE[0]
		assert body['progress'] == {
			'index': 0,
			'total': len(CALIBRATION_SEQUENCE),
			'completed': [],
		}

	def test_skip_calibration_immediately(self, client):
		body = client.post('/api/calibration/skip').json()
		assert body['status'] == 'skipped'
		assert body['is_calibrated'] is True

	def test_flight_blocked_until_calibrated(self, client):
		response = client.post('/api/drone/takeoff-test')
		assert response.status_code == 409
		assert 'calibration' in response.json()['detail'].lower()

	def test_flight_allowed_after_skip(self, client):
		client.post('/api/calibration/skip')
		response = client.post('/api/drone/takeoff-test')
		assert response.status_code == 200
		assert response.json() == {'ok': True}

	def test_restart_regates_flight_route(self, client):
		client.post('/api/calibration/skip')
		assert client.post('/api/drone/takeoff-test').status_code == 200

		client.post('/api/calibration/start')
		assert client.post('/api/drone/takeoff-test').status_code == 409
