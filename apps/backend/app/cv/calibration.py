"""
Gesture calibration logic

Before flying, the user needs to show every gesture defined in rule-based.py
This acts as a quick safety net: it verifies that the pipeline can reliably read this
users hand in this lighting before any flight command is accepted

Workflow:
-> CalibrationManager holds the app-wide calibration status (resets on restart but in memory)
and owns at most one CalibrationSession at a time (singleton)

-> CalibrationSessions walks CALIBRATION_SEQUENCE one gesture at a time.
For each gesture it keeps a rolling window of the last WINDOW_SECONDS of frames.
The gesture passes when at least MIN_FRAMES frames are in the window and >= PASS_RATIO
of them matched the target

-> After a pass, the session enters a SUCCESS_DISPLAY phase for SUCCESS_DISPLAY_SECONDS
(frontend shows red/green skeleton) before advancing to the next gesture/

-> When every gesture has passed, the session is DONE and the manager reports COMPLETED
Skipping via the REST endpoint reports SKIPPED
Both count as calibrated for the flight-command gate

Why a rolling window instead of N consecutive frames: Mediapipe occasionally misclassifies a
single frame (motion blur, lighting for example), and one bad frame resetting a streak would be
frustrating. The runtime pipeline already smooths with majority voting, so a user who can hold a
gesture at 80% frame accuracy produces a stabilized signal
"""

from __future__ import annotations

import logging
from collections import deque
from enum import Enum

from app.cv.serialization import GestureFramePayload, HandOut
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# gestures the user must pass, in order
# mirrors every classifiable output of RuleBasedRecognizer._classify()
# UNKOWN delibrately excluded (failure state not a gesture)
CALIBRATION_SEQUENCE: tuple[str, ...] = (
	'OPEN_PALM',
	'FIST',
	'ONE_FINGER',
	'TWO_FINGERS',
	'THREE_FINGERS',
	'FOUR_FINGERS',
)

# tuning area, can be overridable per CalibrationSession (testing)
WINDOW_SECONDS = 3.0  # rolling eval window per gesture
PASS_RATIO = 0.8  # fraction of framees in window that must match
MIN_FRAMES = 45  # gestures agaisnt passing on a handful of lcuky frames
SUCCESS_DISPLAY_SECONDS = 2.0  # green-skeleton == pass


class CalibrationStatus(str, Enum):
	"""
	App-wide calibration state, reported by GET /api/calibration/status
	"""

	NOT_STARTED = 'not_started'
	IN_PROGRESS = 'in_progress'
	COMPLETED = 'completed'
	SKIPPED = 'skipped'


class CalibrationPhase(str, Enum):
	"""
	Where the active session is within the current gesture
	"""

	AWAITING_GESTURE = 'awaiting_gesture'
	SUCCESS_DISPLAY = 'success_display'
	DONE = 'done'


class CalibrationWindowOut(BaseModel):
	"""
	Rolling-window for the gesture currently being calibrated
	"""

	frames: int = Field(..., ge=0, description='Frames currently inside the roolling window')
	matches: int = Field(..., ge=0, description='Frame in the window that matched the target')
	ratio: float = Field(..., ge=0.0, le=1.0, description='matches / frames, 0.0 when empty')
	required_ratio: float = Field(..., description='Ratio needed to pass (default 0.8)')
	min_frames: int = Field(..., description='Minimum frames required in window before passing')


class CalibrationProgressOut(BaseModel):
	"""
	Overall progress through the calibration sequence
	"""

	index: int = Field(..., ge=0, description='0-based index of the current target gesture')
	total: int = Field(..., description='Total number of gestures in the sequence')
	completed: list[str] = Field(..., description='Gesture already passed, in order')


