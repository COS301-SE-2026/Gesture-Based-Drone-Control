"""
Motion based gesture recognition using landmark trajectories overtime

Tracks based on where the hand has been going not shape of hand

How it works:
	-> Receives a detected hand per freame
	-> Keeps a short rolling buffer of palm centre positions per hand
	-> DiscreteL classifies the buffer into a swipe / push / pull / circle
	-> Continuous: reports palm offset from a neutral irigin as a MotionVector

Interface hands one frame at a tie with no timestamp, so the clock is injected
instead
"""

from __future__ import annotations

import logging
import math
import time
from collections import deque
from dataclasses import dataclass
from typing import Callable, Deque, Optional

from services.cv_pipeline.hand_detection.mediapipe_detector import DetectedHand, Handedness

from .gesture_recognizer import (
	Gesture,
	GestureRecognizer,
	GestureResult,
	MotionVector,
)
from .rule_based import RuleBasedRecognizer

logger = logging.getLogger(__name__)

# landmark consts
WRIST = 0
INDEX_MCP = 5
MIDDLE_MCP = 9
RING_MCP = 13
PINKY_MCP = 17

# avg to get a palm centre thats steadier than wrist on its own
PALM_POINTS = (WRIST, INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP)

# tuning vals
# how much trajectory history to classify over
BUFFER_SECONDS = 0.6
# hand gone for longer than this and track is thrwon away not resumed
STALE_SECONDS = 0.4
# keep reporting a detected motion for this long so consumer sees its
LATCH_SECONDS = 0.25
# after latch expires ignore all motion for this long
REFACTORY_SECONDS = 0.5

# swipe must cover this much ground in palm widths
MIN_SWIPE_DISTANCE = 0.9
# move atleast this fast, in palm widths per second
MIN_SWIPE_SPEED = 2.5
# the winning axis must beat the other one by this ratio, stops diagonal executing both
AXIS_DOMINACE = 1.8
# net displacement/path length, a swipe is a straight line, an arc isnt
# half circle =0.64
# circle in prgoress from exe a swipe before loop closes
MIN_SWIPE_STRAIGHTNESS = 0.85

# palm has to grow/shrink by theis ratio for push/pull
PUSH_SCALE_RATIO = 1.35
PULL_SCALE_RATIO = 0.74
# push/pull is a dpeth move, so reject if hand also travelled sideways
MAX_PUSH_LATERAL = 0.7

# acirlce must sweep at least this much agnle
MIN_CIRCLE_RADIANS = 1.5 * math.pi
# and end up back near where it started in palm widths
MAX_CIRCLE_DRIFT = 0.8

# continuous mode: offset below this is treated as zero, above this is full deflection
CONTINUOUS_DEADZONE = 0.35
CONTINUOUS_RANGE = 2.0

# min samples before any classification is attempted
MIN_SAMPLES = 5


@dataclass(frozen=True)
class Trackpoint:
	"""
	One sample of where a hand was at a point in time

	x, y are the palm centre in normalised frame coords
	palm is the wrist -> middle MCP span, used both as the scale referecne
	and as the depth proxy
	"""

	t: float
	x: float
	y: float
	palm: float


class _HandTrack:
	"""
	Per-hand trajectory buffer plus the latch/refactory state machine

	One of these per Handedness, nothing outside this module should touch it
	"""

	def __init__(self) -> None:
		self.points: Deque[Trackpoint] = deque()
		# nuetral position for continuous mode, armed on first sight of hand
		self.origin: Optional[Trackpoint] = None
		self.latched: Gesture = Gesture.UNKNOWN
		self.latch_until: float = 0.0
		self.refactory_until: float = 0.0
		self.last_seen: float = 0.0

	def trim(self, now: float, window: float) -> None:
		"""Drop samples that have aged out of the classification window"""
		while self.points and (now - self.points[0].t) > window:
			self.points.popleft()

	def clear_buffer(self) -> None:
		"""Toss trajecotry histroy w/o losing nuetral origin"""
		self.points.clear()


