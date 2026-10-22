import math
import os
import sys
from unittest.mock import MagicMock

import pytest

sys.modules['mediapipe'] = MagicMock()
_services_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, _services_dir)

from cv_pipeline.gestures.recognizers.gesture_recognizer import Gesture  # noqa: E402
from cv_pipeline.gestures.recognizers.motion_based import (  # noqa: E402
	CLUTCH_RELEASE_FRAMES,
	LATCH_SECONDS,
	REFACTORY_SECONDS,
	STALE_SECONDS,
	MotionBasedRecognizer,
)
from cv_pipeline.hand_detection.mediapipe_detector import (  # noqa:E402
	DetectedHand,
	Handedness,
	HandLandmark,
)

FRAME_DT = 1.0 / 30.0
PALM = 0.12
SWIPES = {Gesture.SWIPE_LEFT, Gesture.SWIPE_RIGHT, Gesture.SWIPE_UP, Gesture.SWIPE_DOWN}


class FakeClock:
	"""Injected time_source so no test ever sleeps"""

	def __init__(self) -> None:
		self.now = 0.0

	def __call__(self) -> float:
		return self.now

	def tick(self, seconds: float = FRAME_DT) -> None:
		self.now += seconds


FINGER_CHAINS = {
	# mcp: (pip, tip)
	5: (6, 8),
	9: (10, 12),
	13: (14, 16),
	17: (18, 20),
}


def make_hand(
	cx=0.5,
	cy=0.5,
	palm=PALM,
	handedness=Handedness.RIGHT,
	confidence=0.95,
	fingers_up=5,
):
	"""
	Synthetic hand centred on (cx, cy) with a given palm span

	The palm landmarks and the wrist -> middle MCP span drive the trajectory,
	Push/Pull reads from palm

	Fingers are built too, because the recognizer clutches (stops tracking)
	whenever fewer than CLUTCH_MIN_FINGERS are up. fingers_up=5 is an open
	palm, fingers_up=0 a fist. Fingers are raised thumb first, then index,
	middle, ring, pinky; curled fingers fold back towards the wrist
	"""
	lm = [HandLandmark(cx, cy, 0.0) for _ in range(21)]
	lm[0] = HandLandmark(cx, cy + palm / 2, 0.0)
	lm[9] = HandLandmark(cx, cy - palm / 2, 0.0)
	lm[5] = HandLandmark(cx - 0.02, cy - palm / 2, 0.0)
	lm[13] = HandLandmark(cx + 0.02, cy - palm / 2, 0.0)
	lm[17] = HandLandmark(cx + 0.03, cy - palm / 4, 0.0)

	# thumb: extended = tip further from index MCP than the IP joint
	thumb_up = fingers_up >= 1
	lm[2] = HandLandmark(cx - 0.04, cy, 0.0)
	lm[3] = HandLandmark(cx - 0.06, cy - 0.01, 0.0)
	lm[4] = (
		HandLandmark(cx - 0.09, cy - 0.02, 0.0)
		if thumb_up
		else HandLandmark(cx - 0.02, cy - palm / 2 + 0.005, 0.0)
	)

	# index, middle, ring, pinky: straight = mcp -> pip -> tip in a line
	for n, (mcp, (pip, tip)) in enumerate(FINGER_CHAINS.items(), start=2):
		base = lm[mcp]
		lm[pip] = HandLandmark(base.x, base.y - 0.03, 0.0)
		if fingers_up >= n:
			lm[tip] = HandLandmark(base.x, base.y - 0.06, 0.0)
		else:
			lm[tip] = HandLandmark(base.x, base.y + 0.01, 0.0)

	return DetectedHand(handedness=handedness, landmarks=lm, confidence=confidence)


def feed(rec, clock, points, palm=PALM, handedness=Handedness.RIGHT, dt=FRAME_DT):
	results = []
	for cx, cy in points:
		clock.tick(dt)
		results.append(rec.interpret_gesture(make_hand(cx, cy, palm, handedness)))
	return results


def gestures(results):
	return [r.gesture for r in results]


def line(x, y, dx, dy, frames=11, settle=6):
	"""
	Straight stroke followed by `settle` frames held at the end point

	The recognizer only accepts a swipe once the hand comes to rest
	(SWIPE_SETTLE_SECONDS), which is what separates it from the opening
	quarter of a circle, so a realistic swipe has to stop
	"""
	path = [(x + dx * i, y + dy * i) for i in range(frames)]
	return path + [path[-1]] * settle


