#unit tessting for camera_feed.py
# Run from services/ with: pytest tests/cv_pipeline_testing/test_camera_feed.py -v

#finds file if not in same directory
import sys
# file sys tools
import os
#mock camera to make "fake" cam 
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
import cv2

# find camera_feed.py file
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "cv_pipeline", "camera"))

from camera_feed import (
    CameraConfig,
    CameraFeed,
    CameraSource,
    CapturedFrame,
)

#cam config testing
class TestCameraConfig:
    def test_defaults(self):
        config = CameraConfig()
        assert config.source == CameraSource.WEBCAM
        assert config.device_index == 0
        # adj. these vals accordingly for frontend!
        assert config.frame_width == 640
        assert config.frame_height== 480
        assert config.target_fps   == 30
        #
        assert config.flip_horizontal is True
        assert config.video_path is None

     # adj. these vals accordingly for frontend!
    def test_custom_values(self):
        config = CameraConfig(
            source=CameraSource.FILE,
            video_path="test.mp4",
            frame_width=1280,
            frame_height=720,
            target_fps=60,
            flip_horizontal=False,
        )
        
         # must match with vals aboce
        assert config.source == CameraSource.FILE
        assert config.video_path == "test.mp4"
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

#opened cam feed testing
class TestCameraFeedOpen:
    @patch("camera_feed.cv2.VideoCapture")
    def test_open_webcam_success(self, mock_cap_cls):
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_cap_cls.return_value = mock_cap

        feed = make_feed()
        feed.open()

        mock_cap_cls.assert_called_once_with(0)
        mock_cap.set.assert_called()
        assert feed.is_open()

    @patch("camera_feed.cv2.VideoCapture")
    def test_open_file_source_success(self, mock_cap_cls):
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_cap_cls.return_value = mock_cap

        config = CameraConfig(source=CameraSource.FILE, video_path="clip.mp4")
        feed = make_feed(config)
        feed.open()

        mock_cap_cls.assert_called_once_with("clip.mp4")

    @patch("camera_feed.cv2.VideoCapture")
    def test_open_raises_if_camera_fails(self, mock_cap_cls):
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = False
        mock_cap_cls.return_value = mock_cap

        feed = make_feed()
        with pytest.raises(RuntimeError, match="Failed to open camera"):
            feed.open()

    def test_open_file_source_raises_without_path(self):
        config = CameraConfig(source=CameraSource.FILE, video_path=None)
        feed = make_feed(config)
        with pytest.raises(ValueError):
            feed.open()

    @patch("camera_feed.cv2.VideoCapture")
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
        
#helpers 
def make_blank_frame(w: int = 640, h: int = 480) -> np.ndarray:
    """Returns a blank BGR frame of the given dimensions."""
    return np.zeros((h, w, 3), dtype=np.uint8)


def make_feed(config: CameraConfig = None) -> CameraFeed:
    return CameraFeed(config or CameraConfig())