from app.cv.calibration import CALIBRATION_SEQUENCE


class TestCalibrationStatus:
	def test_initial_state_is_not_started(self, client, calibration_manager):
		res = client.get('/api/calibration/status')
		assert res.status_code == 200
		body = res.json()
		assert body['status'] == 'not_started'
		assert body['is_calibrated'] is False
		assert body['target_gesture'] is None
		assert body['progress'] is None
		# swagger field must stay null on REST endpoint
		assert body['last_frame'] is None

	def test_status_exposes_full_sequence(self, client, calibration_manager):
		body = client.get('/api/calibration/status').json()
		assert body['sequence'] == list(CALIBRATION_SEQUENCE)
		# frontend renders one chip per entry: guard against dupes
		assert len(set(body['sequence'])) == len(body['sequence'])
		assert 'UNKNOWN' not in body['sequence']


class TestCalibrationStart:
	def test_start_moves_to_in_progress_with_first_target(self, client, calibration_manager):
		body = client.post('/api/calibration/start').json()
		assert body['status'] == 'in_progress'
		assert body['is_calibrated'] is False
		assert body['target_gesture'] == CALIBRATION_SEQUENCE[0]
		assert body['progress'] == {
			'index': 0,
			'total': len(CALIBRATION_SEQUENCE),
			'completed': [],
		}

	def test_start_is_idempotent_fresh_run(self, client, calibration_manager):
		client.post('/api/calibration/start')
		body = client.post('/api/calibration/start').json()
		assert body['status'] == 'in_progress'
		assert body['is_calibrated'] is False
		assert body['progress']['completed'] == []

	def test_skip_mid_run_discards_session(self, client, calibration_manager):
		client.post('/api/calibration/start')
		body = client.post('/api/calibration/skip').json()
		assert body['status'] == 'skipped'
		assert body['is_calibrated'] is True
		assert calibration_manager.session is None

	def test_start_after_skip_regates_flight(self, client, calibration_manager):
		"""Restarting calibrration must revoke the calibrated state"""
		client.post('/api/calibration/skip')
		body = client.post('/api/calibration/start').json()
		assert body['status'] == 'in_progress'
		assert body['is_calibrated'] is False


class TestGesturePipelineStatus:
	def test_pipeline_idle_when_no_clients(self, client, calibration_manager):
		body = client.get('/api/gestures/status').json()
		assert body['running'] is False
		assert body['connected_clients'] == 0
		assert body['last_frame'] is None
