import time

from _gesture_helpers import MAX_FRAMES_SHORT, SCRIPTED, requires_camera
from app.cv.serialization import GestureFramePayload

WS_PATH = '/api/gestures/stream'


def _wait_for_pipeline_stopped(client, timeout: float = 10.0) -> dict:
	"""
	Pipeline teardown after the last unsubscribe is async, so pull the
	status endpoint briefly
	"""
	deadline = time.monotonic() + timeout
	body = {}
	while time.monotonic() < deadline:
		body = client.get('/api/gestures/status').json()
		if body['running'] is False and body['connected_clients'] == 0:
			return body
		time.sleep(0.2)
	return body


@requires_camera
class TestGestureStream:
	def test_stream_delivers_valid_frames(self, client, calibration_manager):
		with client.websocket_connect(WS_PATH) as ws:
			prev_index = -1
			saw_hand = False
			saw_fps = False

			for _ in range(MAX_FRAMES_SHORT):
				raw = ws.receive_json()
				frame = GestureFramePayload.model_validate(raw)

				assert frame.type == 'gesture_frame'
				assert frame.frame_index > prev_index
				prev_index = frame.frame_index

				if frame.fps > 0:
					saw_fps = True
				for hand in frame.hands:
					saw_hand = True
					assert len(hand.landmarks) == 21
					assert hand.handedness in ('LEFT', 'RIGHT')
					assert 0.0 <= hand.confidence <= 1.0
					assert hand.speed >= 0.0
					assert 0 <= hand.fingers <= 5

				if saw_fps and frame.frame_index > 45 and (saw_hand or not SCRIPTED):
					break

			assert saw_fps, 'fps never rose above 0, Fpsmeter not fed?'
			if SCRIPTED:
				assert saw_hand, 'scripted camera active but no hands detected'

	def test_pipeline_lifecycle_start_and_stop(self, client, calibration_manager):
		"""
		Camera opens lazily with the first client and releases after the last one leaves,
		the core promise of GestureStream
		"""
		before = client.get('/api/gestures/status').json()
		assert before['running'] is False
		assert before['connected_clients'] == 0

		with client.websocket_connect(WS_PATH) as ws:
			ws.receive_json()
			during = client.get('/api/gestures/status').json()
			assert during['running'] is True
			assert during['connected_clients'] == 1

		after = _wait_for_pipeline_stopped(client)
		assert after['running'] is False, 'pipeline still running after last client left'

		assert after['connected_clients'] == 0

	def test_two_clients_share_one_pipeline(self, client, calibration_manager):
		with client.websocket_connect(WS_PATH) as ws1:
			ws1.receive_json()
			with client.websocket_connect(WS_PATH) as ws2:
				status = client.get('/api/gestures/status').json()
				assert status['connected_clients'] == 2
				assert status['running'] is True

				# both receive independent copies of broadcast
				f1 = ws1.receive_json()
				f2 = ws2.receive_json()
				assert f1['type'] == f2['type'] == 'gesture_frame'

			ws1.receive_json()
			status = client.get('/api/gestures/status').json()
			assert status['connected_clients'] == 1
			assert status['running'] is True

		_wait_for_pipeline_stopped(client)
