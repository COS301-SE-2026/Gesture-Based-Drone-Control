# /services/cv_pipeline/camera/camera_feed.py
# To do in camera:
# Open and config camera (test on mutliple devices -> mac uses iphone camera for some reason)
# raw frames reading (extract fps for api)
# preprocessing frames
# return captured frame (api call possibly)

import logging
import sys
import time
from dataclasses import dataclass
from enum import Enum, auto
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class CameraError(RuntimeError):
	"""Raised when the capture device cannot be opened or produces no frames."""


# configs & enum
class CameraSource(Enum):
	WEBCAM = auto()
	# point at recorded vid for offline use
	FILE = auto()


def default_api_preference() -> int:
	"""Most reliable OpenCV capture backend for current os"""
	if sys.platform == 'darwin':
		return cv2.CAP_AVFOUNDATION
	if sys.platform == 'win32':
		return cv2.CAP_DSHOW
	return cv2.CAP_V4L2


@dataclass
class CameraConfig:
	source: CameraSource = CameraSource.WEBCAM
	# default webcam
	device_index: int = 0
	# for source = FILE
	video_path: Optional[str] = None
	# adjust vals to fit website widget NB
	frame_width: int = 640
	frame_height: int = 480
	target_fps: int = 30
	# mirror for hand tracking
	flip_horizontal: bool = True
	api_preference: Optional[int] = None
	open_attempts: int = 4
	open_retry_delay: float = 0.35
	warmup_frames: int = 5
	max_read_failures: int = 150


# frame wrapper
@dataclass
class CapturedFrame:
	# processes frame one by one

	# openCV display
	bgr_frame: np.ndarray
	# conversion for mediapipe
	rgb_frame: np.ndarray
	# monotonic counter
	frame_index: int
	# capture time in seconds
	timestamp: float


class CameraFeed:
	# wrapper for cv2 video capturing
	# call requests frames one by one (capture_image())
	# open() -> capture_image() for camera loop
	def __init__(self, config: CameraConfig = CameraConfig()) -> None:
		self._config = config
		self._cap: Optional[cv2.VideoCapture] = None
		self._frame_idx = 0
		self._read_failures = 0

	@property
	def read_failures(self) -> int:
		return self._read_failures

	# lifecycle
	def open(self) -> None:
		if self._config.source == CameraSource.FILE:
			self._open_file()
			return
		self._open_device()

	def _open_file(self) -> None:
		if not self._config.video_path:
			raise ValueError('CameraConfig.video_path must be set when source=FILE')
		cap = cv2.VideoCapture(self._config.video_path)
		if not cap.isOpened():
			raise CameraError(f'Failed to open video file: {self._config.video_path}')
		self._cap = cap
		logger.info('Camera opened, source=FILE, path=%s', self._config.video_path)

	def _open_device(self) -> None:
		api = (
			self._config.api_preference
			if self._config.api_preference is not None
			else default_api_preference()
		)
		last_reason = 'unknown'

		for attempt in range(1, self._config.open_attempts + 1):
			cap = cv2.VideoCapture(self._config.device_index, api)
			if cap.isOpened():
				self._apply_properties(cap)
				if self._warmup(cap):
					self._cap = cap
					logger.info(
						'Camera opened, device=%s, api=%s, target=%d%d @ %dfps (attempt %d)',
						self._config.device_index,
						api,
						self._config.frame_width,
						self._config.frame_height,
						self._config.target_fps,
						attempt,
					)
					return
				last_reason = 'device opened but returned no frames'
			else:
				last_reason = 'device is busy or doesnt exist'

		cap.release()
		logger.warning(
			'Camera open attempt %d/%d failef (%s), retrying in %.2fs',
			attempt,
			self._config.open_attempts,
			last_reason,
			self._config.open_retry_delay,
		)
		time.sleep(self._config.open_retry_delay)

		raise CameraError(
			f'Failed to open camera index {self._config.device_index} after '
			f'{self._config.open_attempts} attempts: {last_reason}. '
			'Another application (or browser holding getUserMedia) '
			'is most likely still using the webcam.'
		)

	def _apply_properties(self, cap: cv2.VideoCapture) -> None:
		cap.set(cv2.CAP_PROP_FRAME_WIDTH, self._config.frame_width)
		cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self._config.frame_height)
		cap.set(cv2.CAP_PROP_FPS, self._config.target_fps)
		cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

	def _warmup(self, cap: cv2.VideoCapture) -> bool:
		"""Discard the first few frames: rerturn True once a real one arrives"""
		got_frame = False
		for _ in range(max(self._config.warmup_frames, 1)):
			ret, frame = cap.read()
			if ret and frame is not None and frame.size:
				got_frame = True
			else:
				time.sleep(0.05)
		return got_frame

	def close(self) -> None:
		"""Release camera device"""
		if self._cap is not None:
			if self._cap.isOpened():
				self._cap.release()
			self._cap = None
			self._read_failures = 0
			logger.info('Camera closed')

	def is_open(self) -> bool:
		return self._cap is not None and self._cap.isOpened()

	# context manager
	def __enter__(self) -> 'CameraFeed':
		self.open()
		return self

	def __exit__(self, *_) -> None:
		self.close()

	# frame capture
	# its been 2 hours and only 100 lines RAHHHHHHHHHH
	# read and preprocess single frame from camera
	def capture_image(self) -> Optional[CapturedFrame]:
		if self._cap is None or not self._cap.isOpened():
			logger.error('capture_image() called before open()')
			return None

		ret, raw = self._cap.read()

		if not ret or raw is None or not raw.size:
			# rate limiting
			self._read_failures += 1
			if self._read_failures == 1 or self._read_failures % 100 == 0:
				logger.warning('Cam returned no frame (x%d)', self._read_failures)
			if self._read_failures >= self._config.max_read_failures:
				raise CameraError(
					f'Camera stoped delivering frames after {self._read_failures} '
					'consecutive failed reads (device unplugged or taken over by '
					'another app) '
				)
			return None

		self._read_failures = 0
		return self._preprocess(raw)

	# preprocessing
	def _preprocess(self, raw: np.ndarray) -> CapturedFrame:
		"""Resize then flip then BGR TO RGB"""
		h, w = raw.shape[:2]
		if (w, h) != (self._config.frame_width, self._config.frame_height):
			raw = cv2.resize(
				raw,
				(self._config.frame_width, self._config.frame_height),
				interpolation=cv2.INTER_LINEAR,
			)

		if self._config.flip_horizontal:
			raw = cv2.flip(raw, 1)

		rgb = cv2.cvtColor(raw, cv2.COLOR_BGR2RGB)

		self._frame_idx += 1
		return CapturedFrame(
			bgr_frame=raw,
			rgb_frame=rgb,
			frame_index=self._frame_idx,
			timestamp=time.monotonic(),
		)


# smoke test, i could go for a smoke
# run from services/ with: python -m cv_pipeline.camera.camera_feed
if __name__ == '__main__':
	logging.basicConfig(level=logging.DEBUG)
	# if display from phone (mac specifically for me, device_index=1 or 2 in CameraConfig())
	with CameraFeed(CameraConfig()) as feed:
		while True:
			frame = feed.capture_image()
			if frame is None:
				break

			cv2.imshow('smoke test', frame.bgr_frame)
			print(f'frame={frame.frame_index:04d} shape={frame.bgr_frame.shape}')

			if cv2.waitKey(1) & 0xFF == ord('q'):
				break

	cv2.destroyAllWindows()
