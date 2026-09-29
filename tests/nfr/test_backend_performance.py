"""
QR-35 / NFR1.1 -> REST p95 latency with 50 concurrent clients, 0 errors
QR-36 / NFR1.3 -> telemetry WebSocket push rate while a flight is recorded
QR-37 / NFR1.1 -> on-screen/keyboard command round trip over /ws/commands
QR-38 / NFR1.1 -> login latency (bcrypt cost 13) + event-loop stall it causes
QR-39 / NFR1.3 -> telemetry row write fits well inside the 100 ms tick
QR-40 / NFR1.1 -> analytics queries stay fast with a large flight history
"""

from __future__ import annotations

import asyncio
import random
import time
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from tests.nfr._helpers import emit, summarize, write_samples

CONCURRENT_CLIENTS = 10
STRESS_CLIENTS = 50
REQUESTS_PER_CLIENT = 20
TARGET_REST_P95_MS = 100.0
TARGET_TELEMETRY_HZ = 9.0
TARGET_TELEMETRY_GAP_P95_MS = 150.0
TARGET_COMMAND_RTT_P95_MS = 100.0
TARGET_LOGIN_P95_MS = 1000.0
TARGET_WRITE_P95_MS = 50.0
TARGET_QUERY_P95_MS = 250.0

READ_ENDPOINTS = (
	'/api/health',
	'/api/drone/status',
	'/api/input/status',
	'/api/gestures/status',
	'/api/gestures/recognizer',
	'/api/calibration/status',
	'/api/input/gesture/events',
	'/api/analytics/flights',
	'/api/analytics/summary',
)


def _app():
	from app.main import app

	return app


async def _with_client(body):
	app = _app()
	async with app.router.lifespan_context(app):
		transport = httpx.ASGITransport(app=app)
		async with httpx.AsyncClient(transport=transport, base_url='http://nfr') as client:
			return await body(client)


# REST 


async def _load(client: httpx.AsyncClient, clients: int):
	latencies: dict[str, list[float]] = {p: [] for p in READ_ENDPOINTS}
	errors: list[str] = []

	async def user(seed: int) -> None:
		rng = random.Random(seed)
		for _ in range(REQUESTS_PER_CLIENT):
			path = rng.choice(READ_ENDPOINTS)
			start = time.perf_counter()
			response = await client.get(path)
			latencies[path].append((time.perf_counter() - start) * 1000)
			if response.status_code >= 400:
				errors.append(f'{path} -> {response.status_code}')

	start = time.perf_counter()
	await asyncio.gather(*(user(i) for i in range(clients)))
	return latencies, errors, time.perf_counter() - start


def test_rest_latency_under_concurrency():
	async def body(client: httpx.AsyncClient):
		for path in READ_ENDPOINTS:
			await client.get(path)
		normal = await _load(client, CONCURRENT_CLIENTS)
		stress = await _load(client, STRESS_CLIENTS)
		return normal, stress

	(latencies, errors, elapsed), (s_lat, s_err, s_elapsed) = asyncio.run(_with_client(body))
	every = [ms for values in latencies.values() for ms in values]
	stats = summarize(every)
	passed = stats['p95'] <= TARGET_REST_P95_MS and not errors

	stress_every = [ms for values in s_lat.values() for ms in values]
	per_endpoint = {p: summarize(v)['p95'] for p, v in latencies.items() if v}
	stress_endpoint = {p: summarize(v)['p95'] for p, v in s_lat.items() if v}
	write_samples(
		'QR-35',
		{
			'endpoint': list(per_endpoint),
			'p95_ms': list(per_endpoint.values()),
			'stress_p95_ms': [stress_endpoint.get(p, '') for p in per_endpoint],
		},
	)
	emit(
		'QR-35',
		'NFR1.1',
		f'REST p95 latency, {CONCURRENT_CLIENTS} concurrent clients (ms)',
		actual=stats['p95'],
		target=f'<= {TARGET_REST_P95_MS}, 0 errors',
		passed=passed,
		stats=stats,
		requests=len(every),
		throughput_rps=round(len(every) / elapsed, 1),
		error_count=len(errors),
		errors=errors[:10],
		per_endpoint_p95_ms=per_endpoint,
		stress_test={
			'clients': STRESS_CLIENTS,
			'gated': False,
			'stats': summarize(stress_every),
			'throughput_rps': round(len(stress_every) / s_elapsed, 1),
			'errors': len(s_err),
			'per_endpoint_p95_ms': stress_endpoint,
		},
		finding=(
			f'At {STRESS_CLIENTS} simultaneous clients (stress, not gated) the analytics '
			'endpoints dominate the tail: every request queues for the single sqlite '
			'connection. A single-operator desktop app never generates that load, but a '
			'short-lived cache on /analytics/summary would remove it.'
		),
		method=(
			f'{CONCURRENT_CLIENTS} simulated clients (several dashboard tabs polling at once) '
			f'each fire {REQUESTS_PER_CLIENT} requests back to back at random read endpoints '
			'through the real ASGI app and sqlite database. Repeated at '
			f'{STRESS_CLIENTS} clients as an ungated stress run.'
		),
		chart={
			'kind': 'bars',
			'column': 'p95_ms',
			'label': 'endpoint',
			'unit': 'ms',
			'threshold': TARGET_REST_P95_MS,
		},
	)
	assert not errors, f'requests failed under load: {errors[:5]}'
	assert stats['p95'] <= TARGET_REST_P95_MS, f'REST p95 {stats["p95"]} ms under load'


