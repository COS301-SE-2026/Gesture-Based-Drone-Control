"""
QR-44 / NFR5.1 -> predicted time-to-first-flight for a novice, keystroke-level
model built from the real forms, tutorial media, calibration constants and measured
system response times <= 5 min
QR-45 / NFR5.1 -> observed: participants who finished the basic flight within
5 minutes (from the usability study log)
QR-46 / NFR5.2 -> observed: mean System Usability Scale score >= 85 with >= 5
external participants (from the usability study log)
QR-47 / NFR5.3 -> UX audit: every user-visible error states a cause, suggests a
corrective action and leaks no internals
QR-48 / R7 (US-A-02) -> every gesture command is reachable from the keyboard and
gamepad, emergency stop included
QR-49 / R1.1.2 -> command-history feedback: one entry per held gesture, not one
per frame; a brief tracking dropout does not duplicate it
"""

from __future__ import annotations

import csv
import re
import statistics
from dataclasses import dataclass

import cv2
import pytest

from tests.nfr._helpers import EVIDENCE_DIR, REPO_ROOT, emit, write_samples

FRONTEND = REPO_ROOT / 'apps' / 'frontend' / 'src'
STUDY_LOG = REPO_ROOT / 'docs' / 'nfr' / 'usability' / 'sessions.csv'

TARGET_FIRST_FLIGHT_S = 300.0
MIN_PARTICIPANTS = 5
TARGET_SUS = 85.0
TARGET_WITHIN_5_MIN_PCT = 80.0

# QR-44 keystroke-level model
K = 0.28  # keystroke, average non-secretary typist (~40 wpm)
P = 1.10  # point with the mouse
B = 0.10  # mouse button press/release
H = 0.40  # home hand between mouse and keyboard
M = 1.35  # mental preparation

NOVICE_ALLOWANCE = 2.0

# drone physically climbing/settling after TAKEOFF / LAND
TAKEOFF_S = 5.0
LAND_S = 5.0


def _field(chars: int) -> float:
	"""Think, point at the field, click, move to the keyboard, type"""
	return M + P + B + H + chars * K


def _click() -> float:
	return M + P + B


def _clip_seconds(name: str) -> float:
	cap = cv2.VideoCapture(str(REPO_ROOT / 'apps' / 'frontend' / 'public' / 'assets' / name))
	try:
		return cap.get(cv2.CAP_PROP_FRAME_COUNT) / (cap.get(cv2.CAP_PROP_FPS) or 30)
	finally:
		cap.release()


def _tutorial_clips() -> list[str]:
	source = (FRONTEND / 'components' / 'organisms' / 'Tutorial.jsx').read_text()
	return re.findall(r'ASSETBASE\}([\w-]+\.mp4)', source)


def _measured(qr_id: str, key: str, default: float) -> tuple[float, str]:
	"""Reuse a response time this run already measured, else a stated default"""
	import json

	path = EVIDENCE_DIR / f'{qr_id}.json'
	if path.exists():
		data = json.loads(path.read_text())
		value = data.get(key)
		if isinstance(value, dict):
			value = value.get('p95')
		if isinstance(value, (int, float)):
			return float(value), f'{qr_id} measured'
	return default, 'default (measurement not in this run)'


