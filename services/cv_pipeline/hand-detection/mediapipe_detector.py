# /services/cv-pipeline/hand-detection/mediapipe_detector.py

"""
Hand detection using MediaPipe and opencv
-> Takes captured frame from camera_feed.py
-> Returns hand detection result with landmarks, max 2 hands
-> Gesture interpretation done in recoginsers
"""

import logging
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional

import mediapipe as mp
import numpy as np

# camera_feed.py imports -> 1st in chain then this file
from camera_feed import CapturedFrame

logger = logging.getLogger(__name__)

# mp.solutions.hands and mp.solutions.drawing_utils are accessed lazily
# inside open() and draw_landmarks() to avoid AttributeError on import
# in mediapipe 0.10+ — do not access mp.solutions at module level

# consts
# points on one hand = 21
NUM_LANDMARKS = 21
MAX_HANDS = 2


# Enums
class Handedness(Enum):
	LEFT = auto()
	RIGHT = auto()


# Data classes


@dataclass
class HandLandmark:
	"""
	A single landmark point from mp
	x, y normalised to [0.0, 1.0] relative to frame dimesions
	z represents depth relative to wrist
	- val = closer to cam
	+ val = further from cam
	"""

	x: float
	y: float
	z: float


@dataclass
class DetectedHand:
	"""
	One hand detected -> must xontain all 21 landmarks and L/R hand
	landmark vals:
	0 = wrist
	4 = thumb finger tip
	8 = index finger tip
	12 = middle finger tip
	16 = ring finger tip
	20 = pinky finger tip

	reference for landmark layout: https://mediapipe.readthedocs.io/en/latest/solutions/hands.html
	"""

	handedness: Handedness
	# landmark always = 21
	landmarks: list[HandLandmark]
	# mediapipe confidence for telemetry
	confidence: float


@dataclass
class HandDetectionResult:
	"""
	Result returned with HandDetectionPipeline.detect_hands()
	hands = empty when no hands in camera view (never none)
	"""

	hands: list[DetectedHand] = field(default_factory=list)
	frame_index: int = 0

	@property
	def has_hands(self) -> bool:
		return len(self.hands) > 0

	@property
	def hand_count(self) -> int:
		return len(self.hands)


# Configs
@dataclass
class DetectorConfig:
	# confidence threshholds - lower = more detections but can also make more false positives
	min_detection_confidence: float = 0.7
	min_tracking_confidence: float = 0.5
	# static_image_mode = F -> mediapipe tracks acrosss frames
	static_image_mode: bool = False