def circle(frames=16, radius=0.06, clockwise=True):
	pts = []
	for i in range(frames):
		a = 2 * math.pi * i / (frames - 1)
		pts.append(
			(
				0.5 + radius * math.cos(-a if not clockwise else a),
				0.5 + radius * math.sin(-a if not clockwise else a),
			)
		)
	return pts


@pytest.fixture
def clock():
	return FakeClock()


@pytest.fixture
def rec(clock):
	return MotionBasedRecognizer(time_source=clock)


@pytest.mark.parametrize(
	('path', 'expected'),
	[
		(line(0.30, 0.5, 0.045, 0.0), Gesture.SWIPE_RIGHT),
		(line(0.75, 0.5, -0.045, 0.0), Gesture.SWIPE_LEFT),
		(line(0.5, 0.25, 0.0, 0.045), Gesture.SWIPE_DOWN),
		(line(0.5, 0.75, 0.0, -0.045), Gesture.SWIPE_UP),
	],
)
def test_swipes(rec, clock, path, expected):
	assert expected in gestures(feed(rec, clock, path))


@pytest.mark.parametrize(
	('path', 'dt'),
	[
		(line(0.30, 0.5, 0.045, 0.0), 0.2),
		(line(0.50, 0.5, 0.002, 0.0), FRAME_DT),
		([(0.5, 0.5)] * 20, FRAME_DT),
	],
)
def test_non_gesture_stay_silent(rec, clock, path, dt):
	assert set(gestures(feed(rec, clock, path, dt=dt))) == {Gesture.UNKNOWN}


def test_gesture_is_latched_across_frames(rec, clock):
	"""
	A raw snipe classifies for a frame or 2, gesture adapter needs min stable frames
	agreeing frames befoire it emits
	"""
	held = [
		g
		for g in gestures(feed(rec, clock, line(0.30, 0.5, 0.045, 0.0)))
		if g is Gesture.SWIPE_RIGHT
	]

	assert len(held) >= 2


def test_return_stroke_does_not_fire_the_opposite_swipe(rec, clock):
	"""
	The main thing the state machine exists for, swipe left bring hand back to rest
	"""
	feed(rec, clock, line(0.75, 0.5, -0.045, 0.0))
	back = feed(rec, clock, line(0.30, 0.5, 0.045, 0.0))

	assert Gesture.SWIPE_RIGHT not in gestures(back)


def test_a_new_gesture_fires_once_the_refactory_expires(rec, clock):
	feed(rec, clock, line(0.75, 0.5, -0.045, 0.0))
	clock.tick(LATCH_SECONDS + REFACTORY_SECONDS + 0.1)

	assert Gesture.SWIPE_LEFT in gestures(feed(rec, clock, line(0.75, 0.5, -0.045, 0.0)))


@pytest.mark.parametrize(
	('start', 'step', 'expected'),
	[(0.10, 0.006, Gesture.PUSH), (0.17, -0.007, Gesture.PULL)],
)
def test_depth_from_apparent_palm_size(rec, clock, start, step, expected):
	results = []
	for i in range(11):
		clock.tick()
		results.append(rec.interpret_gesture(make_hand(0.5, 0.5, start + step * i)))

	assert expected in gestures(results)


@pytest.mark.parametrize(
	('clockwise', 'expected'),
	[(True, Gesture.CIRCLE_CW), (False, Gesture.CIRCLE_CCW)],
)
def test_circles(rec, clock, clockwise, expected):
	assert expected in gestures(feed(rec, clock, circle(clockwise=clockwise)))


def test_circle_does_not_fire_a_swipe_partway_round(rec, clock):
	"""
	Hald a circle covers as much ground as fast as a swipe, so without the
	straigtness gate it fires SWIPE_* long before the loop closes
	"""
	assert not SWIPES.intersection(gestures(feed(rec, clock, circle())))


def test_circles_can_be_disabled(clock):
	rec = MotionBasedRecognizer(time_source=clock, enable_circles=False)

	assert Gesture.CIRCLE_CW not in gestures(feed(rec, clock, circle()))