def test_predicted_time_to_first_flight():
	from app.cv.calibration import CALIBRATION_SEQUENCE, SUCCESS_DISPLAY_SECONDS, WINDOW_SECONDS

	login_ms, login_src = _measured('QR-38', 'actual', 1000.0)
	onset_ms, onset_src = _measured('QR-30', 'actual', 200.0)
	cold_s, cold_src = _measured('QR-41', 'actual', 10.0)

	clips = _tutorial_clips()
	assert clips, 'tutorial media list not found in Tutorial.jsx'
	video_s = sum(_clip_seconds(c) for c in clips)

	phases = {
		# launch: wait for the window
		'open app': cold_s,
		# signup: first, last, email, password, confirm, terms tick, submit
		'sign up': _field(6)
		+ _field(6)
		+ _field(20)
		+ _field(12)
		+ _field(12)
		+ _click()
		+ _click(),
		# login: email, password, submit, server verifies
		'log in': _field(20) + _field(12) + _click() + login_ms / 1000,
		# tutorial: open it, then for each step read and watch the clip, click next
		'tutorial': _click() + video_s + len(clips) * (M + _click()),
		# calibration: each gesture read, formed and held for the evaluation window
		'calibration': _click()
		+ len(CALIBRATION_SEQUENCE) * (M + WINDOW_SECONDS + SUCCESS_DISPLAY_SECONDS),
		# pick a drone mode and wait for connection
		'connect drone': _click() + 1.0,
		# basic sequence: take-off, hover, move, land by gesture
		'fly: take-off, hover, move, land': 4 * (M + onset_ms / 1000) + TAKEOFF_S + LAND_S,
	}
	predicted = round(sum(phases.values()), 1)
	with_allowance = round(predicted * NOVICE_ALLOWANCE, 1)
	passed = predicted <= TARGET_FIRST_FLIGHT_S
	before_takeoff = round(predicted - phases['fly: take-off, hover, move, land'], 1)

	write_samples(
		'QR-44',
		{
			'phase': list(phases),
			'seconds': [round(v, 1) for v in phases.values()],
		},
	)
	emit(
		'QR-44',
		'NFR5.1',
		'KLM-predicted time from opening the app to completing the basic flight (s)',
		actual=predicted,
		target=f'<= {TARGET_FIRST_FLIGHT_S}',
		passed=passed,
		phases_s={k: round(v, 1) for k, v in phases.items()},
		onboarding_before_takeoff_s=before_takeoff,
		with_x2_novice_allowance_s=with_allowance,
		finding=(
			f'Feasible, but tight: {before_takeoff} s of the 300 s budget goes on sign-up, '
			'log-in, the full tutorial and calibration before the first take-off. With a x2 '
			f'allowance for a first-time user the estimate is {with_allowance} s, over the '
			'limit, so the real-participant timing (QR-45) is the deciding evidence. Shortening '
			'the path (skippable tutorial steps, calibration offered after the first flight) '
			'would add margin.'
		)
		if with_allowance > TARGET_FIRST_FLIGHT_S
		else None,
		tutorial_steps=len(clips),
		tutorial_video_s=round(video_s, 1),
		calibration_gestures=len(CALIBRATION_SEQUENCE),
		inputs={'login': login_src, 'gesture onset': onset_src, 'cold start': cold_src},
		method=(
			'Keystroke-Level Model (Card, Moran & Newell): K=0.28, P=1.10, B=0.10, H=0.40, '
			'M=1.35 s. Form fields, tutorial clip lengths, calibration sequence and window '
			'are read from the product itself; system response times come from this run. '
			'An error-free prediction: a feasibility check, confirmed or refuted by QR-45.'
		),
		chart={'kind': 'bars', 'column': 'seconds', 'label': 'phase', 'unit': 's'},
	)
	assert passed, f'predicted {predicted} s to first flight: {phases}'


# QR-45 / QR-46 usability study

SUS_ITEMS = [f'sus_q{i}' for i in range(1, 11)]


def _sessions() -> list[dict[str, str]]:
	if not STUDY_LOG.exists():
		return []
	with STUDY_LOG.open(newline='') as fh:
		rows = [r for r in csv.DictReader(fh) if (r.get('participant_id') or '').strip()]
	return [r for r in rows if not r['participant_id'].strip().startswith('#')]


def sus_score(row: dict[str, str]) -> float:
	"""Brooke (1996): odd items score-1, even items 5-score, sum x 2.5"""
	total = 0
	for i, item in enumerate(SUS_ITEMS, start=1):
		answer = int(row[item])
		if not 1 <= answer <= 5:
			raise ValueError(f'{row["participant_id"]} {item}={answer} not on 1-5 scale')
		total += (answer - 1) if i % 2 else (5 - answer)
	return total * 2.5


def _external(rows):
	return [r for r in rows if r.get('external', '').strip().lower() in ('y', 'yes', 'true', '1')]


def test_study_time_on_task():
	rows = _external(_sessions())
	if len(rows) < MIN_PARTICIPANTS:
		emit(
			'QR-45',
			'NFR5.1',
			'participants completing the basic flight within 5 minutes (%)',
			actual=f'{len(rows)}/{MIN_PARTICIPANTS} participants logged',
			target=f'>= {TARGET_WITHIN_5_MIN_PCT}% of >= {MIN_PARTICIPANTS} external participants',
			passed=False,
			status='pending',
			method='Awaiting the usability study; see docs/nfr/usability/PROTOCOL.md.',
		)
		pytest.skip(f'usability study has {len(rows)} external sessions, needs {MIN_PARTICIPANTS}')

	times = []
	within = 0
	for r in rows:
		done = r['flight_completed'].strip().lower() in ('y', 'yes', 'true', '1')
		seconds = float(r['time_to_first_flight_s'] or 'inf')
		times.append(seconds if done else float('nan'))
		within += done and seconds <= TARGET_FIRST_FLIGHT_S
	pct = round(100 * within / len(rows), 1)
	finished = [t for t in times if t == t]
	passed = pct >= TARGET_WITHIN_5_MIN_PCT

	write_samples(
		'QR-45',
		{
			'participant': [r['participant_id'] for r in rows],
			'seconds': [t if t == t else '' for t in times],
		},
	)
	emit(
		'QR-45',
		'NFR5.1',
		'participants completing the basic flight within 5 minutes (%)',
		actual=pct,
		target=f'>= {TARGET_WITHIN_5_MIN_PCT}',
		passed=passed,
		participants=len(rows),
		median_s=round(statistics.median(finished), 1) if finished else None,
		method='Timed from first opening the app to landing, per docs/nfr/usability/PROTOCOL.md.',
		chart={
			'kind': 'bars',
			'column': 'seconds',
			'label': 'participant',
			'unit': 's',
			'threshold': TARGET_FIRST_FLIGHT_S,
		},
	)
	assert passed, f'only {pct}% finished within 5 minutes'


