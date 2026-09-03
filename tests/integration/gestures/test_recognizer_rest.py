from services.cv_pipeline.processing.pipeline import RECOGNIZER_MODES

RECOGNIZER_PATH = '/api/gestures/recognizer'


class TestRecognizerModeRest:
	def test_defaults_to_rule(self, client):
		res = client.get(RECOGNIZER_PATH)

		assert res.status_code == 200
		body = res.json()
		assert body['mode'] == 'rule'
		assert set(body['available']) == set(RECOGNIZER_MODES)

	def test_switch_to_ml_is_accepted_or_cleanly_refused(self, client):
		"""
		ml only sticks when gesture_mlp.joblib is actually on disk, so a checkout without
		the trained model must fall back rather than error
		"""
		body = client.post(RECOGNIZER_PATH, json={'mode': 'ml'}).json()

		assert body['requested'] == 'ml'
		assert body['mode'] in RECOGNIZER_MODES

		client.post(RECOGNIZER_PATH, json={'mode': 'rule'})

	def test_switch_back_to_rule_awlays_works(self, client):
		client.post(RECOGNIZER_PATH, json={'mode': 'ml'})
		body = client.post(RECOGNIZER_PATH, json={'mode': 'rule'}).json()

		assert body['mode'] == 'rule'
		assert client.get(RECOGNIZER_PATH).json()['mode'] == 'rule'

	def test_unknown_mode_is_a_400(self, client):
		res = client.post(RECOGNIZER_PATH, json={'mode': 'neural'})

		assert res.status_code == 400
		assert 'neural' in res.json()['detail']

	def test_missing_mode_field_is_a_422(self, client):
		assert client.post(RECOGNIZER_PATH, json={}).status_code == 422
