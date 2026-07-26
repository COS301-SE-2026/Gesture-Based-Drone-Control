import pytest
from _gesture_helpers import MAX_FRAMES_SHORT, SCRIPTED, requires_camera
from app.cv.calibration import (
	CALIBRATION_SEQUENCE,
	CalibrationFramePayload,
	CalibrationStatus,
)
from starlette.websockets import WebSocketDisconnect

WS_PATH = '/api/calibration/stream'


def _recv_validated(ws) -> CalibrationFramePayload:
	"""
	Receive one WS message and validate it against the real payload model,
	so any shcmea drift between backend and the documented contract fails loudly
	"""
	raw = ws.receive_json()
	assert raw['type'] == 'calibration_frame'
	return CalibrationFramePayload.model_validate(raw)


@requires_camera
class TestFramePayloadContract:
	def test_connect_start_run_and_streams_valid_frames(self, client, calibration_manager):
		"""
		Connecting must start a fresh run and push frames that satisfy every invariant the
		frontend renders from: monotonic frame_index/timestamp,
		coherent window maths, first target from the sequence, 21 landmarks per detected hand
		"""
		with client.websocket_connect(WS_PATH) as ws:
			assert calibration_manager.status is CalibrationStatus.IN_PROGRESS

			prev_index = -1
			prev_ts = float('-inf')
			saw_hand = False

			for _ in range(MAX_FRAMES_SHORT):
				f = _recv_validated(ws)

				assert f.frame_index > prev_index
				assert f.timestamp >= prev_ts
				prev_index, prev_ts = f.frame_index, f.timestamp

				w = f.window
				assert 0 <= w.matches <= w.frames
				if w.frames:
					assert w.ratio == pytest.approx(w.matches / w.frames, abs=1e-3)
				else:
					assert w.ratio == 0.0

				if f.target_gesture is not None:
					assert f.target_gesture in CALIBRATION_SEQUENCE

				for hand in f.hands:
					saw_hand = True
					assert len(hand.landmarks) == 21
					for lm in hand.landmarks:
						assert -0.5 <= lm.x <= 1.5
						assert -0.5 <= lm.y <= 1.5
					assert hand.gesture in (*CALIBRATION_SEQUENCE, 'UNKNOWN')

				if f.window.frames > 30:
					break

			assert prev_index >= 0, 'no frames received at all'
			if SCRIPTED:
				assert saw_hand, 'scripted camera active but no hands detected'

	def test_status_endpoint_tracks_live_run(self, client, calibration_manager):
		with client.websocket_connect(WS_PATH) as ws:
			_recv_validated(ws)
			body = client.get('/api/calibration/status').json()
			assert body['status'] == 'in_progress'
			assert body['is_calibrated'] is False
			assert body['target_gesture'] in CALIBRATION_SEQUENCE
			assert body['progress']['total'] == len(CALIBRATION_SEQUENCE)


@requires_camera
class TestSkipDuringRun:
	def test_rest_skip_terminates_active_stream(self, client, calibration_manager):
		"""
		Skipping via REST while the WS run is live must end the stream cleanyl and leave
		the app calibrated, this is the exact flow the skip button uses
		"""
		with client.websocket_connect(WS_PATH) as ws:
			for _ in range(5):
				_recv_validated(ws)

			res = client.post('/api/calibration/skip')
			assert res.json()['status'] == 'skipped'

			with pytest.raises(WebSocketDisconnect):
				for _ in range(MAX_FRAMES_SHORT):
					ws.receive_json()

		assert calibration_manager.status is CalibrationStatus.SKIPPED
		assert calibration_manager.is_calibrated is True


@requires_camera
class TestReconnectSemantics:
	def test_new_connection_restarts_the_run(self, client, calibration_manager):
		"""
		Connecting always starts a fresh run
		"""
		with client.websocket_connect(WS_PATH) as ws:
			last = None
			for _ in range(MAX_FRAMES_SHORT):
				last = _recv_validated(ws)
				if last.window.frames > 10:
					break
			assert last is not None and last.window.frames > 10

		assert calibration_manager.status is CalibrationStatus.IN_PROGRESS

		with client.websocket_connect(WS_PATH) as ws:
			first = _recv_validated(ws)
			assert first.progress.completed == []
			assert first.progress.index == 0
			assert first.target_gesture == CALIBRATION_SEQUENCE[0]
			assert first.window.frames <= 1


@requires_camera
class TestSharedPipeline:
	def test_calibration_and_gesture_streams_share_one_camera(self, client, calibration_manager):
		"""
		The calibration WS subscribes to the same GestureStream as the plain gesture feed: both must
		receive frames concurrently from one pipeline, and the status endpoint ust count both
		clients
		"""
		with client.websocket_connect(WS_PATH) as cal_ws:
			_recv_validated(cal_ws)

			with client.websocket_connect('/api/gestures/stream') as gest_ws:
				gest_frame = gest_ws.receive_json()
				assert gest_frame['type'] == 'gesture_frame'

				status = client.get('/api/gestures/status').json()
				assert status['running'] is True
				assert status['connected_clients'] == 2

				cal_frame = _recv_validated(cal_ws)
				gest_frame2 = gest_ws.receive_json()
				assert gest_frame2['frame_index'] > gest_frame['frame_index']
				assert cal_frame.frame_index > 0
