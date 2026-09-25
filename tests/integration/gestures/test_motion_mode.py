"""
The recognizer and the input adapter have to agree on a vocab

These used to be 2 independent switches. Selecting the motion adapter while
the pipeline is on rule meant every frame arrived as OPEN_PALM, which the
motion maps dont contain, so nothing was ever emitted and nothing said why

connect/ now pulls the recognizer along, and the recognizer endpoint wanrs when
it cannot pull the adapter the other way
"""

from services.cv_pipeline.processing.pipeline import RECOGNIZER_MODES

RECOGNIZER_PATH = '/api/gestures/recognizer'
CONNECT_PATH = '/api/input/connect'
DISCONNECT_PATH = '/api/input/disconnect'


def connect(client, adapter: str) -> dict:
	return client.post(CONNECT_PATH, json={'adapter': adapter}).json()


def set_mode(client, mode: str) -> dict:
	return client.post(RECOGNIZER_PATH, json={'mode': mode}).json()


def current_mode(client) -> str:
	return client.get(RECOGNIZER_PATH).json()['mode']


class TestMotionIsAvailable:
	def test_motion_is_a_valid_recognizer_mode(self, client):
		assert 'motion' in RECOGNIZER_MODES
		assert 'motion' in client.get(RECOGNIZER_PATH).json()['available']

	def test_motion_adapter_can_be_connected(self, client):
		body = connect(client, 'motion')

		assert body['connected'] is True
		assert body['adapter'] == 'motion'

		client.post(DISCONNECT_PATH)

	def test_unknown_adapter_is_refused(self, client):
		body = connect(client, 'telekinesis')

		assert body['connected'] is False


class TestConnectPullsTheRecognizer:
	def test_connecting_motion_switches_the_pipeline_to_motion(self, client):
		set_mode(client, 'rule')

		body = connect(client, 'motion')

		assert body['recognizer'] == 'motion'
		assert current_mode(client) == 'motion'

		client.post(DISCONNECT_PATH)
		set_mode(client, 'rule')

	def test_connecting_the_pose_adapter_switches_back_off_motion(self, client):
		set_mode(client, 'motion')

		body = connect(client, 'gesture')

		assert body['recognizer'] == 'rule'
		assert current_mode(client) == 'rule'

		client.post(DISCONNECT_PATH)

	def test_an_already_compatible_mode_is_left_alone(self, client):
		applied = set_mode(client, 'ml')['mode']

		body = connect(client, 'gesture')

		assert body['recognizer'] == applied
		assert current_mode(client) == applied

		client.post(DISCONNECT_PATH)
		set_mode(client, 'rule')

	def test_reconnecting_motion_is_idempotent(self, client):
		connect(client, 'motion')
		body = connect(client, 'motion')

		assert body['recognizer'] == 'motion'
		assert current_mode(client) == 'motion'

		client.post(DISCONNECT_PATH)
		set_mode(client, 'rule')

	def test_the_message_names_the_recognizer_that_was_applied(self, client):
		set_mode(client, 'rule')

		body = connect(client, 'motion')

		assert 'motion' in body['message']

		client.post(DISCONNECT_PATH)
		set_mode(client, 'rule')


class TestAdaptersThatIgnoreTheStream:
	def test_keyboard_does_not_touch_the_recognizer(self, client):
		set_mode(client, 'motion')

		body = connect(client, 'keyboard')

		assert body['recognizer'] is None
		assert current_mode(client) == 'motion'

		client.post(DISCONNECT_PATH)
		set_mode(client, 'rule')

	def test_dummy_does_not_touch_the_recognizer(self, client):
		set_mode(client, 'motion')

		body = connect(client, 'dummy')

		assert body['recognizer'] is None
		assert current_mode(client) == 'motion'

		client.post(DISCONNECT_PATH)
		set_mode(client, 'rule')


class TestRecognizerWarnsOnMismatch:
	def test_switching_away_from_motion_warns(self, client):
		connect(client, 'motion')

		body = set_mode(client, 'rule')

		assert body['warning'] is not None
		assert 'motion' in body['warning']

		client.post(DISCONNECT_PATH)

	def test_switching_to_motion_under_the_pose_adapter_warns(self, client):
		set_mode(client, 'rule')
		connect(client, 'gesture')

		body = set_mode(client, 'motion')

		assert body['warning'] is not None

		client.post(DISCONNECT_PATH)
		set_mode(client, 'rule')

	def test_a_compatbile_switch_does_not_warn(self, client):
		set_mode(client, 'rule')
		connect(client, 'gesture')

		body = set_mode(client, 'ml')

		assert body['warning'] is None

		client.post(DISCONNECT_PATH)
		set_mode(client, 'rule')

	def test_no_adapter_connected_never_warns(self, client):
		client.post(DISCONNECT_PATH)

		body = set_mode(client, 'motion')

		assert body['warning'] is None

		set_mode(client, 'rule')

	def test_an_adapter_that_ignores_the_stream_never_warns(self, client):
		connect(client, 'keyboard')

		body = set_mode(client, 'motion')

		assert body['warning'] is None

		client.post(DISCONNECT_PATH)
		set_mode(client, 'rule')