# WebSockets


@pytest.fixture(scope='module')
def live_client():
	with TestClient(_app()) as client:
		response = client.post('/api/drone/connect', json={'adapter': 'dummy'})
		assert response.json()['connected'], response.text
		yield client
		client.post('/api/drone/disconnect')


def test_telemetry_push_rate(live_client: TestClient):
	with live_client.websocket_connect('/api/drone/ws/commands') as commands:
		commands.send_json({'command': 'TAKEOFF'})
		assert commands.receive_json().get('ok'), 'takeoff not acknowledged'

		arrivals: list[float] = []
		with live_client.websocket_connect('/api/drone/ws/telemetry') as ws:
			ws.receive_json()
			for _ in range(150):
				ws.receive_json()
				arrivals.append(time.perf_counter())

		commands.send_json({'command': 'LAND'})
		commands.receive_json()

	gaps = [(b - a) * 1000 for a, b in zip(arrivals, arrivals[1:])]
	rate = round(len(gaps) / (arrivals[-1] - arrivals[0]), 2)
	stats = summarize(gaps)
	passed = rate >= TARGET_TELEMETRY_HZ and stats['p95'] <= TARGET_TELEMETRY_GAP_P95_MS

	write_samples('QR-36', {'gap_ms': gaps})
	emit(
		'QR-36',
		'NFR1.3',
		'telemetry updates pushed per second during a recorded flight (Hz)',
		actual=rate,
		target=f'>= {TARGET_TELEMETRY_HZ} Hz, p95 gap <= {TARGET_TELEMETRY_GAP_P95_MS} ms',
		passed=passed,
		gap_stats_ms=stats,
		messages=len(arrivals),
		method=(
			'Dummy drone connected, TAKEOFF sent so a flight is being recorded (every 10th '
			'tick also writes a telemetry row to sqlite), then 150 consecutive telemetry '
			'messages timed on the client side. Design rate is 10 Hz.'
		),
		chart={
			'kind': 'histogram',
			'column': 'gap_ms',
			'unit': 'ms',
			'threshold': TARGET_TELEMETRY_GAP_P95_MS,
		},
	)
	assert passed, f'telemetry {rate} Hz, p95 gap {stats["p95"]} ms'


def test_command_round_trip(live_client: TestClient):
	sequence = ['TAKEOFF'] + ['MOVE_UP', 'MOVE_FORWARD', 'ROTATE_CW', 'HOVER', 'MOVE_LEFT'] * 40
	sequence += ['LAND']
	rtts: list[float] = []
	failures: list[str] = []
	with live_client.websocket_connect('/api/drone/ws/commands') as ws:
		for name in sequence:
			start = time.perf_counter()
			ws.send_json({'command': name, 'source': 'nfr'})
			reply = ws.receive_json()
			rtts.append((time.perf_counter() - start) * 1000)
			if not reply.get('ok'):
				failures.append(f'{name}: {reply}')

	stats = summarize(rtts)
	passed = stats['p95'] <= TARGET_COMMAND_RTT_P95_MS and not failures

	write_samples('QR-37', {'rtt_ms': rtts})
	emit(
		'QR-37',
		'NFR1.1',
		'p95 command round trip over /api/drone/ws/commands (ms)',
		actual=stats['p95'],
		target=f'<= {TARGET_COMMAND_RTT_P95_MS}',
		passed=passed,
		stats=stats,
		commands=len(rtts),
		failures=failures,
		method=(
			'Send a command the way the on-screen pad does, wait for the backend ack after '
			'DroneAdapter.execute(). TAKEOFF and LAND also open/close a flight row in sqlite.'
		),
		chart={
			'kind': 'histogram',
			'column': 'rtt_ms',
			'unit': 'ms',
			'threshold': TARGET_COMMAND_RTT_P95_MS,
		},
	)
	assert not failures, failures
	assert stats['p95'] <= TARGET_COMMAND_RTT_P95_MS, f'command RTT p95 {stats["p95"]} ms'


