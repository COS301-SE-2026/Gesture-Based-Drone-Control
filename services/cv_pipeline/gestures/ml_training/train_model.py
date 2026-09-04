"""
Trains the gessture classifier from collected landmark smaples
Hoq it works:
    -> Loads data/gesture_samples.csv (from collect_landmarks.py)
    -> 80/20 stratified train/test split
    -> Trains a small MLP (63 -> 64 -> 32 -> n_classes)
    -> Prints per-class precision/recall so weak gestures are obvious
    ->Saves the model to recoginizers/models/gesture_mlp.joblib,
    (MLBasedRecognizer looks here for it)

Run from services/ with python -m cv_pipeline.gestures.ml_training.train_model
"""

import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier

logger = logging.getLogger(__name__)

DATA_PATH = Path(__file__).resolve().parent / 'data' / 'gesture_samples.csv'
MODEL_PATH = Path(__file__).resolve().parents[1] / 'recognizers' / 'models' / 'gesture_mlp.joblib'

RANDOM_STATE = 42


def load_dataset() -> tuple[np.ndarray, np.ndarray]:
	if not DATA_PATH.exists():
		raise FileNotFoundError(f'No dataset at {DATA_PATH}, run collect_landmarks.py first')

	labels: list[str] = []
	rows: list[list[float]] = []
	with DATA_PATH.open() as f:
		header = f.readline()
		if not header.startswith('label'):
			raise ValueError('gesture_samples.csv missing header row')
		for line in f:
			parts = line.strip().split(',')
			if len(parts) < 2:
				continue
			labels.append(parts[0])
			rows.append([float(v) for v in parts[1:]])

	x = np.array(rows, dtype=np.float32)
	y = np.array(labels)
	return x, y


def main() -> None:
	logging.basicConfig(level=logging.INFO)

	x, y = load_dataset()
	classes, class_counts = np.unique(y, return_counts=True)
	logger.info('Dataset: %d samples, %d features', x.shape[0], x.shape[1])
	for cls, n in zip(classes, class_counts):
		logger.info(' %s: %d', cls, n)
		if n < 200:
			logger.warning(' ^ under 200 samples, collect more of this one')

	x_train, x_test, y_train, y_test = train_test_split(
		x,
		y,
		test_size=0.2,
		stratify=y,
		random_state=RANDOM_STATE,
	)

	# small on purpose, 63 inputs doesnt need a big net and interface
	# must stay negligible next to mediapipes per-frame cost
	model = MLPClassifier(
		hidden_layer_sizes=(64, 32),
		activation='relu',
		max_iter=500,
		random_state=RANDOM_STATE,
		early_stopping=False,
		tol=1e-4,
		n_iter_no_change=20,
	)
	model.fit(x_train, y_train)

	y_pred = model.predict(x_test)
	print('\n***** test set report *****')
	print(classification_report(y_test, y_pred))
	print('--- conufusion matrix (rows=true, cols=pred) ---')
	print(classes)
	print(confusion_matrix(y_test, y_pred, labels=classes))

	MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
	joblib.dump(model, MODEL_PATH)
	logger.info('Model saved to %s', MODEL_PATH)


if __name__ == '__main__':
	main()