@pytest.mark.parametrize(
	('path', 'axis', 'check'),
	[
		([(0.5, 0.5)] * 5, 'x', lambda v: v == 0.0),
		([(0.5, 0.5), (0.62, 0.5), (0.68, 0.5)], 'x', lambda v: v > 0.0),
		([(0.5, 0.5), (0.5, 0.62), (0.5, 0.68)], 'y', lambda v: v > 0.0),
		([(0.5, 0.5), (0.95, 0.5), (0.99, 0.5)], 'x', lambda v: v <= 1.0),
		([(0.5, 0.5), (0.51, 0.5)], 'x', lambda v: v == 0.0),
	],
)
def test_continuous_deflections(rec, clock, path, axis, check):
	results = feed(rec, clock, path)

	assert results[-1].motion is not None
	assert check(getattr(results[-1].motion, axis))


def test_growing_palm_gives_positive_depth(rec, clock):
	clock.tick()
	rec.interpret_gesture(make_hand(0.5, 0.5, 0.10))
	clock.tick()

	assert rec.interpret_gesture(make_hand(0.5, 0.5, 0.16)).motion.depth > 0.0


def test_hands_are_tracked_independently(rec, clock):
	"""a moving right hand must not contaiminate a still left hand"""
	left = []
	for cx, _ in line(0.30, 0.5, 0.045, 0.0):
		clock.tick()
		rec.interpret_gesture(make_hand(cx, 0.5, handedness=Handedness.RIGHT))
		left.append(rec.interpret_gesture(make_hand(0.5, 0.5, handedness=Handedness.LEFT)))

	assert set(gestures(left)) == {Gesture.UNKNOWN}


def test_stale_track_is_rearmed_when_a_hand_returns(rec, clock):
	clock.tick()
	rec.interpret_gesture(make_hand(0.20, 0.5))
	clock.tick(STALE_SECONDS + 0.2)
	result = rec.interpret_gesture(make_hand(0.85, 0.5))

	assert result.gesture is Gesture.UNKNOWN
	assert result.motion.is_neutral


def test_reset_drops_every_track(rec, clock):
	feed(rec, clock, line(0.30, 0.5, 0.045, 0.0))
	rec.reset()
	clock.tick()

	assert rec.interpret_gesture(make_hand(0.85, 0.5)).gesture is Gesture.UNKNOWN


def test_result_contract(rec, clock):
	clock.tick()
	result = rec.interpret_gesture(make_hand(handedness=Handedness.LEFT, confidence=0.77))

	assert 0 <= result.finger_state.count <= 5
	assert result.handedness is Handedness.LEFT
	assert result.confidence == pytest.approx(0.77)


def test_invert_x_flips_lateral_swipes(clock):
	rec = MotionBasedRecognizer(time_source=clock, invert_x=True)

	assert Gesture.SWIPE_LEFT in gestures(feed(rec, clock, line(0.30, 0.5, 0.045, 0.0)))


def hold(rec, clock, fingers_up, seconds, handedness=Handedness.RIGHT):
	"""Hold a still pose for `seconds` and return every result"""
	results = []
	for _ in range(int(seconds / FRAME_DT)):
		clock.tick()
		results.append(
			rec.interpret_gesture(make_hand(fingers_up=fingers_up, handedness=handedness))
		)
	return results


def test_closed_hand_clutches_and_blocks_swipes(rec, clock):
	"""A fist moving across the frame is repositioning, not flying"""
	results = []
	for cx, cy in line(0.30, 0.5, 0.045, 0.0):
		clock.tick()
		results.append(rec.interpret_gesture(make_hand(cx, cy, fingers_up=0)))

	assert not SWIPES.intersection(gestures(results))
	# the first few closed frames are debounce, after that the joystick is dead
	assert all(r.motion.is_neutral for r in results[CLUTCH_RELEASE_FRAMES:])


@pytest.mark.parametrize(
	('fingers_up', 'expected', 'needed'),
	[
		(0, Gesture.FIST, 1.5),
		(1, Gesture.ONE_FINGER, 0.6),
		(2, Gesture.TWO_FINGERS, 1.5),
	],
)
def test_safety_pose_fires_only_after_being_held(rec, clock, fingers_up, expected, needed):
	early = hold(rec, clock, fingers_up, needed * 0.5)
	assert expected not in gestures(early)

	late = hold(rec, clock, fingers_up, needed)
	assert expected in gestures(late)


def test_opening_the_hand_cancels_a_pose_hold(rec, clock):
	hold(rec, clock, 0, 1.0)
	hold(rec, clock, 5, 0.2)

	assert Gesture.FIST not in gestures(hold(rec, clock, 0, 1.0))