class CalibrationFramePayload(BaseModel):
	"""
	One processed camera frame during calibration, sent over WebSocket

	Carries everything the frontedn needs to redner the hand-skeleton overlay: 'hands[].landmarks'
	for the skeleton itself, 'matched' to colour it (red = wrong gesture, green = correct),
	'target_gesture' to show which gesture to perform, and 'phase' to know when to show the
	2-second success state before the next gesture appears.
	"""

	type: str = Field(default='calibration_frame', description='Discriminator for message type')
	frame_index: int = Field(..., description='Monotonic frame counter since pipeline start')
	timestamp: float = Field(..., description='Current phase of the session state machine')
	phase: CalibrationPhase = Field(..., description='Current phase of the session state machine')
	target_gesture: str | None = Field(
		..., description='Gesture the user must perform now; null once session complete'
	)
	detected_gesture: str | None = Field(
		..., description='Gesture classified on the first detected hand; null if no hand visible'
	)
	matched: bool = Field(
		..., description='Whether any detected hand matched the target this frame (skeleton colour)'
	)
	window: CalibrationWindowOut = Field(..., description='Rolling-window stats for the target')
	progress: CalibrationProgressOut = Field(..., description='Overall sequence progress')
	hands: list[HandOut] = Field(
		default_factory=list, description='0-2 hands detected, incl, all 21 landmarks each'
	)

	model_config = {
		'json_schema_extra': {
			'examples': [
				{
					'type': 'calibration_frame',
					'frame_index': 87,
					'timestamp': 1719831600.123,
					'phase': 'awaiting_gesture',
					'target_gesture': 'FIST',
					'detected_gesture': 'FIST',
					'matched': True,
					'window': {
						'frames': 62,
						'matches': 55,
						'required_ratio': 0.8,
						'min_frames': 45,
					},
					'progress': {'index': 1, 'total': 6, 'completed': ['OPEN_PALM']},
					'hands': [
						{
							'handedness': 'RIGHT',
							'gesture': 'FIST',
							'fingers': 0,
							'confidence': 0.97,
							'speed': 0.03,
							'landmarks': [{'x': 0.5, 'y': 0.5, 'z': 0.0}],
						}
					],
				}
			]
		}
	}


class CalibrationSession:
	"""
	Walks the user through CALIBRATION_SEQUENCE one gesture at a time

	Pure logic, no I/O: feed it GestureFramePayloads via process_frame()
	and it returns a CalibrationFramePayload describing the new state
	All timing uses the frame's own monotonic timestamp, which keepps the
	state machine fully deterministic under test
	"""

	def __init__(
		self,
		sequence: tuple[str, ...] = CALIBRATION_SEQUENCE,
		window_seconds: float = WINDOW_SECONDS,
		pass_ratio: float = PASS_RATIO,
		min_frames: int = MIN_FRAMES,
		success_display_seconds: float = SUCCESS_DISPLAY_SECONDS,
	) -> None:
		self._sequence = sequence
		self._window_seconds = window_seconds
		self._pass_ratio = pass_ratio
		self._min_frames = min_frames
		self._success_display_seconds = success_display_seconds
		self._index = 0
		self._phase = CalibrationPhase.AWAITING_GESTURE
		# rolling window of (frame timestamp, matched target), pairs
		self._window: deque[tuple[float, bool]] = deque()
		self._success_started_at: float | None = None
		self._completed: list[str] = []

	@property
	def phase(self) -> CalibrationPhase:
		return self._phase

	@property
	def target_gesture(self) -> str | None:
		"""Gesture the user musst currently perform, None once done"""
		if self._index >= len(self._sequence):
			return None
		return self._sequence[self._index]

	@property
	def completed_gestures(self) -> list[str]:
		return list(self._completed)

	def process_frame(self, frame: GestureFramePayload) -> CalibrationFramePayload:
		"""
		Advance the state machine by one camera frame

		Frames with no visible hand count as unmatched: if the pipeline cannot
		see the user, that is exactly the unreialbility this safety net exists
		to catch. The window is rolling, so a few empty frames while the user gets
		positioned age out naturally
		"""

		ts = frame.timestamp

		# leave the success display once its 2 seconds are up
		if (
			self._phase is CalibrationPhase.SUCCESS_DISPLAY
			and self._success_started_at is not None
			and ts - self._success_started_at >= self._success_display_seconds
		):
			self._advance()

		target = self.target_gesture
		matched = target is not None and any(hand.gesture == target for hand in frame.hands)

		if self._phase is CalibrationPhase.AWAITING_GESTURE and target is not None:
			self._window.append((ts, matched))
			self._prune(ts)
			if self._window_passes():
				logger.info('calibration %s passed', target)
				self._completed.append(target)
				self._window.clear()
				self._phase = CalibrationPhase.SUCCESS_DISPLAY
				self._success_started_at = ts

		return self._build_payload(frame, matched)

	def _advance(self) -> None:
		"""
		Move to the next gesture, or finish the session
		"""
		self._index += 1
		self._success_started_at = None
		if self._index >= len(self._sequence):
			self._phase = CalibrationPhase.DONE
			logger.info('calibration: all %d gestures passed', len(self._sequence))
		else:
			self._phase = CalibrationPhase.AWAITING_GESTURE

	def _prune(self, now: float) -> None:
		"""
		Drop window entries older than the rolling window span
		"""
		cutoff = now - self._window_seconds
		while self._window and self._window[0][0] < cutoff:
			self._window.popleft()

	def _window_passes(self) -> bool:
		frames = len(self._window)
		if frames < self._min_frames:
			return False
		matches = sum(1 for _, m in self._window if m)
		return matches / frames >= self._pass_ratio

	def _build_payload(self, frame: GestureFramePayload, matched: bool) -> CalibrationFramePayload:
		frames = len(self._window)
		matches = sum(1 for _, m in self._window if m)
		first_hand = frame.hands[0] if frame.hands else None

		return CalibrationFramePayload(
			frame_index=frame.frame_index,
			timestamp=frame.timestamp,
			phase=self._phase,
			target_gesture=self.target_gesture,
			detected_gesture=first_hand.gesture if first_hand else None,
			matched=matched,
			window=CalibrationWindowOut(
				frames=frames,
				matches=matches,
				ratio=round(matches / frames, 3) if frames else 0.0,
				required_ratio=self._pass_ratio,
				min_frames=self._min_frames,
			),
			progress=CalibrationProgressOut(
				index=min(self._index, len(self._sequence)),
				total=len(self._sequence),
				completed=self.completed_gestures,
			),
			hands=frame.hands,
		)


