"""
Data collection for the ML gesture recognizer
How it works:
    -> Opens camera and mediapipe detector
    -> You pick a label with a key, toggle recording with SPACE
    -> While recording, every frame with exactly one hand in view gets its
        normalised feature vector appended to the csv with thr current label
        -> Aim for about 1000 samples per gesture and vary it: move hand around,
        tilt it, change distance from camera, use both hands (max 2)

Keys:
    f = FIST
    o = OPEN_PALM
    1 = ONE_FINGER
    2 = TWO_FINGERS
    3 = THREE_FINGERS
    4 = FOUR_FINGERS
    SPACE = start/stop recording
    q = quit (auto saves, CSV appended per frame also)

Run from sevices/ with:
    python -m cv_pipeline.gestures.ml_training.collect_landmarks
"""

import csv
import logging
from collections import Counter
from pathlib import Path

import cv2

from services.cv_pipeline.camera.camera_feed import CameraConfig, CameraFeed
from services.cv_pipeline.gestures.recognizers.ml_based import NUM_FEATURES, extract_features
from services.cv_pipeline.hand_detection.mediapipe_detector import HandDetectionPipeline

logger = logging.getLogger(__name__)

# out lives next to training script
DATA_PATH = Path(__file__).resolve().parent / 'data' / 'gesture_samples.csv'

KEY_TO_LABEL = {
	ord('f'): 'FIST',
	ord('o'): 'OPEN_PALM',
	ord('1'): 'ONE_FINGER',
	ord('2'): 'TWO_FINGERS',
	ord('3'): 'THREE_FINGERS',
	ord('4'): 'FOUR_FINGERS',
}


def _load_existing_counts() -> Counter:
	"""So the overlay shows totals across sessions, not just this run"""
	counts: Counter = Counter()
	if DATA_PATH.exists():
		with DATA_PATH.open() as f:
			reader = csv.reader(f)
			next(reader, None)
			for row in reader:
				if row:
					counts[row[0]] += 1
	return counts


def main() -> None:
	logging.basicConfig(level=logging.INFO)

	DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
	write_header = not DATA_PATH.exists()

	counts = _load_existing_counts()
	current_label: str | None = None
	recording = False

	with (
		DATA_PATH.open('a', newline='') as f,
		CameraFeed(CameraConfig()) as camera,
		HandDetectionPipeline() as detector,
	):
		writer = csv.writer(f)
		if write_header:
			writer.writerow(['label'] + [f'f{i}' for i in range(NUM_FEATURES)])

		while True:
			frame = camera.capture_image()
			if frame is None:
				break

			result = detector.detect_hands(frame)
			annotated = detector.draw_landmarks(frame, result)

			# record only clean single-hand frames so labels cant get polluted
			if recording and current_label and result.hand_count == 1:
				features = extract_features(result.hands[0])
				writer.writerow([current_label] + [f'{v:.6f}' for v in features])
				counts[current_label] += 1

			# overlay
			status_colour = (0, 0, 255) if recording else (0, 255, 255)
			status = 'RECORDING' if recording else 'paused (SPACE to record)'
			cv2.putText(
				annotated,
				f'label: {current_label or "none (f/o/1-4)"} [{status}]',
				(10, 30),
				cv2.FONT_HERSHEY_SIMPLEX,
				0.6,
				status_colour,
				2,
			)
			if result.hand_count != 1:
				cv2.putText(
					annotated,
					f'need exactly 1 hand in view (seeing {result.hand_count})',
					(10, 55),
					cv2.FONT_HERSHEY_SIMPLEX,
					0.5,
					(0, 165, 255),
					1,
				)
			y = 80
			for label in KEY_TO_LABEL.values():
				cv2.putText(
					annotated,
					f'{label}: {counts[label]}',
					(10, y),
					cv2.FONT_HERSHEY_SIMPLEX,
					0.5,
					(0, 255, 0),
					1,
				)
				y += 20

			cv2.imshow('collect landmarks', annotated)

			key = cv2.waitKey(1) & 0xFF
			if key == ord('q'):
				break
			if key == ord(' '):
				recording = not recording and current_label is not None
			if key in KEY_TO_LABEL:
				current_label = KEY_TO_LABEL[key]
				logger.info('Label -> %s', current_label)

	cv2.destroyAllWindows()
	logger.info('Saved samples to %s, totals: %s', DATA_PATH, dict(counts))


if __name__ == '__main__':
	main()
