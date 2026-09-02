"""
Build deterministic fixturees the NFR suite runs agaisnt

Makes everything repeatable, a camera and human hand cant be used in ci so a 
committed .npz of labelled landmarks arrays is both

Usage:
    uv run python tests/nfr/_support/make_fixtures.py \
        --raw data/landmarks_raw.csv -- out tests/nfr/fixtures
        
Produces:
    bench_landmarks.npz (n frames, unlabelled, for latency + FPS timing)
    labelled.npz (>=300 labelled frames, held out)
    negatives.npz (transitional / no-hand frames)
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

import numpy as np

NEGATIVE_LABELS = {'UNKNOWN', 'NONE', 'TRANSITION', ''}
MIN_LABELLED = 300
SEED = 20260831  # fixed so split is same on all machines


def load_raw(path: Path) -> tuple[np.ndarray, np.ndarray]:
	labels: list[str] = []
	rows: list[list[float]] = []
	with path.open(newline='') as fh:
		reader = csv.reader(fh)
		header = next(reader)
		if not header[0].lower().startswith('label'):
			fh.seek(0)
			reader = csv.reader(fh)
		for row in reader:
			if len(row) < 64:
				continue
			labels.append(row[0].strip().upper())
			rows.append([float(v) for v in row[1:64]])
	arr = np.asarray(rows, dtype=np.float32).reshape(-1, 63)
	return arr, np.asarray(labels)


def main() -> int:
	ap = argparse.ArgumentParser()
	ap.add_argument('--raw', required=True, type=Path)
	ap.add_argument('--out', default=Path('tests/nfr/fixtures'), type=Path)
	ap.add_argument('--holdout', type=float, default=0.35)
	args = ap.parse_args()

	landmarks, labels = load_raw(args.raw)
	rng = np.random.default_rng(SEED)

	is_negative = np.isin(labels, list(NEGATIVE_LABELS))
	pos_idx = np.flatnonzero(~is_negative)
	neg_idx = np.flatnonzero(is_negative)

	rng.shuffle(pos_idx)
	n_hold = max(MIN_LABELLED, int(len(pos_idx) * args.holdout))
	hold = pos_idx[:n_hold]

	args.out.mkdir(parents=True, exist_ok=True)
	np.savez_compressed(args.out / 'labelled.npz', landmarks=landmarks[hold], labels=labels[hold])
	np.savez_compressed(
		args.out / 'negatives.npz',
		landmarks=landmarks[neg_idx],
		labels=labels[neg_idx],
	)

	# bench set keeps orignal frame order
	np.savez_compressed(args.out / 'bench_landmarks.npz', landmarks=landmarks)

	print(f'labelled: {len(hold)} frames (need >= {MIN_LABELLED})')
	print(f'negatives: {len(neg_idx)} frames')
	print(f'bench: {len(landmarks)} frames')
	if len(hold) < MIN_LABELLED:
		print('WARNING: need a labelled set of atleast 300 samples')
		return 1
	return 0


if __name__ == '__main__':
	raise SystemExit(main())
