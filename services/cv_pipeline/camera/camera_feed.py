# /services/cv-pipeline/camera/camera_feed.py
# To do in camera:
# Open and config camera (test on mutliple devices -> mac uses iphone camera for some reason)
# raw frames reading (extract fps for api)
# preprocessing frames
# return captured frame (api call possibly)

import logging
from dataclasses import dataclass
from enum import Enum, auto
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# configs & enum
class CameraSource(Enum):
    WEBCAM = auto()
    # point at recorded vid for offline use
    FILE = auto()

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

class CameraFeed:
    # wrapper for cv2 video capturing
    # call requests frames one by one (capture_image())
    # open() -> capture_image() for camera loop
    def __init__(self, config: CameraConfig = CameraConfig()) -> None:
        self._config = config
        self._cap: Optional[cv2.VideoCapture] = None
        self._frame_idx = 0

    # lifecycle
    def open(self) -> None:                            
        if self._config.source == CameraSource.FILE:
            if not self._config.video_path:
                raise ValueError(
                    "CameraConfig.video_path must be set when source=FILE."
                )
            self._cap = cv2.VideoCapture(self._config.video_path) 
        else:
            self._cap = cv2.VideoCapture(self._config.device_index)

        if not self._cap.isOpened():
            raise RuntimeError("Failed to open camera")

        # apply res and FPS
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH,  self._config.frame_width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self._config.frame_height)
        self._cap.set(cv2.CAP_PROP_FPS,          self._config.target_fps)

        logger.info(
            "Camera opened — source=%s, device=%s, target=%dx%d @ %dfps",
            self._config.source.name,
            self._config.device_index
                if self._config.source == CameraSource.WEBCAM
                else self._config.video_path,
            self._config.frame_width,
            self._config.frame_height,
            self._config.target_fps,
        )

    def close(self) -> None:                           
        """Release camera device"""
        if self._cap and self._cap.isOpened():
            self._cap.release()
            self._cap = None
            logger.info("Camera closed.")

    # context manager
    def __enter__(self) -> "CameraFeed":               
        self.open()
        return self

    def __exit__(self, *_) -> None:                    
        self.close()

    # frame capture
    # its been 2 hours and only 100 lines RAHHHHHHHHHH
    # read and preprocess single frame from camera
    def capture_image(self) -> Optional[CapturedFrame]: 
        if self._cap is None or not self._cap.isOpened(): 
            logger.error("capture_image() called before open()")
            return None

        ret, raw = self._cap.read()                    

        if not ret:
            logger.warning("Cam returned no frame")
            return None

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
        )

# smoke test, i could go for a smoke
if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    # if display from phone (mac specifically for me, device_index=1 or 2 in CameraConfig())
    with CameraFeed(CameraConfig()) as feed:
        while True:
            frame = feed.capture_image()
            if frame is None:
                break

            cv2.imshow("smoke test", frame.bgr_frame)
            print(f"frame={frame.frame_index:04d} shape={frame.bgr_frame.shape}")

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cv2.destroyAllWindows()