class MotionBasedRecognizer(GestureRecognizer):
	"""
	Classifies hand motion rather than hand pose

	Swap it at runtime:
	engine.set_recoginzer(MotionBasedRecognizer())

	Discrete gestures are latched: once a swipe executes, interpret_gesture keeps returning
	it fro LATCH_SECONDS, then returns UNKNOWN through the refactoy period. Needed for adapter
	as it needs a min stable frames to pass a command.

	Continuous output rides along GestureResult.motion every frame, independent of
	wahtever the discrete side is doing, so a consumer can use either or both

	Note that this recognizer is stateful per hand, unlike the other 2
	reset() is called on recognizer swap so a stale track cannot leak across
	"""

	def __init__(
		self,
		time_source: Callable[[], float] = time.monotonic,
		invert_x: bool = False,
		enable_circles: bool = True,
		buffer_seconds: float = BUFFER_SECONDS,
		latch_seconds: float = LATCH_SECONDS,
		refactory_seconds: float = REFACTORY_SECONDS,
	) -> None:
		self._now = time_source
		# flip if swipe left/right come out backwards on camera
		self._inverted_x = invert_x
		self._enable_circles = enable_circles
		self._buffer_seconds = buffer_seconds
		self._latch_seconds = latch_seconds
		self._refactory_seconds = refactory_seconds

		self._tracks: dict[Handedness, _HandTrack] = {}

		# finger state is part of the GestureResult contract and the frontend
		# renders it, so borrow the rule-based implementation like ml_based does
		self._finger_helper = RuleBasedRecognizer()

		logger.info(
			'MotionBasedRecognizer ready, buffer=%.2fs latch=%.2fs refactory=%.2fs circle=%s',
			self._buffer_seconds,
			self._latch_seconds,
			self._refactory_seconds,
			self._enable_circles,
		)

	def interpret_gesture(self, hand: DetectedHand) -> GestureResult:
		"""
		Take a DetectedHand, folds it into that hands trajectory and returns the current
		motion gesutre plus a continuous motion vector
		"""
		now = self._now()
		track = self._get_track(hand.handedness, now)

		point = self._sample(hand, now)
		track.last_seen = now

		if track.origin is None:
			track.origin = point

		track.points.append(point)
		track.trim(now, self._buffer_seconds)

		gesture = self._resolve(track, now)
		motion = self._continuous(track, point)
		finger_state = self._finger_helper.interpret_gesture(hand).finger_state

		return GestureResult(
			gesture=gesture,
			finger_state=finger_state,
			handedness=hand.handedness,
			confidence=hand.confidence,
			motion=motion,
		)

	def reset(self) -> None:
		"""Drop every track, called on recognizer swap and on pipeline restart"""
		self._tracks.clear()

	# track management
	def _get_track(self, handedness: Handedness, now: float) -> _HandTrack:
		"""
		Fetch this hands track, starting a fresh one if the hand has been out of frame
		long enouhg

		Engine never tells a recoginzer that a hnd left, it just stops calling us for it, so
		staleness has to be inferred from the clock
		"""

		track = self._tracks.get(handedness)

		if track is None:
			track = _HandTrack()
			self._tracks[handedness] = track
			return track

		if (now - track.last_seen) > STALE_SECONDS:
			logger.debug('motion track for %s went stale, re-arming', handedness.name)
			track = _HandTrack()
			self._tracks[handedness] = track

		return track

	def _sample(self, hand: DetectedHand, now: float) -> Trackpoint:
		"""Reduce 21 landmarks to the one point and one scale we want"""
		lm = hand.landmarks

		cx = sum(lm[i].x for i in PALM_POINTS) / len(PALM_POINTS)
		cy = sum(lm[i].y for i in PALM_POINTS) / len(PALM_POINTS)

		palm = math.hypot(
			lm[MIDDLE_MCP].x - lm[WRIST].x,
			lm[MIDDLE_MCP].y - lm[WRIST].y,
		)

		# a degernerate palm would divide everything by about 0
		if palm < 1e-4:
			palm = 1e-4

		return Trackpoint(t=now, x=cx, y=cy, palm=palm)

	def _resolve(self, track: _HandTrack, now: float) -> Gesture:
		"""
		Runs the latch / refactory / detect state machine and returns watever this
		frame should report
		"""

		if now < track.latch_until:
			return track.latched

		if now < track.refactory_until:
			track.clear_buffer()
			track.latched = Gesture.UNKNOWN
			return Gesture.UNKNOWN

		track.latched = Gesture.UNKNOWN

		detected = self._classify(track)
		if detected is Gesture.UNKNOWN:
			return Gesture.UNKNOWN

		track.latched = detected
		track.latch_until = now + self._latch_seconds
		track.refactory_until = track.latch_until + self._refactory_seconds
		track.clear_buffer()
		track.origin = None

		logger.debug('motion gesture %s detected', detected.name)
		return detected

	def _classify(self, track: _HandTrack) -> Gesture:
		"""
		Turn the curr trajectory buffer into a gesture, or UNNKNOWN

		Order matters: circles checked first then swipes then depth
		"""
		points = list(track.points)
		if len(points) < MIN_SAMPLES:
			return Gesture.UNKNOWN

		first = points[0]
		last = points[-1]
		elapsed = last.t - first.t
		if elapsed <= 0:
			return Gesture.UNKNOWN

		scale = sum(p.palm for p in points) / len(points)

		dx = (last.x - first.x) / scale
		dy = (last.y - first.y) / scale
		if self._inverted_x:
			dx = -dx
		if self._enable_circles:
			circle = self._classify_circle(points, scale, dx, dy)
			if circle is not Gesture.UNKNOWN:
				return circle

		straightness = self._straightness(points, scale, dx, dy)
		swipe = self._classify_swipe(dx, dy, elapsed, straightness)
		if swipe is not Gesture.UNKNOWN:
			return swipe

		return self._classify_depth(first, last, dx, dy)

	def _straightness(
		self,
		points: list[Trackpoint],
		scale: float,
		dx: float,
		dy: float,
	) -> float:
		"""
		How direct the path was, 1.0 means perfect line
		"""
		path = 0.0
		for previous, current in zip(points, points[1:]):
			path += math.hypot(current.x - previous.x, current.y - previous.y)
		path /= scale

		if path < 1e-6:
			return 0.0

		return math.hypot(dx, dy) / path

	def _classify_swipe(
		self,
		dx: float,
		dy: float,
		elapsed: float,
		straightness: float,
	) -> Gesture:
		"""
		Lateral or vertical travel, in palm widths
		"""
		if straightness < MIN_SWIPE_STRAIGHTNESS:
			return Gesture.UNKNOWN

		adx = abs(dx)
		ady = abs(dy)

		if adx >= ady * AXIS_DOMINACE and adx >= MIN_SWIPE_DISTANCE:
			if (adx / elapsed) >= MIN_SWIPE_SPEED:
				return Gesture.SWIPE_RIGHT if dx > 0 else Gesture.SWIPE_LEFT

		if ady >= adx * AXIS_DOMINACE and ady >= MIN_SWIPE_DISTANCE:
			if (ady / elapsed) >= MIN_SWIPE_SPEED:
				return Gesture.SWIPE_DOWN if dy > 0 else Gesture.SWIPE_UP

		return Gesture.UNKNOWN

	def _classify_depth(
		self,
		first: Trackpoint,
		last: Trackpoint,
		dx: float,
		dy: float,
	) -> Gesture:
		"""
		Push and pull, read off apparent palm size rather than landmark z

		Rejected if the hand also travelled sideways, since a swipe across the
		frame changes apparent size too as the hand arcs
		"""
		if math.hypot(dx, dy) > MAX_PUSH_LATERAL:
			return Gesture.UNKNOWN

		ratio = last.palm / first.palm

		if ratio >= PUSH_SCALE_RATIO:
			return Gesture.PUSH
		if ratio <= PULL_SCALE_RATIO:
			return Gesture.PULL

		return Gesture.UNKNOWN

	def _classify_circle(
		self,
		points: list[Trackpoint],
		scale: float,
		dx: float,
		dy: float,
	) -> Gesture:
		"""
		Accumulated signed sweep around trajectory centroid
		"""
		if math.hypot(dx, dy) > MAX_CIRCLE_DRIFT:
			return Gesture.UNKNOWN

		cx = sum(p.x for p in points) / len(points)
		cy = sum(p.y for p in points) / len(points)

		radius = sum(math.hypot(p.x - cx, p.y - cy) for p in points) / len(points)
		if (radius / scale) < 0.25:
			return Gesture.UNKNOWN

		total = 0.0
		previous = math.atan2(points[0].y - cy, points[0].x - cx)

		for p in points[1:]:
			current = math.atan2(p.y - cy, p.x - cx)
			delta = current - previous

			if delta > math.pi:
				delta -= 2 * math.pi
			elif delta < -math.pi:
				delta += 2 * math.pi
			total += delta
			previous = current

		if abs(total) < MIN_CIRCLE_RADIANS:
			return Gesture.UNKNOWN

		clockwise = total > 0
		if self._inverted_x:
			clockwise = not clockwise

		return Gesture.CIRCLE_CW if clockwise else Gesture.CIRCLE_CCW

	# continous side
	def _continuous(self, track: _HandTrack, point: Trackpoint) -> MotionVector:
		"""
		Palm offset from the neutral origin, deadzoned and clamped to [-1, 1]

		Behaves like a virtual joystick
		"""
		origin = track.origin
		if origin is None:
			return MotionVector()

		scale = max(origin.palm, 1e-4)

		x = (point.x - origin.x) / scale
		y = (point.y - origin.y) / scale
		if self._inverted_x:
			x = -x

		depth = math.log(point.palm / scale) / math.log(PUSH_SCALE_RATIO)

		return MotionVector(
			x=self._deflection(x),
			y=self._deflection(y),
			depth=self._deflection(depth),
		)

	def _deflection(self, value: float) -> float:
		"""Deadzone, then linear ramp to full scale, then clamp"""
		magnitude = abs(value)
		if magnitude <= CONTINUOUS_DEADZONE:
			return 0.0

		span = CONTINUOUS_RANGE - CONTINUOUS_DEADZONE
		ramped = (magnitude - CONTINUOUS_DEADZONE) / span
		ramped = min(1.0, ramped)

		return ramped if value > 0 else -ramped


