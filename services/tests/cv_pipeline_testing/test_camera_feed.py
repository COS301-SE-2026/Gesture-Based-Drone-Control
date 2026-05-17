# unit tessting for camera_feed.py
# Run from services/ with: pytest tests/cv_pipeline_testing/test_camera_feed.py -v

# finds file if not in same directory
import os

# file sys tools
import sys

# mock camera to make "fake" cam
from unittest.mock import MagicMock, patch

import cv2
import numpy as np
import pytest

# find camera_feed.py file
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'cv_pipeline', 'camera'))

from camera_feed import (
	CameraConfig,
	CameraFeed,
	CameraSource,
	CapturedFrame,
)


# helpers
def make_blank_frame(w: int = 640, h: int = 480) -> np.ndarray:
	"""Returns a blank BGR frame of the given dimensions."""
	return np.zeros((h, w, 3), dtype=np.uint8)


def make_feed(config: CameraConfig = None) -> CameraFeed:
	return CameraFeed(config or CameraConfig())


# cam config testing
class TestCameraConfig:
	def test_defaults(self):
		config = CameraConfig()
		assert config.source == CameraSource.WEBCAM
		assert config.device_index == 0
		# adj. these vals accordingly for frontend!
		assert config.frame_width == 640
		assert config.frame_height == 480
		assert config.target_fps == 30
		#
		assert config.flip_horizontal is True
		assert config.video_path is None

	# adj. these vals accordingly for frontend!
	def test_custom_values(self):
		config = CameraConfig(
			source=CameraSource.FILE,
			video_path='test.mp4',
			frame_width=1280,
			frame_height=720,
			target_fps=60,
			flip_horizontal=False,
		)

		# must match with vals aboce
		assert config.source == CameraSource.FILE
		assert config.video_path == 'test.mp4'
		assert config.frame_width == 1280
		assert config.frame_height == 720
		assert config.target_fps == 60
		assert config.flip_horizontal is False


# captured frame testing
class TestCapturedFrame:
	def test_fields_stored_correctly(self):
		bgr = make_blank_frame()
		rgb = make_blank_frame()
		frame = CapturedFrame(bgr_frame=bgr, rgb_frame=rgb, frame_index=1)

		assert frame.frame_index == 1
		assert frame.bgr_frame is bgr
		assert frame.rgb_frame is rgb


# opened cam feed testing
class TestCameraFeedOpen:
	@patch('camera_feed.cv2.VideoCapture')
	def test_open_webcam_success(self, mock_cap_cls):
		mock_cap = MagicMock()
		mock_cap.isOpened.return_value = True
		mock_cap_cls.return_value = mock_cap

		feed = make_feed()
		feed.open()

		mock_cap_cls.assert_called_once_with(0)
		mock_cap.set.assert_called()
		assert feed.is_open()

	@patch('camera_feed.cv2.VideoCapture')
	def test_open_file_source_success(self, mock_cap_cls):
		mock_cap = MagicMock()
		mock_cap.isOpened.return_value = True
		mock_cap_cls.return_value = mock_cap

		config = CameraConfig(source=CameraSource.FILE, video_path='clip.mp4')
		feed = make_feed(config)
		feed.open()

		mock_cap_cls.assert_called_once_with('clip.mp4')

	@patch('camera_feed.cv2.VideoCapture')
	def test_open_raises_if_camera_fails(self, mock_cap_cls):
		mock_cap = MagicMock()
		mock_cap.isOpened.return_value = False
		mock_cap_cls.return_value = mock_cap

		feed = make_feed()
		with pytest.raises(RuntimeError, match='Failed to open camera'):
			feed.open()

	def test_open_file_source_raises_without_path(self):
		config = CameraConfig(source=CameraSource.FILE, video_path=None)
		feed = make_feed(config)
		with pytest.raises(ValueError):
			feed.open()

	@patch('camera_feed.cv2.VideoCapture')
	def test_open_sets_resolution_and_fps(self, mock_cap_cls):
		mock_cap = MagicMock()
		mock_cap.isOpened.return_value = True
		mock_cap_cls.return_value = mock_cap

		feed = make_feed(CameraConfig(frame_width=1280, frame_height=720, target_fps=60))
		feed.open()

		calls = {call.args[0]: call.args[1] for call in mock_cap.set.call_args_list}
		assert calls[cv2.CAP_PROP_FRAME_WIDTH] == 1280
		assert calls[cv2.CAP_PROP_FRAME_HEIGHT] == 720
		assert calls[cv2.CAP_PROP_FPS] == 60


# closed cam feed testing
class TestCameraFeedClose:
	@patch('camera_feed.cv2.VideoCapture')
	def test_close_releases_capture(self, mock_cap_cls):
		mock_cap = MagicMock()
		mock_cap.isOpened.return_value = True
		mock_cap_cls.return_value = mock_cap

		feed = make_feed()
		feed.open()
		feed.close()

		mock_cap.release.assert_called_once()
		assert not feed.is_open()

	def test_close_before_open_does_not_crash(self):
		feed = make_feed()
		feed.close()  # should be a no-op


