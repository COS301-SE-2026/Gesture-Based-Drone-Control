"""
Binding layer between NFR suite and the code
"""

from __future__ import annotations

import csv
import sys
import time
from pathlib import Path
from typing import Any, Iterable, Iterator, Optional

REPO_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = REPO_ROOT / 'apps' / 'backend'

GESTURE_SAMPLES_CSV = (
	REPO_ROOT
	/ 'services'
	/ 'cv_pipeline'
	/ 'gestures'
	/ 'ml_training'
	/ 'data'
	/ 'gesture_samples.csv'
)

NUM_LANDMARKS = 21
NUM_FEATURES = 63


def _ensure_paths() -> None:
	for entry in (str(REPO_ROOT), str(BACKEND_ROOT)):
		if entry not in sys.path:
			sys.path.insert(0, entry)


_ensure_paths()

# 6 gestures excluding unknown can emit
VOCABULARY: tuple[str, ...] = (
	'FIST',
	'OPEN_PALM',
	'ONE_FINGER',
	'TWO_FINGERS',
	'THREE_FINGERS',
	'FOUR_FINGERS',
)

# 4 fingers not mapped in gesture adapter
UNMAPPED_GESTURES: frozenset[str] = frozenset({'FOUR_FINGERS'})

# gesture adapter drops any hand below 0.85
MIN_CONFIDENCE: float = 0.85


def build_recognizer() -> Any:
	"""default is rule based"""
	from services.cv_pipeline.gestures.recognizers.rule_based import RuleBasedRecognizer

	return RuleBasedRecognizer()


def build_ml_recognizer(model_path: Optional[Path] = None) -> Any:
	from services.cv_pipeline.gestures.recognizers.ml_based import MLBasedRecognizer

	return MLBasedRecognizer(model_path) if model_path else MLBasedRecognizer()


def build_stabilizer(window: int = 5, min_agreement: int = 3) -> Any:
	from services.cv_pipeline.gestures.stabilizer import GestureStabilizer

	return GestureStabilizer(window=window, min_agreement=min_agreement)


def build_engine(recognizer: Any = None, *, stabilize: bool = True) -> Any:
	from services.cv_pipeline.gestures.gesture_engine import GestureEngine

	stabilizer = build_stabilizer() if stabilize else build_stabilizer(window=1, min_agreement=1)
	return GestureEngine(recognizer=recognizer or build_recognizer(), stabilizer=stabilizer)


async def build_adapter() -> Any:
	adapter = RecordingDroneAdapter()
	await adapter.connect()
	return adapter


def build_app() -> Any:
	from app.main import app

	return app


class RecordingDroneAdapter:
	"""Dummy Drone Adapter keeps a command log"""

	def __init__(self) -> None:
		from services.drone_control.adapters.dummy_drone_adapter import DummyDroneAdapter

		self._inner = DummyDroneAdapter()
		self.command_log: list[Any] = []
		self.command_times: list[float] = []

	async def execute(self, command: Any) -> None:
		self.command_log.append(command)
		self.command_times.append(time.perf_counter())
		await self._inner.execute(command)

	@property
	def command_names(self) -> list[str]:
		return [c.type.name for c in self.command_log]

	@property
	def last_command_time(self) -> Optional[float]:
		return self.command_times[-1] if self.command_times else None

	def time_of_first(self, command_name: str) -> Optional[float]:
		for command, stamp in zip(self.command_log, self.command_times):
			if command.type.name == command_name:
				return stamp
		return None

	def reset_log(self) -> None:
		self.command_log.clear()
		self.command_times.clear()

	def __getattr__(self, name: str) -> Any:
		return getattr(self._inner, name)


