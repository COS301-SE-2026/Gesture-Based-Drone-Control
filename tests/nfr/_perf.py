"""
Test doubles and meters for perf tests

camera and hand replaced since ci cant run these
"""

from __future__ import annotations

import os
import tempfile
import time
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

import cv2

from services.cv_pipeline.camera.camera_feed import CameraConfig, CameraFeed, CapturedFrame
from services.cv_pipeline.hand_detection.mediapipe_detector import (
	DetectedHand,
	HandDetectionResult,
)
from tests.nfr._helpers import REPO_ROOT, hand, load_dataset, mirrored_hand

CLIP_DIR = REPO_ROOT / 'apps' / 'frontend' / 'public' / 'assets'
CLIP_W, CLIP_H, CLIP_FPS = 640, 480, 30


def reference_clip() -> Path:
	"""
	All tut clips concatenated and scaled to 640x480 at 30 fps
	"""
	target = Path(tempfile.gettempdir()) / f'gbdc_nfr_reference_{CLIP_W}x{CLIP_H}.avi'
	if target.exists() and target.stat().st_size > 0:
		return target

	sources = sorted(CLIP_DIR.glob('*.mp4'))
	if not sources:
		raise FileNotFoundError(f'no reference footage in {CLIP_DIR}')

	partial = target.with_suffix('.partial.avi')
	writer = cv2.VideoWriter(
		str(partial), cv2.VideoWriter_fourcc(*'MJPG'), CLIP_FPS, (CLIP_W, CLIP_H)
	)
	try:
		for src in sources:
			cap = cv2.VideoCapture(str(src))
			while True:
				ok, frame = cap.read()
				if not ok:
					break
				writer.write(cv2.resize(frame, (CLIP_W, CLIP_H), interpolation=cv2.INTER_AREA))
			cap.release()
	finally:
		writer.release()
	os.replace(partial, target)
	return target


def clip_config(fps: int = CLIP_FPS) -> CameraConfig:
	return CameraConfig(video_path=str(reference_clip()), target_fps=fps)


class PacedVideoCamera(CameraFeed):
	def __init__(self, config=CameraConfig()) -> None:
		super().__init__(config)
		self._period = 1.0 / max(1, config.target_fps)
		self._next_due: float | None = None
		self.frames_delivered = 0

	def open(self) -> None:
		cap = cv2.VideoCapture(self._config.video_path or str(reference_clip()))
		if not cap.isOpened():
			raise RuntimeError('reference clip could not be opened')
		self._cap = cap

	def capture_image(self) -> CapturedFrame | None:
		now = time.monotonic()
		if self._next_due is None:
			self._next_due = now
		wait = self._next_due - now
		if wait > 0:
			time.sleep(wait)
		elif wait < -self._period:
			self._next_due = now
		self._next_due += self._period

		frame = super().capture_image()
		if frame is None and self._cap is not None:
			self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
		if frame is not None:
			self.frames_delivered += 1
		return frame


def paced_camera_factory(video_path: str, fps: int):
	def build(config: CameraConfig = CameraConfig()) -> PacedVideoCamera:
		cfg = CameraConfig(
			video_path=video_path,
			target_fps=fps,
			frame_width=config.frame_width,
			frame_height=config.frame_height,
			flip_horizontal=config.flip_horizontal,
		)
		return PacedVideoCamera(cfg)

	return build


SCRIPT = (
	(('OPEN_PALM', None), 'HOVER'),
	(('ONE_FINGER', None), 'MOVE_UP'),
	(('THREE_FINGERS', 'THREE_FINGERS'), 'TAKEOFF'),
	(('TWO_FINGERS', 'OPEN_PALM'), 'ROTATE_CW'),
	(('FIST', 'FIST'), 'LAND'),
)
HOLD_FRAMES = 30


@dataclass
class LandmarkScript:
	hold_frames: int = HOLD_FRAMES
	_pools: dict[str, list[list[float]]] = field(default_factory=dict)
	onsets: dict[int, float] = field(default_factory=dict)
	processed: list[tuple[int, float]] = field(default_factory=list)

	def __post_init__(self) -> None:
		features, labels = load_dataset()
		pools: dict[str, list[list[float]]] = defaultdict(list)
		for f, label in zip(features, labels):
			pools[label].append(f)
		self._pools = dict(pools)

	def segment(self, frame_index: int) -> int:
		return frame_index // self.hold_frames

	def expected_command(self, segment: int) -> str:
		return SCRIPT[segment % len(SCRIPT)][1]

	def hands_for(self, frame_index: int) -> list[DetectedHand]:
		(right, left), _ = SCRIPT[self.segment(frame_index) % len(SCRIPT)]
		out = [hand(self._sample(right, frame_index))]
		if left is not None:
			out.append(mirrored_hand(self._sample(left, frame_index + 7)))
		return out

	def _sample(self, label: str, i: int) -> list[float]:
		pool = self._pools[label]
		return pool[i % len(pool)]

	def inject(self, frame: CapturedFrame, real: HandDetectionResult) -> HandDetectionResult:
		seg = self.segment(frame.frame_index)
		self.onsets.setdefault(seg, frame.timestamp)
		self.processed.append((frame.frame_index, frame.timestamp))
		return HandDetectionResult(
			hands=self.hands_for(frame.frame_index), frame_index=real.frame_index
		)


class CpuMeter:
	def __enter__(self) -> 'CpuMeter':
		self._wall0 = time.perf_counter()
		self.cpu0 = time.process_time()
		return self

	def __exit__(self, *_) -> None:
		self._wall_s = time.perf_counter() - self._wall0
		self.cpu_s = time.process_time() - self.cpu0

	@property
	def machine_pct(self) -> float:
		return 100.0 * self.cpu_s / (self._wall_s * (os.cpu_count() or 1))

	@property
	def single_core_pct(self) -> float:
		return 100.0 * self.cpu_s / self._wall_s
