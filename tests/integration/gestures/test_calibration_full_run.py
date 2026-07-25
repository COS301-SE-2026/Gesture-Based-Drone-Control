import pytest
from _gesture_helpers import MAX_FRAMES_FULL_RUN, requires_scripted_camera
from app.cv.calibration import (
	CALIBRATION_SEQUENCE,
	CalibrationFramePayload,
	CalibrationStatus,
)
from starlette.websockets import WebSocketDisconnect

WS_PATH = '/api/calibration/stream'


def _recv_validated(ws) -> CalibrationFramePayload:
	raw = ws.receive_json()
	assert raw['type'] == 'calibration_frame'
	return CalibrationFramePayload.model_validate(raw)


@requires_scripted_camera
class TestFullCalibrationRun:
	def test_full_run_passes_every_gesture_and_closes(self, client, calibration_manager):
		frames: list[CalibrationFramePayload] = []
		completed_history: list[list[str]] = []

		with client.websocket_connect(WS_PATH) as ws:
			for _ in range(MAX_FRAMES_FULL_RUN):
				payload = _recv_validated(ws)
				frames.append(payload)
				completed_history.append(payload.progress.completed)
				if payload.phase.value == 'done':
					break
			else:
				pytest.fail(
					f'calibration never reached done within {MAX_FRAMES_FULL_RUN} frames; '
					f'last progress={frames[-1].progress if frames else None}'
				)

			with pytest.raises(WebSocketDisconnect):
				ws.receive_json()

		final = frames[-1]

		assert final.progress.completed == list(CALIBRATION_SEQUENCE)
		assert final.progress.total == len(CALIBRATION_SEQUENCE)
		assert final.target_gesture is None

		for prev, curr in zip(completed_history, completed_history[1:]):
			assert curr[: len(prev)] == prev, 'completed list shrank or reordered'
			assert curr == list(CALIBRATION_SEQUENCE)[: len(curr)], (
				'completed is not a prefix of the calibration sequence'
			)

		targets = {f.target_gesture for f in frames if f.target_gesture is not None}
		assert targets <= set(CALIBRATION_SEQUENCE)

		assert any(f.phase.value == 'success_display' for f in frames), (
			'success_display phase never observed'
		)

		assert calibration_manager.status is CalibrationStatus.COMPLETED
		assert calibration_manager.is_calibrated is True

		status = client.get('/api/calibration/status').json()
		assert status['status'] == 'completed'
		assert status['is_calibrated'] is True