def test_study_satisfaction():
	rows = _external(_sessions())
	if len(rows) < MIN_PARTICIPANTS:
		emit(
			'QR-46',
			'NFR5.2',
			'mean System Usability Scale score (0-100)',
			actual=f'{len(rows)}/{MIN_PARTICIPANTS} participants logged',
			target=f'>= {TARGET_SUS} with >= {MIN_PARTICIPANTS} external participants',
			passed=False,
			status='pending',
			method='Awaiting the usability study; see docs/nfr/usability/PROTOCOL.md.',
		)
		pytest.skip(f'usability study has {len(rows)} external sessions, needs {MIN_PARTICIPANTS}')

	scores = [sus_score(r) for r in rows]
	mean = round(statistics.fmean(scores), 1)
	passed = mean >= TARGET_SUS

	write_samples('QR-46', {'participant': [r['participant_id'] for r in rows], 'sus': scores})
	emit(
		'QR-46',
		'NFR5.2',
		'mean System Usability Scale score (0-100)',
		actual=mean,
		target=f'>= {TARGET_SUS}',
		passed=passed,
		participants=len(rows),
		min_sus=min(scores),
		max_sus=max(scores),
		method='Standard 10-item SUS questionnaire after the session, scored per Brooke (1996).',
		chart={
			'kind': 'bars',
			'column': 'sus',
			'label': 'participant',
			'unit': 'SUS',
			'threshold': TARGET_SUS,
		},
	)
	assert passed, f'mean SUS {mean} below {TARGET_SUS}'


def test_sus_scoring_is_correct():
	"""Guards the scoring maths the satisfaction row relies on"""
	best = {item: ('5' if i % 2 else '1') for i, item in enumerate(SUS_ITEMS, start=1)}
	worst = {item: ('1' if i % 2 else '5') for i, item in enumerate(SUS_ITEMS, start=1)}
	neutral = dict.fromkeys(SUS_ITEMS, '3')
	for row, expected in ((best, 100.0), (worst, 0.0), (neutral, 50.0)):
		assert sus_score({'participant_id': 'x', **row}) == expected


# QR-47 error-message audit

# something the user can do about it
ACTION = re.compile(
	r'\b(try|retry|please|check|make sure|ensure|confirm|complete|skip|select|choose|'
	r'log in|sign in|sign up|use|close|enable|allow|reconnect|restart|plug|fly|land|'
	r'consider|must (?:be|have|contain)|expected one of|supported)\b',
	re.IGNORECASE,
)
# says nothing about what went wrong
GENERIC = re.compile(
	r'^\W*(something (?:has )?(?:gone|went) wrong|connection failed|camera unavailable|'
	r'error|failed)[\s,.!]*(?:try again)?[\s.!]*$',
	re.IGNORECASE,
)
# implementation detail a user should never read
INTERNALS = re.compile(
	r'(traceback|exception|typeerror|value error,|\[object|undefined|null\b|\bman\b)',
	re.IGNORECASE,
)


@dataclass
class ShownError:
	where: str
	trigger: str
	text: str
	appends_raw_error: bool = False

	def verdict(self) -> dict:
		cause = len(self.text.strip()) >= 12 and not GENERIC.search(self.text)
		action = bool(ACTION.search(self.text))
		leak = bool(INTERNALS.search(self.text)) or self.appends_raw_error
		return {
			'where': self.where,
			'trigger': self.trigger,
			'text': self.text.strip(),
			'states_cause': cause,
			'suggests_action': action,
			'leaks_internals': leak,
			'ok': cause and action and not leak,
		}