# cam manager testing
class TestCameraFeedContextManager:
	@patch('camera_feed.cv2.VideoCapture')
	def test_context_manager_opens_and_closes(self, mock_cap_cls):
		mock_cap = MagicMock()
		mock_cap.isOpened.return_value = True
		mock_cap_cls.return_value = mock_cap

		with CameraFeed(CameraConfig()) as feed:
			assert feed.is_open()

		mock_cap.release.assert_called_once()


# capture img testing
class TestCaptureImage:
	@patch('camera_feed.cv2.VideoCapture')
	def test_returns_none_before_open(self, mock_cap_cls):
		feed = make_feed()
		# _cap is None — should return None without crashing
		result = feed.capture_image()
		assert result is None

	@patch('camera_feed.cv2.VideoCapture')
	def test_returns_captured_frame_on_success(self, mock_cap_cls):
		raw = make_blank_frame()
		mock_cap = MagicMock()
		mock_cap.isOpened.return_value = True
		mock_cap.read.return_value = (True, raw)
		mock_cap_cls.return_value = mock_cap

		feed = make_feed()
		feed.open()
		result = feed.capture_image()

		assert isinstance(result, CapturedFrame)
		assert result.frame_index == 1

	@patch('camera_feed.cv2.VideoCapture')
	def test_returns_none_when_read_fails(self, mock_cap_cls):
		mock_cap = MagicMock()
		mock_cap.isOpened.return_value = True
		mock_cap.read.return_value = (False, None)
		mock_cap_cls.return_value = mock_cap

		feed = make_feed()
		feed.open()
		result = feed.capture_image()

		assert result is None

	@patch('camera_feed.cv2.VideoCapture')
	def test_frame_index_increments(self, mock_cap_cls):
		raw = make_blank_frame()
		mock_cap = MagicMock()
		mock_cap.isOpened.return_value = True
		mock_cap.read.return_value = (True, raw)
		mock_cap_cls.return_value = mock_cap

		feed = make_feed()
		feed.open()

		f1 = feed.capture_image()
		f2 = feed.capture_image()
		f3 = feed.capture_image()

		assert f1.frame_index == 1
		assert f2.frame_index == 2
		assert f3.frame_index == 3


# preporcess testing
class TestPreprocess:
	def _make_open_feed(self, config=None):
		"""Returns a feed with a mocked-open capture device."""
		with patch('camera_feed.cv2.VideoCapture') as mock_cap_cls:
			mock_cap = MagicMock()
			mock_cap.isOpened.return_value = True
			mock_cap_cls.return_value = mock_cap
			feed = make_feed(config)
			feed.open()
			return feed

	def test_bgr_and_rgb_frames_returned(self):
		feed = self._make_open_feed()
		raw = make_blank_frame()
		result = feed._preprocess(raw)

		assert result.bgr_frame is not None
		assert result.rgb_frame is not None

	def test_output_resolution_matches_config(self):
		config = CameraConfig(frame_width=320, frame_height=240)
		feed = self._make_open_feed(config)

		# Deliberately pass a frame with different dimensions
		oversized = np.zeros((720, 1280, 3), dtype=np.uint8)
		result = feed._preprocess(oversized)

		h, w = result.bgr_frame.shape[:2]
		assert w == 320
		assert h == 240

	def test_no_resize_when_dimensions_match(self):
		"""If the frame is already the right size, resize should not be called."""
		config = CameraConfig(frame_width=640, frame_height=480)
		feed = self._make_open_feed(config)

		raw = make_blank_frame(640, 480)
		with patch('camera_feed.cv2.resize') as mock_resize:
			feed._preprocess(raw)
			mock_resize.assert_not_called()

	def test_flip_applied_when_enabled(self):
		config = CameraConfig(flip_horizontal=True)
		feed = self._make_open_feed(config)
		raw = make_blank_frame()

		with patch('camera_feed.cv2.flip', wraps=__import__('cv2').flip) as mock_flip:
			feed._preprocess(raw)
			mock_flip.assert_called_once_with(raw, 1)

	def test_flip_skipped_when_disabled(self):
		config = CameraConfig(flip_horizontal=False)
		feed = self._make_open_feed(config)
		raw = make_blank_frame()

		with patch('camera_feed.cv2.flip') as mock_flip:
			feed._preprocess(raw)
			mock_flip.assert_not_called()

	def test_rgb_frame_has_correct_channel_order(self):
		"""BGR->RGB: channel 0 of bgr should equal channel 2 of rgb."""
		feed = self._make_open_feed()

		# Create a frame with a known colour in BGR
		raw = np.zeros((480, 640, 3), dtype=np.uint8)
		raw[:, :, 0] = 255  # Blue channel in BGR

		result = feed._preprocess(raw)

		# After BGR->RGB, the blue value should be in channel 2
		assert result.rgb_frame[0, 0, 2] == 255
		assert result.rgb_frame[0, 0, 0] == 0