def hand_from_features(features: Iterable[float], handedness: str = 'RIGHT') -> Any:
	"""
	Build a detected hand from 63-value normalised feature row
	"""

	from services.cv_pipeline.hand_detection.mediapipe_detector import (
		DetectedHand,
		Handedness,
		HandLandmark,
	)

	values = list(features)
	if len(values) != NUM_FEATURES:
		raise ValueError(f'expected {NUM_FEATURES} features, got {len(values)}')

	landmarks = [
		HandLandmark(x=values[i * 3], y=values[i * 3 + 1], z=values[i * 3 + 2])
		for i in range(NUM_LANDMARKS)
	]
	return DetectedHand(
		handedness=Handedness[handedness.upper()],
		landmarks=landmarks,
		confidence=0.95,
	)


def detection_from_hands(hands: list[Any], frame_index: int = 0) -> Any:
	from services.cv_pipeline.hand_detection.mediapipe_detector import HandDetectionResult

	return HandDetectionResult(hands=hands, frame_index=frame_index)


def load_gesture_samples(
	path: Optional[Path] = None,
) -> tuple[list[list[float]], list[str]]:
	"""Read the collect_landmarks CSV into (features, labels)"""
	source = path or GESTURE_SAMPLES_CSV
	if not source.exists():
		raise FileNotFoundError(f'{source} not found; run collect_landmarks.py or point at own csv')

	features: list[list[float]] = []
	labels: list[str] = []
	with source.open(newline='') as handle:
		for row in csv.DictReader(handle):
			features.append([float(row[f'f{i}']) for i in range(NUM_FEATURES)])
			labels.append(row['label'].strip().upper())
	return features, labels


def classify_one(recognizer: Any, features: Iterable[float], handedness: str = 'RIGHT') -> str:
	"""Recognizer only, no smoothing and teturns gesture name"""
	return recognizer.interpret_gesture(hand_from_features(features, handedness)).gesture.name


def classify_stream(
	rows: Iterable[Iterable[float]],
	*,
	stabilize: bool = True,
	recognizer: Any = None,
	handedness: str = 'RIGHT',
) -> Iterator[str]:
	"""
	Runs frames through full GestureEngine, yielding one gesture name each
	"""
	engine = build_engine(recognizer, stabilize=stabilize)
	for index, features in enumerate(rows):
		hand = hand_from_features(features, handedness)
		result = engine.process(detection_from_hands([hand], frame_index=index))
		yield result.hand_gestures[0].gesture.name if result.has_gestures else 'UNKNOWN'


def resolve_command(by_side: dict[str, str]) -> Any:
	from services.input.sources.gesture_adapter import GestureAdapter

	return GestureAdapter._resolve(GestureAdapter.__new__(GestureAdapter), by_side)


def gesture_to_command(gesture_or_snapshot: Any, source: str = 'nfr') -> Any:
	from services.commands.command import Command

	snapshot = (
		gesture_or_snapshot
		if isinstance(gesture_or_snapshot, dict)
		else {'RIGHT': gesture_name(gesture_or_snapshot)}
	)
	command_type = resolve_command(snapshot)
	return Command(type=command_type, source=source) if command_type else None


def is_actionable(gesture: Any, confidence: float = 1.0) -> bool:
	name = gesture_name(gesture)
	if name == 'UNKNOWN' or confidence < MIN_CONFIDENCE:
		return False
	return resolve_command({'RIGHT': name}) is not None


def gesture_name(gesture: Any) -> str:
	if gesture is None:
		return 'UNKNOWN'
	if isinstance(gesture, str):
		return gesture.upper()
	inner = getattr(gesture, 'gesture', gesture)
	return getattr(inner, 'name', str(inner)).upper()


WS_ROUTES: tuple[str, ...] = (
	'/api/drone/ws/telemetry',
	'/api/drone/ws/commands',
	'/api/gestures/stream',
	'/api/calibration/stream',
	'/api/input/ws/keyboard',
	'/api/input/ws/gamepad',
	'/api/input/ws/gesture/status',
	'/api/input/ws/gesture/events',
)


def access_token_ttl_seconds() -> int:
	from services.auth.auth_settings import get_auth_settings

	return get_auth_settings().access_token_expire_minutes * 60