def _frontend_strings() -> list[ShownError]:
	"""Error text the frontend itself writes, read straight from the source"""
	catalogue = [
		(
			'hooks/useForm.js',
			r'setErrors\(\{ general: "([^"]+)" \}\)',
			'login rejected / server error',
		),
		(
			'hooks/useForm.js',
			r'setErrors\(\{\s*general: "([^"]+)" \+ err',
			'login: server unreachable',
		),
		(
			'components/organisms/Signup.jsx',
			r'setErrors\(\{ general: "([^"]+)" \}\)',
			'sign-up rejected / unreachable',
		),
		(
			'components/organisms/Gestures.jsx',
			r'data\.message \|\| "([^"]+)"',
			'drone connect failed, no message',
		),
		('components/organisms/Gestures.jsx', r'message:\s*"([^"]+)"', 'emergency stop alert'),
		(
			'components/organisms/Games.jsx',
			r'data\.message \|\| "([^"]+)"',
			'game connect failed, no message',
		),
		('hooks/useFrameStream.js', r'message\.message \|\| "([^"]+)"', 'camera error, no message'),
		(
			'hooks/useTelemetryAlerts.js',
			r'message: \(t\) =>\s*`([^`]+)`',
			'telemetry threshold alert',
		),
	]
	shown: list[ShownError] = []
	for rel, pattern, trigger in catalogue:
		source = (FRONTEND / rel).read_text()
		matches = list(re.finditer(pattern, source))
		assert matches, f'{rel}: error text moved, update the QR-47 catalogue ({pattern})'
		for m in matches:
			line = source.count('\n', 0, m.start()) + 1
			text = re.sub(r'\$\{[^}]+\}', '42', m.group(1))
			shown.append(
				ShownError(f'{rel}:{line}', trigger, text, appends_raw_error='+ err' in m.group(0))
			)
	return shown


def _backend_strings() -> list[ShownError]:
	"""Backend text the UI displays verbatim, triggered for real"""
	from app.main import app
	from fastapi.testclient import TestClient

	from services.cv_pipeline.camera.camera_feed import CameraConfig, CameraError, CameraFeed

	shown: list[ShownError] = []
	with TestClient(app) as client:
		weak = client.post(
			'/api/auth/signup',
			json={
				'email': 'not-an-email',
				'password': 'weakpass1!',
				'first_name': 'A',
				'last_name': 'B',
			},
		)
		for err in weak.json()['detail']:
			shown.append(
				ShownError(
					f'backend 422 -> signup field {err["loc"][-1]}',
					f'sign-up with invalid {err["loc"][-1]}',
					err['msg'],
				)
			)
		failed = client.post(
			'/api/drone/connect',
			json={
				'adapter': 'projectairsim',
				'topics_port': 1,
				'services_port': 2,
			},
		).json()
		shown.append(
			ShownError(
				'backend /drone/connect -> Gestures.jsx connection error',
				'simulator not running',
				failed['message'],
			)
		)
	try:
		CameraFeed(CameraConfig(device_index=99, open_attempts=1, open_retry_delay=0)).open()
	except CameraError as exc:
		shown.append(
			ShownError(
				'backend CameraError -> camera panel (useFrameStream)',
				'webcam missing or in use',
				str(exc),
			)
		)
	return shown


def test_error_messages_are_actionable():
	audit = [e.verdict() for e in _frontend_strings() + _backend_strings()]
	good = [a for a in audit if a['ok']]
	pct = round(100 * len(good) / len(audit), 1)
	passed = len(good) == len(audit)

	write_samples(
		'QR-47',
		{
			'where': [a['where'] for a in audit],
			'cause': [a['states_cause'] for a in audit],
			'action': [a['suggests_action'] for a in audit],
			'no_internals': [not a['leaks_internals'] for a in audit],
			'text': [a['text'] for a in audit],
		},
	)
	emit(
		'QR-47',
		'NFR5.3',
		'user-visible errors that state a cause AND suggest an action (%)',
		actual=pct,
		target='100',
		passed=passed,
		audited=len(audit),
		compliant=len(good),
		failing=[a for a in audit if not a['ok']],
		rule=(
			'cause: specific (not a generic "something went wrong"); action: tells the user '
			'what to do next; internals: no exception names, framework prefixes, raw error '
			'objects or informal wording'
		),
		method=(
			'Automated UX audit. Frontend-authored error strings are read from the source '
			'files; backend messages the UI shows verbatim are triggered for real (invalid '
			'sign-up, simulator offline, webcam unavailable). Each is checked against the rule.'
		),
	)
	assert passed, f'{len(audit) - len(good)} of {len(audit)} errors fail NFR5.3'


# QR-48 input parity