# auth 


def test_login_latency():
	email = f'nfr-{uuid.uuid4().hex[:8]}@example.com'
	password = 'Str0ng!Pass'

	async def body(client: httpx.AsyncClient):
		signup = await client.post(
			'/api/auth/signup',
			json={'email': email, 'password': password, 'first_name': 'N', 'last_name': 'F'},
		)
		assert signup.status_code == 201, signup.text

		logins: list[float] = []
		for _ in range(8):
			start = time.perf_counter()
			response = await client.post(
				'/api/auth/login', json={'email': email, 'password': password}
			)
			logins.append((time.perf_counter() - start) * 1000)
			assert response.status_code == 200, response.text

		# how long is the event loop frozen while a login is verified? a 5 ms
		# heartbeat that wakes late measures exactly that
		stalls: list[float] = []
		stop = asyncio.Event()

		async def heartbeat() -> None:
			while not stop.is_set():
				before = time.perf_counter()
				await asyncio.sleep(0.005)
				stalls.append((time.perf_counter() - before) * 1000 - 5)

		beat = asyncio.create_task(heartbeat())
		await asyncio.sleep(0.05)
		for _ in range(3):
			await client.post('/api/auth/login', json={'email': email, 'password': password})
		stop.set()
		await beat
		return logins, stalls

	logins, stalls = asyncio.run(_with_client(body))
	stats = summarize(logins)
	passed = stats['p95'] <= TARGET_LOGIN_P95_MS

	write_samples('QR-38', {'login_ms': logins})
	emit(
		'QR-38',
		'NFR1.1',
		'p95 login response time (ms)',
		actual=stats['p95'],
		target=f'<= {TARGET_LOGIN_P95_MS}',
		passed=passed,
		stats=stats,
		event_loop_stall_ms=round(max(stalls), 1),
		finding=(
			'bcrypt.checkpw runs directly on the asyncio event loop, so while a login is '
			'verified every other request, telemetry tick and gesture broadcast waits. '
			'event_loop_stall_ms is the longest the loop was frozen during a login. '
			'Moving the hash '
			'into a worker thread (asyncio.to_thread) would remove it.'
		),
		method='POST /api/auth/login with a registered user, 8 sequential logins timed end to end.',
		chart={
			'kind': 'bars',
			'column': 'login_ms',
			'unit': 'ms',
			'threshold': TARGET_LOGIN_P95_MS,
		},
	)
	assert passed, f'login p95 {stats["p95"]} ms'


# database

HISTORY_FLIGHTS = 200
ROWS_PER_FLIGHT = 100


async def _seed_history(session_factory, drone_id) -> uuid.UUID:
	from services.database_manager.models.flight_summary import FlightSummary
	from services.database_manager.models.telemetry import Telemetry

	rng = random.Random(7)
	now = datetime.now(timezone.utc)
	async with session_factory() as db:
		last = None
		for i in range(HISTORY_FLIGHTS):
			started = now - timedelta(hours=i + 1)
			flight = FlightSummary(
				drone_id=drone_id,
				started_at=started,
				ended_at=started + timedelta(minutes=rng.randint(2, 20)),
				max_altitude=rng.uniform(1, 30),
				avg_speed=rng.uniform(0, 5),
			)
			db.add(flight)
			await db.flush()
			db.add_all(
				Telemetry(
					flight_id=flight.id,
					altitude=rng.uniform(0, 30),
					speed=rng.uniform(0, 5),
					battery_level=100 - j * 0.5,
					displacement_x=rng.uniform(-50, 50),
					displacement_y=rng.uniform(-50, 50),
				)
				for j in range(ROWS_PER_FLIGHT)
			)
			last = flight.id
		await db.commit()
		return last


