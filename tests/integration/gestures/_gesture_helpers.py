import os
from functools import lru_cache
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]

SCRIPTED = os.getenv('GBDC_TESTS_SCRIPTED_CAMERA', '').strip() == '1'


@lru_cache(maxsize=1)
def camera_available() -> bool:
	"""
	Probe whether webcame device 0 (hardcoded in backend file) can be opened
	Cached so the device is only touched once per session, and released immediately
	so the app can open it afterwards
	"""
	try:
		import cv2
	except ImportError:
		return False
	cap = cv2.VideoCapture(0)
	try:
		if not cap.isOpened():
			return False
		ok, _ = cap.read()
		return bool(ok)
	finally:
		cap.release()


requires_camera = pytest.mark.skipif(
	not camera_available(),
	reason=('no working camera on device 0, enable a webcam'),
)

requires_scripted_camera = pytest.mark.skipif(
	not (SCRIPTED and camera_available()),
	reason=(
		'full-run tests need the calibration gestures performed on camera. '
		'set GBDC_TESTS_SCRIPTED_CAMERA=1 and perform each prompted gesture '
		'(3s hold) when the test connects'
	),
)

MAX_FRAMES_FULL_RUN = 30 * 150
MAX_FRAMES_SHORT = 30 * 20
