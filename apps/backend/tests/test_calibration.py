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
from app.cv import calibration as cv_calibration
from app.cv.calibration import (
	CALIBRATION_SEQUENCE,
	CalibrationManager,
	CalibrationPhase,
	CalibrationSession,
	CalibrationStatus,
)
from app.cv.serialization import GestureFramePayload, HandOut, LandmarkOut
from fastapi import Depends, FastAPI, WebSocketDisconnect
from fastapi.testclient import TestClient

FPS = 30.0
DT = 1.0 / FPS

WS_URL = '/api/calibration/stream'


def make_hand(gesture: str) -> HandOut:
	return HandOut(
		handedness='RIGHT',
		gesture=gesture,
		fingers=0,
		confidence=0.95,
		speed=0.01,
		landmarks=[LandmarkOut(x=0.5, y=0.5, z=0.0) for _ in range(21)],
	)


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
		hands.append(make_hand(gesture))
	return GestureFramePayload(
		frame_index=frame_index,
		timestamp=timestamp,
		fps=FPS,
		hands=hands,
	)


def make_multi_hand_frame(
	frame_index: int,
	timestamp: float,
	gestures: tuple[str, ...],
) -> GestureFramePayload:
	return GestureFramePayload(
		frame_index=frame_index,
		timestamp=timestamp,
		fps=FPS,
		hands=[make_hand(g) for g in gestures],
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


class _ScriptedQueue:
	def __init__(self, frames, then) -> None:
		self._frames = list(frames)
		self._then = then

	async def get(self):
		if self._frames:
			return self._frames.pop(0)
		raise self._then


class _ScriptedStream:
	def __init__(self, frames=(), then=None, subscribe_error=None) -> None:
		self.frames = list(frames)
		self.then = then if then is not None else WebSocketDisconnect(code=1000)
		self.subscribe_error = subscribe_error
		self.subscribed = 0
		self.unsubscribed: list = []

	async def subscribe(self):
		self.subscribed += 1
		if self.subscribe_error is not None:
			raise self.subscribe_error
		return _ScriptedQueue(self.frames, self.then)

	async def unsubscribe(self, queue) -> None:
		self.unsubscribed.append(queue)


# REST endpoints + flight gating


@pytest.fixture()
def calibration_app():
	"""
	Fresh app with the calibration router and a dummy gate flight route.
	The module-lvel manager is reset around each test so tests
	cannot leak state into each other.

	Yields the router module too, so socket tests can swap out its
	'stream' import.
	"""
	from app.api import calibration as calibration_module
	from app.dependencies import require_calibrated

	app = FastAPI()
	app.include_router(calibration_module.router, prefix='/api')

	@app.post('/api/drone/takeoff-test', dependencies=[Depends(require_calibrated)])
	async def takeoff_test() -> dict:
		return {'ok': True}

	calibration_module.manager.reset()
	yield calibration_module, app
	calibration_module.manager.reset()


@pytest.fixture()
def client(calibration_app):
	_, app = calibration_app
	return TestClient(app)


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


# WebSocket stream


class TestCalibrationWebSocket:
	def test_connecting_starts_a_run_and_subscribes(self, calibration_app, monkeypatch):
		module, app = calibration_app
		stream = _ScriptedStream(frames=[make_frame(1, DT, CALIBRATION_SEQUENCE[0])])
		monkeypatch.setattr(module, 'stream', stream)

		with TestClient(app).websocket_connect(WS_URL) as ws:
			ws.receive_json()
			assert module.manager.status is CalibrationStatus.IN_PROGRESS

		assert stream.subscribed == 1

	def test_pushes_one_payload_per_frame(self, calibration_app, monkeypatch):
		module, app = calibration_app
		target = CALIBRATION_SEQUENCE[0]
		frames = [make_frame(i, i * DT, target) for i in range(1, 4)]
		monkeypatch.setattr(module, 'stream', _ScriptedStream(frames=frames))

		with TestClient(app).websocket_connect(WS_URL) as ws:
			messages = [ws.receive_json() for _ in range(3)]

		assert [m['frame_index'] for m in messages] == [1, 2, 3]
		for message in messages:
			assert message['type'] == 'calibration_frame'
			assert message['phase'] == 'awaiting_gesture'
			assert message['target_gesture'] == target
			assert message['progress']['total'] == len(CALIBRATION_SEQUENCE)

	def test_payload_carries_the_overlay_contract(self, calibration_app, monkeypatch):
		"""Frontend needs landmarks + the matched flag to colour the skeleton."""
		module, app = calibration_app
		target = CALIBRATION_SEQUENCE[0]
		frames = [
			make_frame(1, DT, 'UNKNOWN'),
			make_frame(2, 2 * DT, target),
			make_frame(3, 3 * DT, None),
		]
		monkeypatch.setattr(module, 'stream', _ScriptedStream(frames=frames))

		with TestClient(app).websocket_connect(WS_URL) as ws:
			wrong, right, empty = (ws.receive_json() for _ in range(3))

			assert wrong['matched'] is False
			assert wrong['detected_gesture'] == 'UNKNOWN'
			assert len(wrong['hands'][0]['landmarks']) == 21

			assert right['matched'] is True
			assert right['detected_gesture'] == target
			assert right['window']['required_ratio'] == pytest.approx(0.8)

			assert empty['matched'] is False
			assert empty['detected_gesture'] is None
			assert empty['hands'] == []

	def test_client_disconnect_unsubscribes(self, calibration_app, monkeypatch):
		module, app = calibration_app
		stream = _ScriptedStream(frames=[make_frame(1, DT, CALIBRATION_SEQUENCE[0])])
		monkeypatch.setattr(module, 'stream', stream)

		with TestClient(app).websocket_connect(WS_URL) as ws:
			ws.receive_json()

		# queue ran dry -> WebSocketDisconnect -> finally releases the slot
		assert len(stream.unsubscribed) == 1

	def test_completed_run_closes_the_stream(self, calibration_app, monkeypatch):
		"""
		Drive a real session to DONE over the socket.

		The default sequence would need ~650 frames, so the session is
		swapped for a two-gesture, three-frame variant. Each frame shows
		both gestures at once, so it matches whichever target is current.
		"""
		module, app = calibration_app

		def quick_session(*_args, **_kwargs):
			return CalibrationSession(
				sequence=('OPEN_PALM', 'FIST'),
				min_frames=3,
				success_display_seconds=0.1,
			)

		monkeypatch.setattr(cv_calibration, 'CalibrationSession', quick_session)

		frames = [make_multi_hand_frame(i, i * DT, ('OPEN_PALM', 'FIST')) for i in range(1, 21)]
		stream = _ScriptedStream(frames=frames)
		monkeypatch.setattr(module, 'stream', stream)

		phases = []
		with TestClient(app).websocket_connect(WS_URL) as ws:
			for _ in range(len(frames)):
				message = ws.receive_json()
				phases.append(message['phase'])
				if message['phase'] == 'done':
					break

		assert phases[-1] == 'done'
		assert 'success_display' in phases
		assert module.manager.status is CalibrationStatus.COMPLETED
		assert module.manager.is_calibrated is True
		# server stopped reading before the frame list was exhausted
		assert len(stream.unsubscribed) == 1

	def test_unexpected_error_is_swallowed_and_unsubscribed(self, calibration_app, monkeypatch):
		"""A pipeline blow-up must not leak a subscriber slot."""
		module, app = calibration_app
		stream = _ScriptedStream(
			frames=[make_frame(1, DT, CALIBRATION_SEQUENCE[0])],
			then=RuntimeError('pipeline exploded'),
		)
		monkeypatch.setattr(module, 'stream', stream)

		with TestClient(app).websocket_connect(WS_URL) as ws:
			ws.receive_json()

		assert len(stream.unsubscribed) == 1

	def test_subscribe_failure_skips_unsubscribe(self, calibration_app, monkeypatch):
		"""queue is still None, so finally must not call unsubscribe(None)."""
		module, app = calibration_app
		stream = _ScriptedStream(subscribe_error=RuntimeError('no camera'))
		monkeypatch.setattr(module, 'stream', stream)

		with TestClient(app).websocket_connect(WS_URL):
			pass

		assert stream.subscribed == 1
		assert stream.unsubscribed == []

	def test_reconnecting_restarts_the_run(self, calibration_app, monkeypatch):
		"""A second client restarts the shared run rather than resuming it."""
		module, app = calibration_app
		target = CALIBRATION_SEQUENCE[0]
		monkeypatch.setattr(
			module,
			'stream',
			_ScriptedStream(frames=[make_frame(i, i * DT, target) for i in range(1, 3)]),
		)
		test_client = TestClient(app)

		with test_client.websocket_connect(WS_URL) as ws:
			ws.receive_json()
			ws.receive_json()

		monkeypatch.setattr(
			module,
			'stream',
			_ScriptedStream(frames=[make_frame(1, DT, target)]),
		)
		with test_client.websocket_connect(WS_URL) as ws:
			message = ws.receive_json()

		assert message['window']['frames'] == 1
		assert message['progress']['completed'] == []

	def test_connecting_regates_flight(self, calibration_app, monkeypatch):
		module, app = calibration_app
		monkeypatch.setattr(
			module,
			'stream',
			_ScriptedStream(frames=[make_frame(1, DT, CALIBRATION_SEQUENCE[0])]),
		)
		test_client = TestClient(app)

		test_client.post('/api/calibration/skip')
		assert test_client.post('/api/drone/takeoff-test').status_code == 200

		with test_client.websocket_connect(WS_URL) as ws:
			ws.receive_json()

		assert test_client.post('/api/drone/takeoff-test').status_code == 409