def test_every_command_reachable_without_gestures():
	from services.commands.command import CommandType
	from services.input.sources.gamepad_adapter import BUTTON_MAP
	from services.input.sources.gesture_adapter import (
		ASYMMETRICAL_TWO_HAND_MAP,
		SINGLE_HAND_MAP,
		TWO_HAND_MAP,
	)
	from services.input.sources.keyboard_adapter import KEY_MAP

	gesture = {
		*SINGLE_HAND_MAP.values(),
		*TWO_HAND_MAP.values(),
		*ASYMMETRICAL_TWO_HAND_MAP.values(),
	}
	keyboard = set(KEY_MAP.values())
	# vertical movement on the pad is analog (triggers/sticks) via CommandType.ANALOG
	gamepad = set(BUTTON_MAP.values())
	if CommandType.ANALOG in _gamepad_emits():
		gamepad |= {CommandType.MOVE_UP, CommandType.MOVE_DOWN}

	missing = {
		'keyboard': sorted(c.name for c in gesture - keyboard),
		'gamepad': sorted(c.name for c in gesture - gamepad),
	}
	one_handed = sorted(c.name for c in SINGLE_HAND_MAP.values())
	passed = not missing['keyboard'] and not missing['gamepad']

	emit(
		'QR-48',
		'R7 / US-A-02',
		'gesture commands also reachable from keyboard and gamepad',
		actual=f'keyboard {len(gesture) - len(missing["keyboard"])}/{len(gesture)}, '
		f'gamepad {len(gesture) - len(missing["gamepad"])}/{len(gesture)}',
		target='all, including EMERGENCY_STOP',
		passed=passed,
		missing=missing,
		one_handed_gesture_commands=one_handed,
		finding=(
			f'Only {len(one_handed)} of {len(gesture)} commands work with a single hand '
			f'({", ".join(one_handed)}); take-off and land need both hands. US-A-01 and the '
			'U3 description in SRS 3.1.2.4 expect full one-handed gesture control, so a '
			'one-handed operator relies on keyboard or gamepad (which this row confirms).'
		),
		method=(
			'Compares the real mapping tables of GestureAdapter, KeyboardAdapter and '
			'GamepadAdapter.'
		),
	)
	assert passed, f'commands missing from alternative inputs: {missing}'


def _gamepad_emits() -> set:
	import asyncio

	from services.input.sources.gamepad_adapter import GamepadAdapter

	seen: set = set()
	pad = GamepadAdapter()
	pad.set_handler(lambda c: seen.add(c.type))
	asyncio.run(
		pad.handle_message(
			{
				'left_x': 0.0,
				'left_y': -1.0,
				'right_x': 0.0,
				'right_y': 0.0,
				'ltrigger': 1.0,
				'rtrigger': 0.0,
			}
		)
	)
	return seen


# QR-49 feedback noise


def test_held_gesture_logs_once():
	from app.cv.serialization import GestureFramePayload, HandOut, LandmarkOut

	from services.input.gesture_events import GestureEventLog
	from services.input.sources.gesture_adapter import GestureAdapter

	lm = [LandmarkOut(x=0.5, y=0.5, z=0.0)] * 21

	def frame(i: int, gesture: str | None) -> GestureFramePayload:
		hands = (
			[]
			if gesture is None
			else [
				HandOut(
					handedness='RIGHT',
					gesture=gesture,
					fingers=1,
					confidence=0.95,
					speed=0.0,
					landmarks=lm,
				)
			]
		)
		return GestureFramePayload(frame_index=i, timestamp=float(i), fps=30.0, hands=hands)

	log = GestureEventLog()
	adapter = GestureAdapter(event_log=log, idle_timeout_s=1e9)
	emitted = []
	adapter.set_handler(emitted.append)

	# 5 s of MOVE_UP, a 2-frame tracking dropout, 5 s more, then 3 s of HOVER
	script = ['ONE_FINGER'] * 150 + [None] * 2 + ['ONE_FINGER'] * 150 + ['OPEN_PALM'] * 90
	for i, g in enumerate(script):
		adapter._process_payload(frame(i, g))

	history = [e['command'] for e in log.history()]
	passed = history == ['MOVE_UP', 'HOVER']

	emit(
		'QR-49',
		'R1.1.2',
		'command-history entries for 2 holds (10 s + 3 s, with a dropout)',
		actual=len(history),
		target='2 (one per hold)',
		passed=passed,
		history=history,
		frames=len(script),
		commands_sent_to_drone=len(emitted),
		method=(
			'Feeds 392 frames through the real GestureAdapter: the drone still receives a '
			'command every frame, but the operator-facing history must show one row per hold.'
		),
	)
	assert passed, f'history was {history}'