if __name__ == '__main__':
	import cv2

	from services.cv_pipeline.camera.camera_feed import CameraConfig, CameraFeed
	from services.cv_pipeline.gestures.gesture_engine import GestureEngine
	from services.cv_pipeline.gestures.stabilizer import GestureStabilizer
	from services.cv_pipeline.hand_detection.mediapipe_detector import HandDetectionPipeline

	logging.basicConfig(level=logging.INFO)

	DISPLAY_SECONDS = 1.2

	with CameraFeed(CameraConfig()) as camera, HandDetectionPipeline() as detector:
		engine = GestureEngine(
			recognizer=MotionBasedRecognizer(),
			stabilizer=GestureStabilizer(window=1, min_agreement=1),
		)

		last_gesture = 'none'
		last_at = 0.0

		while True:
			frame = camera.capture_image()
			if frame is None:
				break

			detection = detector.detect_hands(frame)
			engine_result = engine.process(detection)
			annotated = detector.draw_landmarks(frame, detection)

			now = time.monotonic()
			for gr in engine_result.hand_gestures:
				if gr.gesture is not Gesture.UNKNOWN:
					last_gesture = f'{gr.handedness.name}: {gr.gesture.name}'
					last_at = now

			if (now - last_at) > DISPLAY_SECONDS:
				last_gesture = 'none'

			cv2.putText(
				annotated,
				f'motion: {last_gesture}',
				(10, 30),
				cv2.FONT_HERSHEY_SIMPLEX,
				0.8,
				(0, 255, 0),
				2,
			)

			y = 60
			for gr in engine_result.hand_gestures:
				mv = gr.motion or MotionVector()
				text = f'{gr.handedness.name} x={mv.x:+.2f} depth={mv.depth:+.2f}'
				cv2.putText(
					annotated,
					text,
					(10, y),
					cv2.FONT_HERSHEY_SIMPLEX,
					0.6,
					(0, 255, 255),
					2,
				)
				y += 26

			cv2.imshow('motion recognizer smoke test', annotated)
			if cv2.waitKey(1) & 0xFF == ord('q'):
				break

	cv2.destroyAllWindows()