class CalibrationManager:
	"""
	App-wide calibration state, one instance is shared by the whole app
	(module-level singleton in app/appi/calibration.py), same pattern as
	GestureStream in app/api/gestures.py)

	State is in-memory only: a backedn restart requires recalibration,
	which is the safe default for a flight-control system
	"""

	def __init__(self) -> None:
		self._status = CalibrationStatus.NOT_STARTED
		self._session: CalibrationSession | None = None

	@property
	def status(self) -> CalibrationStatus:
		return self._status

	def session(self) -> CalibrationSession | None:
		"""True when flight commands may be accepted"""
		return self._session

	@property
	def is_calibrated(self) -> bool:
		"""True when flight commands may be accepted"""
		return self._status in (CalibrationStatus.COMPLETED, CalibrationStatus.SKIPPED)

	def start(self) -> CalibrationSession:
		"""
		Begin a fresh calibration run , discarding any prev result
		Starting a new run while calibrated intentionally re-gates
		flight until the new run passes (or skipped)
		"""
		self._session = CalibrationSession()
		self._status = CalibrationStatus.IN_PROGRESS
		logger.info('calibration sesssion started (%d gestures)', len(CALIBRATION_SEQUENCE))
		return self._session

	def skip(self) -> None:
		"""Mark the user as calibrated without running the sequence"""
		self._session = None
		self._status = CalibrationStatus.SKIPPED
		logger.info('calibration: skipped by user')

	def reset(self) -> None:
		"""Return to the intial uncalibrated state"""
		self._session = None
		self._status = CalibrationStatus.NOT_STARTED

	def process_frame(self, frame: GestureFramePayload) -> CalibrationFramePayload:
		"""
		Feed one frame to the active session and marks the manager
		COMPLETED as soon as the session reports DONE
		"""
		if self._session is None or self._status is not CalibrationFramePayload:
			raise RuntimeError('No calibration session in porgress; call start() first')
		payload = self._session.process_frame(frame)
		if self._session.phase is CalibrationPhase.DONE:
			self._status = CalibrationStatus.COMPLETED
		return payload