# hand detection pipeline
class HandDetectionPipeline:
	"""
	Wrap mp hands
	Receives a captured frame from cam feed, runs the hand landmarks to detect
	and returns a result

	algorithm expected outcome:
	open() -> detect_hands() (loop) -> close()
	"""

	def __init__(self, config: DetectorConfig = DetectorConfig()) -> None:
		self._config = config
		self._hands: Optional[object] = None

	# lifecycle algorithm
	def open(self) -> None:
		"""
		Initiate mp hands model
		"""
		# lazy import — mp.solutions only accessed here, not at module level
		mp_hands = mp.solutions.hands
		self._hands = mp_hands.Hands(
			static_image_mode=self._config.static_image_mode,
			max_num_hands=MAX_HANDS,
			min_detection_confidence=self._config.min_detection_confidence,
			min_tracking_confidence=self._config.min_tracking_confidence,
		)

		logger.info(
			'HandDetectionPipeline ready — max_hands=%d, detection_conf=%.2f, tracking_conf=%.2f',
			MAX_HANDS,
			self._config.min_detection_confidence,
			self._config.min_tracking_confidence,
		)

	def close(self) -> None:
		"""
		Release mp resources, it kinda feel like c++ yk free up memory, get it ;O
		I'll see myself out
		"""
		if self._hands:
			self._hands.close()
			self._hands = None
			logger.info('HandDetectionPipeline closed')

	# context managaer
	def __enter__(self) -> 'HandDetectionPipeline':
		self.open()
		return self

	def __exit__(self, *_) -> None:
		self.close()

	# detection
	def detect_hands(self, frame: CapturedFrame) -> HandDetectionResult:
		"""
		Run mp hand detection on a captured frame
		Retrun = hand detection result (once again never none)
		no hands found = result is empty list
		"""
		if self._hands is None:
			logger.error('detect_hands() called before open()')
			return HandDetectionResult(frame_index=frame.frame_index)

		# mp expects rgb (done in camera_feed.py)
		mp_result = self._hands.process(frame.rgb_frame)

		if not mp_result.multi_hand_landmarks:
			# no hands found = empty result
			logger.debug('No hands found in frame %d', frame.frame_index)
			return HandDetectionResult(frame_index=frame.frame_index)

		detected = []
		for hand_landmarks, handedness_info in zip(
			mp_result.multi_hand_landmarks,
			mp_result.multi_handedness,
		):
			detected.append(self._extract_landmarks(hand_landmarks, handedness_info))

		logger.debug('Frame %d - detected %d hand(s)', frame.frame_index, len(detected))

		return HandDetectionResult(hands=detected, frame_index=frame.frame_index)

	def _extract_landmarks(
		self,
		hand_landmarks,
		handedness_info,
	) -> DetectedHand:
		"""
		Convert a mp hand result into DetectedHand dataclass
		extracts all 21 landmarks as HandLandmark objects
		"""

		landmarks = [HandLandmark(x=lm.x, y=lm.y, z=lm.z) for lm in hand_landmarks.landmark]

		# mp labels from own perspective (mirrored so flip)
		# left swaps right to match user shown hand
		raw_label = handedness_info.classification[0].label
		confidence = handedness_info.classification[0].score

		if raw_label == 'Left':
			handedness = Handedness.RIGHT
		else:
			handedness = Handedness.LEFT

		return DetectedHand(
			handedness=handedness,
			landmarks=landmarks,
			confidence=confidence,
		)

	# drawing helper for smoke test
	def draw_landmarks(self, frame: CapturedFrame, result: HandDetectionResult) -> np.ndarray:
		"""
		Draw landmarks onto BGR frame
		should return annotated frame (does not mess with original)
		"""
		annotated = frame.bgr_frame.copy()

		if not result.has_hands:
			return annotated

		# lazy import — same reason as open()
		mp_hands = mp.solutions.hands
		mp_drawing = mp.solutions.drawing_utils

		# re-run mp result format for drawing
		mp_result = self._hands.process(frame.rgb_frame)
		if mp_result.multi_hand_landmarks:
			for hand_landmarks in mp_result.multi_hand_landmarks:
				mp_drawing.draw_landmarks(
					annotated,
					hand_landmarks,
					mp_hands.HAND_CONNECTIONS,
				)
		return annotated


# smoke test

if __name__ == '__main__':
	import os
	import sys

	import cv2

	logging.basicConfig(level=logging.DEBUG)

	# add cam folder to path for smoke test
	sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'camera'))
	from camera_feed import CameraConfig, CameraFeed

	with CameraFeed(CameraConfig()) as camera, HandDetectionPipeline() as detector:
		while True:
			frame = camera.capture_image()
			if frame is None:
				break

			result = detector.detect_hands(frame)
			annotated = detector.draw_landmarks(frame, result)

			# print landmark info in terminal
			for i, hand in enumerate(result.hands):
				wrist = hand.landmarks[0]
				print(
					f'frame={frame.frame_index:04d} '
					f'hand={i} {hand.handedness.name} '
					f'conf={hand.confidence:.2f} '
					f'wrist=({wrist.x:.2f}, {wrist.y:.2f})'
				)

			cv2.imshow('hand detection smoke test', annotated)
			if cv2.waitKey(1) & 0xFF == ord('q'):
				break

	cv2.destroyAllWindows()
