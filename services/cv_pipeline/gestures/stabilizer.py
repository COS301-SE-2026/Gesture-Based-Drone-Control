"""
Smoothing for gestures
Plugs into gesture_engine.py -> builds per hand and hestureResult
then passes it through stabilize() before returning
"""

from collections import Counter, deque
from dataclasses import replace

from cv_pipeline.hand_detection.mediapipe_detector import Handedness

from .recognizers.gesture_recognizer import Gesture, GestureResult


class GestureStabilizer:
	"""
	window = how many recent frames to remember per hand
	min_agreement = how many of those frames must agree before switch
	(higher is more stable but might lag abit more)
	"""

	def __init__(self, window: int = 5, min_agreement: int = 3) -> None:
		if min_agreement > window:
			raise ValueError('min_agreement cannot exceed window')
		self._window = window
		self._min_agreement = min_agreement
		# handedness -> recent raw gestures
		self._history: dict[Handedness, deque[Gesture]] = {}
		# handedness -> last gesure committed to
		self._stable: dict[Handedness, Gesture] = {}

	def stabilize(self, results: list[GestureResult]) -> list[GestureResult]:
		"""
		Return same results with each gesture replaced by its smoothed value
		"""
		out: list[GestureResult] = []
		seen: set[Handedness] = set()

		for r in results:
			seen.add(r.handedness)
			hist = self._history.setdefault(r.handedness, deque(maxlen=self._window))
			hist.append(r.gesture)

			# most common gesture in window
			candidate, votes = Counter(hist).most_common(1)[0]
			if votes >= self._min_agreement:
				self._stable[r.handedness] = candidate

			# until enough agreement, hold prev stable val
			stable_gesture = self._stable.get(r.handedness, r.gesture)
			out.append(replace(r, gesture=stable_gesture))

		# a hand that left the frame shouldnt keep dstable history
		stale = [hand for hand in self._history if hand not in seen]
		for hand in stale:
			del self._history[hand]
			self._stable.pop(hand, None)

		return out