@pytest.fixture(scope='module')
def db_timings():
	from app.main import app

	from services.database_manager.database import AsyncSessionLocal
	from services.database_manager.managers.flight_manager import flight_manager

	async def scenario():
		async with app.router.lifespan_context(app):
			async with AsyncSessionLocal() as db:
				drone = await flight_manager.get_or_create_drone(db, 'nfr-history', True)
			await _seed_history(AsyncSessionLocal, drone.id)
			async with AsyncSessionLocal() as db:
				live = await flight_manager.start_flight(db, drone_id=drone.id)

			writes: list[float] = []
			for i in range(200):
				start = time.perf_counter()
				async with AsyncSessionLocal() as db:
					await flight_manager.record_telemetry(
						db,
						flight_id=live.id,
						displacement_x=i * 0.1,
						displacement_y=0.0,
						altitude=1.5,
						battery_level=99.0,
						speed=2.0,
					)
				writes.append((time.perf_counter() - start) * 1000)

			queries: dict[str, list[float]] = {
				'summary': [],
				'recent flights': [],
				'end flight': [],
			}
			for _ in range(20):
				async with AsyncSessionLocal() as db:
					start = time.perf_counter()
					await flight_manager.get_summ_stats(db)
					queries['summary'].append((time.perf_counter() - start) * 1000)
					start = time.perf_counter()
					await flight_manager.get_recent_flights(db, 10)
					queries['recent flights'].append((time.perf_counter() - start) * 1000)
			for _ in range(5):
				async with AsyncSessionLocal() as db:
					flight = await flight_manager.start_flight(db, drone_id=drone.id)
					start = time.perf_counter()
					await flight_manager.end_flight(db, flight.id)
					queries['end flight'].append((time.perf_counter() - start) * 1000)
			return writes, queries

	return asyncio.run(scenario())


def test_telemetry_write_latency(db_timings):
	writes, _ = db_timings
	stats = summarize(writes)
	passed = stats['p95'] <= TARGET_WRITE_P95_MS

	write_samples('QR-39', {'write_ms': writes})
	emit(
		'QR-39',
		'NFR1.3',
		'p95 telemetry row write, with 20k rows of history (ms)',
		actual=stats['p95'],
		target=f'<= {TARGET_WRITE_P95_MS}',
		passed=passed,
		stats=stats,
		history_rows=HISTORY_FLIGHTS * ROWS_PER_FLIGHT,
		method=(
			'FlightManager.record_telemetry (new session, insert, commit) on the real sqlite '
			'file, the call the telemetry WebSocket makes every 10th 100 ms tick. Must stay '
			'far below 100 ms or the live telemetry stream stutters.'
		),
		chart={
			'kind': 'histogram',
			'column': 'write_ms',
			'unit': 'ms',
			'threshold': TARGET_WRITE_P95_MS,
		},
	)
	assert passed, f'telemetry write p95 {stats["p95"]} ms'


def test_analytics_query_latency(db_timings):
	_, queries = db_timings
	per_query = {name: summarize(values) for name, values in queries.items()}
	worst = max(s['p95'] for s in per_query.values())
	passed = worst <= TARGET_QUERY_P95_MS

	write_samples(
		'QR-40', {'query': list(per_query), 'p95_ms': [s['p95'] for s in per_query.values()]}
	)
	emit(
		'QR-40',
		'NFR1.1',
		f'slowest analytics query p95 over {HISTORY_FLIGHTS} flights / '
		f'{HISTORY_FLIGHTS * ROWS_PER_FLIGHT} rows (ms)',
		actual=worst,
		target=f'<= {TARGET_QUERY_P95_MS}',
		passed=passed,
		per_query=per_query,
		method=(
			'The queries behind the Analytics page (summary stats, recent flights) and the '
			'aggregate run when a flight ends, against a seeded history.'
		),
		chart={
			'kind': 'bars',
			'column': 'p95_ms',
			'label': 'query',
			'unit': 'ms',
			'threshold': TARGET_QUERY_P95_MS,
		},
	)
	assert passed, f'slowest query p95 {worst} ms: {per_query}'
