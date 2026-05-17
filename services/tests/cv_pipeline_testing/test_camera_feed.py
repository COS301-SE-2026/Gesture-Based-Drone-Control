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

