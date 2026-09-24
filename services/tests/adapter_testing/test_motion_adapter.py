import time
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from services.commands.command import CommandType
from services.input.sources.gesture_adapter import GestureAdapter
from services.input.sources.input_adapter import InputAdapter
from services.input.sources.motion_adapter import MotionAdapter


def motion(x=0.0, y=0.0, depth=0.0):
	"""Stand in for serialization.MotionOUt, the shape the dapter reads"""
	return SimpleNamespace(x=x, y=y, depth=depth)


def hand(side, gesture, confidence=0.95, hand_motion=None):
	return SimpleNamespace(
		handedness=side, gesture=gesture, confidence=confidence, motion=hand_motion
	)


def frame(*hands):
	return SimpleNamespace(hands=list(hands))


def make_adapter(event_log=None):
	adapter = MotionAdapter(min_stable_frames=2, event_log=event_log or MagicMock())
	adapter.set_handler(MagicMock())
	return adapter


def emitted(adapter):
	return [call[0][0].type for call in adapter._handler.call_args_list]


def analog(adapter):
	return [
		call[0][0].payload['input']
		for call in adapter._handler.call_args_list
		if call[0][0].type is CommandType.ANALOG
	]


def run(adapter, payload, frames=4):
	"""
	Feed the same frame repeatedly
	"""
	for _ in range(frames):
		adapter._process_payload(payload)


@pytest.fixture()
def adapter():
	return make_adapter()


@pytest.mark.parametrize(
	('gesture', 'expected'),
	[
		('SWIPE_LEFT', CommandType.MOVE_LEFT),
		('SWIPE_RIGHT', CommandType.MOVE_RIGHT),
		('SWIPE_UP', CommandType.MOVE_UP),
		('SWIPE_DOWN', CommandType.MOVE_DOWN),
		('PUSH', CommandType.MOVE_FORWARD),
		('PULL', CommandType.MOVE_BACKWARD),
		('CIRCLE_CW', CommandType.ROTATE_CW),
		('CIRCLE_CCW', CommandType.ROTATE_CCW),
	],
)
def test_single_hands_motions_resolve(adapter, gesture, expected):
	assert adapter._resolve({'RIGHT': gesture}) is expected
	assert adapter._resolve({'LEFT': gesture}) is expected


@pytest.mark.parametrize(
	('gesture', 'expected'),
	[
		('SWIPE_UP', CommandType.TAKEOFF),
		('SWIPE_DOWN', CommandType.LAND),
		('PULL', CommandType.EMERGENCY_STOP),
	],
)
def test_both_hands_together_resolve(adapter, gesture, expected):
	assert adapter._resolve({'RIGHT': gesture, 'LEFT': gesture}) is expected


def test_the_two_adapters_do_not_understand_each_other(adapter):
	"""
	MotionAdapter swaps the maps wholesale rather than adding to them
	"""
	pose = GestureAdapter(min_stable_frames=2)

	assert adapter._resolve({'RIGHT': 'OPEN_PALM'}) is None
	assert adapter._resolve({'RIGHT': 'FIST', 'LEFT': 'FIST'}) is None
	assert pose._resolve({'RIGHT': 'SWIPE_LEFT'}) is None
	assert pose._resolve({'RIGHT': 'OPEN_PALM'}) is CommandType.HOVER
	assert pose._resolve({'RIGHT': 'FIST', 'LEFT': 'FIST'}) is CommandType.LAND


def test_idle_hand_does_not_mask_the_other_hand(adapter):
	run(adapter, frame(hand('RIGHT', 'UNKNOWN'), hand('LEFT', 'SWIPE_RIGHT')))

	assert CommandType.MOVE_RIGHT in emitted(adapter)


@pytest.mark.parametrize(
	'payload',
	[
		frame(hand('RIGHT', 'UNKNOWN'), hand('LEFT', 'UNKNOWN')),
		frame(hand('RIGHT', 'SWIPE_LEFT', confidence=0.2)),
		frame(hand('RIGHT', 'UNKNOWN', hand_motion=motion())),
	],
)
def test_nothing_is_emitted_for(adapter, payload):
	run(adapter, payload)

	assert emitted(adapter) == []


def test_axes_follow_the_drone_adapter_contract(adapter):
	adapter._process_payload(
		frame(hand('RIGHT', 'UNKNOWN', hand_motion=motion(x=0.6, y=-0.3, depth=0.5)))
	)
	one_hand = analog(adapter)[0]

	assert one_hand.left_x == pytest.approx(0.6)
	assert one_hand.left_y == pytest.approx(-0.5)
	assert one_hand.right_y == pytest.approx(-0.3)
	assert one_hand.right_x == 0.0

	two_handed = make_adapter()
	two_handed._process_payload(
		frame(
			hand('RIGHT', 'UNKNOWN', hand_motion=motion(x=0.4)),
			hand('LEFT', 'UNKNOWN', hand_motion=motion(x=-0.8)),
		)
	)

	assert analog(two_handed)[0].right_x == pytest.approx(-0.8)


def test_left_hand_alone_still_flies(adapter):
	adapter._process_payload(frame(hand('LEFT', 'UNKNOWN', hand_motion=motion(x=0.6))))

	assert analog(adapter)[0].left_x == pytest.approx(0.6)


def test_pose_frames_never_produce_analog(adapter):
	run(adapter, frame(hand('RIGHT', 'SWIPE_LEFT', hand_motion=None)))

	assert CommandType.ANALOG not in emitted(adapter)


def test_analog_and_discrete_coexist_on_one_frame(adapter):
	run(adapter, frame(hand('RIGHT', 'SWIPE_LEFT', hand_motion=motion(x=-0.7))))

	assert CommandType.ANALOG in emitted(adapter)
	assert CommandType.MOVE_LEFT in emitted(adapter)


def test_analog_holds_off_the_idle_hover(adapter):
	adapter._last_gesture_ts = time.monotonic() - 60.0

	adapter._process_payload(frame(hand('RIGHT', 'UNKNOWN', hand_motion=motion(x=0.6))))
	adapter._check_idle()

	assert CommandType.HOVER not in emitted(adapter)


def test_idle_timeout_is_longer_than_the_pose_default():
	"""
	Motion gestures are momentary, so a user thinking between gestures trips
	the pose adapter's 3s hover constantly and fills the command history
	"""
	assert make_adapter()._idle_timeout > GestureAdapter(event_log=MagicMock())._idle_timeout


def test_recognizer_coupling_is_declared():
	assert MotionAdapter.COMPATIBLE_RECOGNIZERS == ('motion',)
	assert MotionAdapter.REQUIRED_RECOGNIZER == 'motion'
	assert set(GestureAdapter.COMPATIBLE_RECOGNIZERS) == {'rule', 'ml'}
	assert GestureAdapter.REQUIRED_RECOGNIZER == 'rule'
	assert InputAdapter.COMPATIBLE_RECOGNIZERS == ()
	assert InputAdapter.REQUIRED_RECOGNIZER is None


def test_held_gesture_logs_one_event_and_updates_status():
	log = MagicMock()
	adapter = make_adapter(event_log=log)

	run(adapter, frame(hand('RIGHT', 'CIRCLE_CW')), frames=10)

	assert log.record.call_count == 1
	assert log.record.call_args.kwargs['command'] == 'ROTATE_CW'
	assert adapter.last_resolution == 'ROTATE_CW'
	assert adapter.last_confidence == pytest.approx(0.95)
