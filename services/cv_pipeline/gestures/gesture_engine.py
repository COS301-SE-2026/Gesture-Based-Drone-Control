# /services/cv_pipeline/gestures/gesture_engine.py
# receives and processes a gesture through a gesture_recognizer
"""
Receives HandDetectionResult from mediapipe_detector.py
Runs gesture recognition on each hand (2 max)
Returns GestureEngineResult with per-hand GestureResults

so flow goes like:
camera_feed -> mediapipe_detector -> gesture_engine -> processing
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

# hand-detection import
from cv_pipeline.hand_detection.mediapipe_detector import HandDetectionResult

# recognizer imports — GestureResult lives with the interface now, not rule_based
from .recognizers.gesture_recognizer import GestureRecognizer, GestureResult
from .recognizers.rule_based import RuleBasedRecognizer

logger = logging.getLogger(__name__)


# engine result
@dataclass
class GestureEngineResult:
	"""
	Result from gesture engine for single frame
	Contains the hand gesture results for each hand (one entry per detected hand)
	frame_index passed through HandDetectionResult for ordering
	"""

	# one GestureResult per detected hand
	hand_gestures: list[GestureResult] = field(default_factory=list)
	frame_index: int = 0

	@property
	def has_gestures(self) -> bool:
		return len(self.hand_gestures) > 0

	@property
	def gesture_count(self) -> int:
		return len(self.hand_gestures)


# gesture engine
class GestureEngine:
	"""
	Runs gesture recognition on every hand in a HandDetectionResult
	Strategy pattern is used here (ml or rule-based swapping)
	Default will be rule-based
	"""

	def __init__(self, recognizer: Optional[GestureRecognizer] = None) -> None:
		self._recognizer = recognizer or RuleBasedRecognizer()

	def set_recognizer(self, recognizer: GestureRecognizer) -> None:
		"""
		Swap recognizer at runtime
		Allows switching between rule-based and ml without restarting
		"""
		self._recognizer = recognizer
		logger.info('GestureEngine recognizer changed to %s', type(recognizer).__name__)

	def process(self, detection_result: HandDetectionResult) -> GestureEngineResult:
		"""
		Process all detected hands and return hand gesture results for each hand
		no hands = empty GestureEngineResult
		"""
		if not detection_result.has_hands:
			logger.debug(
				'No hands in frame %d - skipping gesture recognition',
				detection_result.frame_index,
			)
			return GestureEngineResult(frame_index=detection_result.frame_index)

		hand_gestures = []
		for hand in detection_result.hands:
			gesture_result = self._recognizer.interpret_gesture(hand)
			hand_gestures.append(gesture_result)
			logger.debug(
				'frame=%d hand=%s gesture=%s fingers=%d',
				detection_result.frame_index,
				hand.handedness.name,
				gesture_result.gesture.name,
				gesture_result.finger_state.count,
			)

		return GestureEngineResult(
			hand_gestures=hand_gestures,
			frame_index=detection_result.frame_index,
		)


# smoke test, going for that second smoke now
if __name__ == '__main__':
	import cv2
	from cv_pipeline.camera.camera_feed import CameraConfig, CameraFeed
	from cv_pipeline.hand_detection.mediapipe_detector import HandDetectionPipeline

	logging.basicConfig(level=logging.INFO)

	with CameraFeed(CameraConfig()) as camera, HandDetectionPipeline() as detector:
		engine = GestureEngine()

		while True:
			frame = camera.capture_image()
			if frame is None:
				break

			detection = detector.detect_hands(frame)
			engine_result = engine.process(detection)
			annotated = detector.draw_landmarks(frame, detection)

			# overlay gesture name on each hand
			for gr in engine_result.hand_gestures:
				label = f'{gr.handedness.name}: {gr.gesture.name} ({gr.finger_state.count})'
				print(f'frame={engine_result.frame_index:04d} {label}')

			# render gesture text in the top-left of the preview
			y = 30
			for gr in engine_result.hand_gestures:
				text = f'{gr.handedness.name}: {gr.gesture.name}'
				cv2.putText(
					annotated,
					text,
					(10, y),
					cv2.FONT_HERSHEY_SIMPLEX,
					0.7,
					(0, 255, 0),
					2,
				)
				y += 30

			cv2.imshow('gesture engine smoke test', annotated)
			if cv2.waitKey(1) & 0xFF == ord('q'):
				break

	cv2.destroyAllWindows()
