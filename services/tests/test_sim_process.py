# tests/test_sim_process.py

import asyncio
import os
import pathlib
import signal
import stat
import sys
from unittest.mock import AsyncMock, MagicMock

import pytest

from services.drone_control import sim_process
from services.drone_control.sim_process import (
	PixelStreamLauncher,
	SimLaunchError,
	SimSettings,
	_discover,
	_find_stale_pids,
	_force_kill_pid,
	_port_open,
)

posix_only = pytest.mark.skipif(sys.platform == 'win32', reason='posix process handling')
linux_only = pytest.mark.skipif(not sys.platform.startswith('linux'), reason='needs /proc')


# Helpers


@pytest.fixture(autouse=True)
def clean_env(monkeypatch, tmp_path):
	"""
	Keep the developer's .env and shell from leaking in, and send logs to tmp.
	"""
	for key in list(os.environ):
		if key.upper().startswith('PAS_'):
			monkeypatch.delenv(key)
	monkeypatch.setattr(sim_process, 'LOG_DIR', tmp_path / 'logs')
	monkeypatch.setattr(sim_process, 'IS_WINDOWS', False)


def make_settings(**kwargs) -> SimSettings:
	return SimSettings(_env_file=None, **kwargs)


def make_ue_tree(root: pathlib.Path, bootstrapped: bool = True) -> pathlib.Path:
	"""
	Build the minimum UE package layout discovery and bootstrap look for.
	"""
	binary = root / 'Blocks' / 'Binaries' / 'Linux' / 'Blocks-Linux-Shipping'
	binary.parent.mkdir(parents=True)
	binary.write_text('#!/bin/sh\n')
	binary.chmod(0o755)

	signalling = (
		root / 'Blocks' / 'Samples' / 'PixelStreaming' / 'WebServers' / 'SignallingWebServer'
	)
	signalling.mkdir(parents=True)

	if bootstrapped:
		(signalling / 'cirrus.js').write_text('')
		(signalling / 'Public').mkdir()
		(signalling / 'Public' / 'player.html').write_text('')
		(signalling / 'node_modules').mkdir()

	return binary


def make_launcher(root: pathlib.Path, **kwargs) -> PixelStreamLauncher:
	return PixelStreamLauncher(make_settings(pas_path=str(root), **kwargs))


def fake_proc(pid: int = 1234, returncode=None):
	proc = MagicMock()
	proc.pid = pid
	proc.returncode = returncode
	proc.wait = AsyncMock(return_value=returncode)
	return proc


async def spawn_python(launcher, name: str, code: str):
	return await launcher._spawn(name, [sys.executable, '-c', code], pathlib.Path.cwd())


async def wait_for_log(name: str, text: str, timeout: float = 5.0) -> None:
	log = sim_process.LOG_DIR / f'{name}.log'
	loop = asyncio.get_running_loop()
	deadline = loop.time() + timeout
	while loop.time() < deadline:
		if log.exists() and text in log.read_text():
			return
		await asyncio.sleep(0.05)
	raise AssertionError(f'{text!r} never appeared in {log}')


# Settings


def test_settings_defaults():
	s = make_settings()

	assert s.pas_path == ''
	assert s.pas_http_port == 8080
	assert s.pas_signalling_port == 8888
	assert s.pas_services_port == 8990
	assert s.pas_node == 'node'
	assert '-RenderOffScreen' in s.pas_sim_args


def test_settings_strips_whitespace():
	s = make_settings(pas_path='  /some/path \n', pas_node=' node ')

	assert s.pas_path == '/some/path'
	assert s.pas_node == 'node'


def test_settings_reads_env(monkeypatch):
	monkeypatch.setenv('PAS_HTTP_PORT', '9000')

	assert make_settings().pas_http_port == 9000


def test_ue_root_unset_raises():
	with pytest.raises(SimLaunchError, match='PAS_PATH is not set'):
		_ = make_settings().ue_root


def test_ue_root_missing_raises(tmp_path):
	with pytest.raises(SimLaunchError, match='does not exist'):
		_ = make_settings(pas_path=str(tmp_path / 'nope')).ue_root


def test_ue_root_directory_is_used_directly(tmp_path):
	assert make_settings(pas_path=str(tmp_path)).ue_root == tmp_path.resolve()


def test_ue_root_launcher_file_uses_parent(tmp_path):
	launcher = tmp_path / 'Blocks.sh'
	launcher.write_text('')

	assert make_settings(pas_path=str(launcher)).ue_root == tmp_path.resolve()


# Discovery


def test_discover_single_match(tmp_path):
	(tmp_path / 'a' / 'thing').mkdir(parents=True)

	found = _discover(tmp_path, '*/thing', 'thing', '', lambda p: p.is_dir())

	assert found == tmp_path / 'a' / 'thing'


def test_discover_no_match_raises(tmp_path):
	with pytest.raises(SimLaunchError, match='Could not find the thing'):
		_discover(tmp_path, '*/thing', 'thing', '', lambda p: p.is_dir())


def test_discover_ambiguous_raises(tmp_path):
	(tmp_path / 'a' / 'thing').mkdir(parents=True)
	(tmp_path / 'b' / 'thing').mkdir(parents=True)

	with pytest.raises(SimLaunchError, match='Ambiguous thing'):
		_discover(tmp_path, '*/thing', 'thing', '', lambda p: p.is_dir())


def test_discover_keep_filters_matches(tmp_path):
	(tmp_path / 'a' / 'thing').mkdir(parents=True)
	(tmp_path / 'b').mkdir()
	(tmp_path / 'b' / 'thing').write_text('')

	found = _discover(tmp_path, '*/thing', 'thing', '', lambda p: p.is_dir())

	assert found == tmp_path / 'a' / 'thing'


def test_discover_override_wins(tmp_path):
	(tmp_path / 'a' / 'thing').mkdir(parents=True)
	(tmp_path / 'b' / 'thing').mkdir(parents=True)
	override = tmp_path / 'b' / 'thing'

	found = _discover(tmp_path, '*/thing', 'thing', str(override), lambda p: p.is_dir())

	assert found == override.resolve()


def test_discover_missing_override_raises(tmp_path):
	with pytest.raises(SimLaunchError, match='override does not exist'):
		_discover(tmp_path, '*/thing', 'thing', str(tmp_path / 'nope'), lambda p: p.is_dir())


# Launcher properties


def test_sim_binary_and_signalling_dir_discovered(tmp_path):
	binary = make_ue_tree(tmp_path)
	launcher = make_launcher(tmp_path)

	assert launcher.sim_binary == binary
	assert launcher.signalling_dir.name == 'SignallingWebServer'
	assert launcher.project_name == 'Blocks'


def test_sim_binary_ignores_debug_files_on_linux(tmp_path):
	binary = make_ue_tree(tmp_path)
	(binary.parent / 'Blocks-Linux-Shipping.debug').write_text('')
	(binary.parent / 'Blocks-Linux-Shipping.sym').write_text('')

	assert make_launcher(tmp_path).sim_binary == binary


def test_sim_binary_wants_exe_on_windows(tmp_path, monkeypatch):
	make_ue_tree(tmp_path)
	exe = tmp_path / 'Blocks' / 'Binaries' / 'Linux' / 'Blocks-Win64-Shipping.exe'
	exe.write_text('')
	monkeypatch.setattr(sim_process, 'IS_WINDOWS', True)

	assert make_launcher(tmp_path).sim_binary == exe


def test_sim_binary_override(tmp_path):
	make_ue_tree(tmp_path)
	other = tmp_path / 'Other' / 'Binaries' / 'Linux' / 'Other-Linux-Shipping'
	other.parent.mkdir(parents=True)
	other.write_text('')

	launcher = make_launcher(tmp_path, pas_sim_binary=str(other))

	assert launcher.sim_binary == other.resolve()
	assert launcher.project_name == 'Other'


def test_sim_binary_is_cached(tmp_path, monkeypatch):
	make_ue_tree(tmp_path)
	launcher = make_launcher(tmp_path)
	spy = MagicMock(wraps=sim_process._discover)
	monkeypatch.setattr(sim_process, '_discover', spy)

	_ = launcher.sim_binary
	_ = launcher.sim_binary
	_ = launcher.project_name

	assert spy.call_count == 1


def test_player_url_uses_http_port():
	launcher = PixelStreamLauncher(make_settings(pas_http_port=1234))

	assert launcher.player_url.startswith('http://127.0.0.1:1234/?')
	assert 'AutoConnect=true' in launcher.player_url


def test_is_running():
	launcher = PixelStreamLauncher(make_settings())
	assert launcher.is_running is False

	launcher._sim = fake_proc(returncode=None)
	assert launcher.is_running is True

	launcher._sim = fake_proc(returncode=0)
	assert launcher.is_running is False


def test_module_level_launcher():
	assert isinstance(sim_process.launcher, PixelStreamLauncher)


# Bootstrap check


@pytest.fixture
def node_on_path(monkeypatch):
	monkeypatch.setattr(sim_process.shutil, 'which', lambda name: f'/usr/bin/{name}')


def test_check_bootstrap_ok(tmp_path, node_on_path):
	binary = make_ue_tree(tmp_path)

	assert make_launcher(tmp_path)._check_bootstrap() == binary


@posix_only
def test_check_bootstrap_makes_binary_executable(tmp_path, node_on_path):
	binary = make_ue_tree(tmp_path)
	binary.chmod(0o644)

	make_launcher(tmp_path)._check_bootstrap()

	assert binary.stat().st_mode & stat.S_IXUSR


def test_check_bootstrap_unfixable_binary_raises(tmp_path, node_on_path, monkeypatch):
	make_ue_tree(tmp_path)
	monkeypatch.setattr(sim_process.os, 'access', lambda *a: False)

	with pytest.raises(SimLaunchError, match='not executable'):
		make_launcher(tmp_path)._check_bootstrap()


@pytest.mark.parametrize(
	'missing', ['cirrus.js', 'Public/player.html', 'node_modules'], ids=lambda m: m
)
def test_check_bootstrap_missing_file_raises(tmp_path, node_on_path, missing):
	make_ue_tree(tmp_path)
	launcher = make_launcher(tmp_path)
	target = launcher.signalling_dir / missing
	if target.is_dir():
		target.rmdir()
	else:
		target.unlink()

	with pytest.raises(SimLaunchError, match='not bootstrapped'):
		launcher._check_bootstrap()


def test_check_bootstrap_no_node_raises(tmp_path, monkeypatch):
	make_ue_tree(tmp_path)
	monkeypatch.setattr(sim_process.shutil, 'which', lambda name: None)

	with pytest.raises(SimLaunchError, match='not on PATH'):
		make_launcher(tmp_path, pas_node='nodey')._check_bootstrap()


def test_check_bootstrap_bad_pas_path_raises():
	with pytest.raises(SimLaunchError, match='PAS_PATH is not set'):
		PixelStreamLauncher(make_settings())._check_bootstrap()


# Lifecycle


def stub_lifecycle(launcher, monkeypatch):
	calls = []
	binary = pathlib.Path('/fake/binary')

	def check():
		calls.append('bootstrap')
		return binary

	async def sweep(b):
		calls.append(('sweep', b))

	async def cirrus():
		calls.append('cirrus')
		launcher._cirrus = fake_proc(pid=1)

	async def sim(b):
		calls.append(('sim', b))
		launcher._sim = fake_proc(pid=2)

	monkeypatch.setattr(launcher, '_check_bootstrap', check)
	monkeypatch.setattr(launcher, '_sweep_orphans', sweep)
	monkeypatch.setattr(launcher, '_start_cirrus', cirrus)
	monkeypatch.setattr(launcher, '_start_sim', sim)
	return calls, binary


async def test_start_runs_steps_in_order(monkeypatch):
	launcher = PixelStreamLauncher(make_settings())
	calls, binary = stub_lifecycle(launcher, monkeypatch)

	await launcher.start()

	assert calls == ['bootstrap', ('sweep', binary), 'cirrus', ('sim', binary)]
	assert launcher.is_running


async def test_start_is_noop_when_running(monkeypatch):
	launcher = PixelStreamLauncher(make_settings())
	calls, _ = stub_lifecycle(launcher, monkeypatch)
	launcher._sim = fake_proc()

	await launcher.start()

	assert calls == []


async def test_start_bootstrap_failure_spawns_nothing(monkeypatch):
	launcher = PixelStreamLauncher(make_settings())
	calls, _ = stub_lifecycle(launcher, monkeypatch)
	monkeypatch.setattr(launcher, '_check_bootstrap', MagicMock(side_effect=SimLaunchError('nope')))

	with pytest.raises(SimLaunchError, match='nope'):
		await launcher.start()

	assert calls == []


@pytest.mark.parametrize('error', [SimLaunchError('boom'), asyncio.CancelledError()])
async def test_start_failure_tears_down(monkeypatch, error):
	launcher = PixelStreamLauncher(make_settings())
	stub_lifecycle(launcher, monkeypatch)
	monkeypatch.setattr(launcher, '_start_sim', AsyncMock(side_effect=error))
	teardown = AsyncMock()
	monkeypatch.setattr(launcher, '_teardown', teardown)

	with pytest.raises(type(error)):
		await launcher.start()

	teardown.assert_awaited_once()


async def test_stop_with_nothing_running():
	launcher = PixelStreamLauncher(make_settings())

	assert await launcher.stop() is False


async def test_stop_kills_both_and_clears(monkeypatch):
	launcher = PixelStreamLauncher(make_settings())
	sim, cirrus = fake_proc(pid=2), fake_proc(pid=1)
	launcher._sim, launcher._cirrus = sim, cirrus
	kill = AsyncMock()
	monkeypatch.setattr(launcher, '_kill_tree', kill)

	assert await launcher.stop() is True

	kill.assert_any_await(sim, 'sim')
	kill.assert_any_await(cirrus, 'cirrus')
	assert launcher._sim is None
	assert launcher._cirrus is None


async def test_sweep_orphans_kills_every_stale_pid(monkeypatch):
	monkeypatch.setattr(sim_process, '_find_stale_pids', AsyncMock(return_value=[11, 22]))
	kill = AsyncMock()
	monkeypatch.setattr(sim_process, '_force_kill_pid', kill)

	await PixelStreamLauncher(make_settings())._sweep_orphans(pathlib.Path('/x'))

	assert [c.args[0] for c in kill.await_args_list] == [11, 22]


# Starting cirrus and the sim


async def test_start_cirrus_argv(tmp_path, monkeypatch, node_on_path):
	make_ue_tree(tmp_path)
	launcher = make_launcher(tmp_path, pas_http_port=81, pas_signalling_port=82)
	proc = fake_proc()
	spawn = AsyncMock(return_value=proc)
	await_port = AsyncMock()
	monkeypatch.setattr(launcher, '_spawn', spawn)
	monkeypatch.setattr(launcher, '_await_port', await_port)

	await launcher._start_cirrus()

	name, argv, cwd = spawn.await_args.args
	assert name == 'cirrus'
	assert argv == [
		'/usr/bin/node',
		str(launcher.signalling_dir / 'cirrus.js'),
		'--HttpPort=81',
		'--StreamerPort=82',
		'--PublicIp=127.0.0.1',
	]
	assert cwd == sim_process.LOG_DIR
	assert spawn.await_args.kwargs['env'] == {'ELECTRON_RUN_AS_NODE': '1'}
	await_port.assert_awaited_once_with(82, sim_process.SIGNALLING_READY_TIMEOUT_S, proc, 'cirrus')
	assert launcher._cirrus is proc


async def test_start_sim_argv(tmp_path, monkeypatch):
	binary = make_ue_tree(tmp_path)
	launcher = make_launcher(
		tmp_path, pas_signalling_port=82, pas_services_port=83, pas_sim_args='-A "-B=x y"'
	)
	proc = fake_proc()
	spawn = AsyncMock(return_value=proc)
	await_port = AsyncMock()
	monkeypatch.setattr(launcher, '_spawn', spawn)
	monkeypatch.setattr(launcher, '_await_port', await_port)

	await launcher._start_sim(binary)

	name, argv, cwd = spawn.await_args.args
	assert name == 'sim'
	assert argv == [
		str(binary),
		'Blocks',
		'-PixelStreamingURL=ws://127.0.0.1:82',
		'-Unattended',
		'-NoSound',
		'-A',
		'-B=x y',
	]
	assert cwd == tmp_path.resolve()
	await_port.assert_awaited_once_with(83, sim_process.SIM_READY_TIMEOUT_S, proc, 'sim')
	assert launcher._sim is proc


# Spawning


@posix_only
async def test_spawn_logs_to_file_and_merges_env():
	launcher = PixelStreamLauncher(make_settings())

	proc = await launcher._spawn(
		'child',
		[sys.executable, '-c', 'import os; print(os.environ["GBDC_TEST"])'],
		pathlib.Path.cwd(),
		env={'GBDC_TEST': 'hello'},
	)
	await proc.wait()

	assert proc.returncode == 0
	assert (sim_process.LOG_DIR / 'child.log').read_text().strip() == 'hello'


@posix_only
async def test_spawn_child_leads_its_own_session():
	launcher = PixelStreamLauncher(make_settings())

	proc = await spawn_python(launcher, 'leader', 'import time; time.sleep(5)')
	try:
		assert os.getsid(proc.pid) == proc.pid
		assert os.getsid(proc.pid) != os.getsid(0)
	finally:
		proc.kill()
		await proc.wait()


async def test_spawn_adopts_into_job_on_windows(monkeypatch):
	monkeypatch.setattr(sim_process, 'IS_WINDOWS', True)
	adopt = MagicMock()
	monkeypatch.setattr(sim_process, '_adopt', adopt, raising=False)
	monkeypatch.setattr(
		sim_process.asyncio, 'create_subprocess_exec', AsyncMock(return_value=fake_proc(pid=77))
	)

	await PixelStreamLauncher(make_settings())._spawn('x', ['x'], pathlib.Path.cwd())

	adopt.assert_called_once_with(77)


# Waiting for ports


async def test_await_port_returns_when_open(monkeypatch):
	monkeypatch.setattr(sim_process, '_port_open', AsyncMock(side_effect=[False, False, True]))
	monkeypatch.setattr(sim_process, 'READY_POLL_INTERVAL_S', 0)

	await PixelStreamLauncher(make_settings())._await_port(1, 5, fake_proc(), 'sim')


async def test_await_port_raises_when_child_exits(monkeypatch):
	sim_process.LOG_DIR.mkdir(parents=True)
	(sim_process.LOG_DIR / 'sim.log').write_text('LogPak: missing pak file\n')
	monkeypatch.setattr(sim_process, '_port_open', AsyncMock(return_value=False))

	with pytest.raises(SimLaunchError, match='exited with code 3') as err:
		await PixelStreamLauncher(make_settings())._await_port(1, 5, fake_proc(returncode=3), 'sim')

	assert 'missing pak file' in str(err.value)


async def test_await_port_times_out(monkeypatch):
	monkeypatch.setattr(sim_process, '_port_open', AsyncMock(return_value=False))
	monkeypatch.setattr(sim_process, 'READY_POLL_INTERVAL_S', 0.01)

	with pytest.raises(SimLaunchError, match='did not open port 1234'):
		await PixelStreamLauncher(make_settings())._await_port(1234, 0.05, fake_proc(), 'sim')


async def test_port_open_true_for_listening_socket():
	server = await asyncio.start_server(lambda r, w: w.close(), '127.0.0.1', 0)
	port = server.sockets[0].getsockname()[1]
	try:
		assert await _port_open(port) is True
	finally:
		server.close()
		await server.wait_closed()


async def test_port_open_false_for_closed_port():
	server = await asyncio.start_server(lambda r, w: w.close(), '127.0.0.1', 0)
	port = server.sockets[0].getsockname()[1]
	server.close()
	await server.wait_closed()

	assert await _port_open(port) is False


# Log tail


def test_log_tail_returns_last_lines():
	sim_process.LOG_DIR.mkdir(parents=True)
	(sim_process.LOG_DIR / 'sim.log').write_text('\n'.join(f'line {i}' for i in range(40)))

	tail = PixelStreamLauncher._log_tail('sim', lines=3)

	assert tail == 'Last output:\nline 37\nline 38\nline 39'


def test_log_tail_default_is_15_lines():
	sim_process.LOG_DIR.mkdir(parents=True)
	(sim_process.LOG_DIR / 'sim.log').write_text('\n'.join(str(i) for i in range(40)))

	assert len(PixelStreamLauncher._log_tail('sim').splitlines()) == 16


def test_log_tail_missing_log():
	assert PixelStreamLauncher._log_tail('ghost').startswith('(no log at ')


# Killing


@pytest.mark.parametrize('proc', [None, fake_proc(returncode=0)], ids=['none', 'exited'])
async def test_kill_tree_noop(monkeypatch, proc):
	killpg = MagicMock()
	monkeypatch.setattr(sim_process.os, 'killpg', killpg)

	await PixelStreamLauncher(make_settings())._kill_tree(proc, 'sim')

	killpg.assert_not_called()


@posix_only
async def test_kill_tree_sigterm_is_enough():
	launcher = PixelStreamLauncher(make_settings())
	proc = await spawn_python(launcher, 'polite', 'import time; time.sleep(30)')

	await launcher._kill_tree(proc, 'polite')

	assert proc.returncode == -signal.SIGTERM


@posix_only
async def test_kill_tree_escalates_to_sigkill(monkeypatch):
	monkeypatch.setattr(sim_process, 'TERM_GRACE_S', 0.2)
	launcher = PixelStreamLauncher(make_settings())
	proc = await spawn_python(
		launcher,
		'stubborn',
		'import signal, time\n'
		'signal.signal(signal.SIGTERM, signal.SIG_IGN)\n'
		'print("ready", flush=True)\n'
		'time.sleep(30)',
	)
	await wait_for_log('stubborn', 'ready')

	await launcher._kill_tree(proc, 'stubborn')

	assert proc.returncode == -signal.SIGKILL


async def test_kill_tree_signals_process_group(monkeypatch):
	killpg = MagicMock()
	monkeypatch.setattr(sim_process.os, 'killpg', killpg)
	proc = fake_proc(pid=555)

	await PixelStreamLauncher(make_settings())._kill_tree(proc, 'sim')

	killpg.assert_called_once_with(555, signal.SIGTERM)


async def test_kill_tree_tolerates_vanished_group(monkeypatch):
	monkeypatch.setattr(sim_process.os, 'killpg', MagicMock(side_effect=ProcessLookupError))
	monkeypatch.setattr(sim_process, 'TERM_GRACE_S', 0.01)
	monkeypatch.setattr(sim_process, 'KILL_GRACE_S', 0.01)
	proc = fake_proc()

	async def never_exits():
		await asyncio.sleep(1)

	proc.wait = AsyncMock(side_effect=never_exits)

	await PixelStreamLauncher(make_settings())._kill_tree(proc, 'sim')

	assert sim_process.os.killpg.call_count == 2


async def test_kill_tree_uses_taskkill_on_windows(monkeypatch):
	monkeypatch.setattr(sim_process, 'IS_WINDOWS', True)
	exec_ = AsyncMock(return_value=fake_proc(returncode=0))
	monkeypatch.setattr(sim_process.asyncio, 'create_subprocess_exec', exec_)
	proc = fake_proc(pid=42)

	await PixelStreamLauncher(make_settings())._kill_tree(proc, 'sim')

	assert exec_.await_args.args == ('taskkill', '/PID', '42', '/T', '/F')
	proc.wait.assert_awaited()


# Orphan housekeeping


async def test_force_kill_pid_posix(monkeypatch):
	monkeypatch.setattr(sim_process.os, 'getpgid', lambda pid: 900, raising=False)
	killpg = MagicMock()
	monkeypatch.setattr(sim_process.os, 'killpg', killpg, raising=False)

	await _force_kill_pid(123)

	killpg.assert_called_once_with(900, signal.SIGKILL)


async def test_force_kill_pid_posix_ignores_missing_process(monkeypatch):
	monkeypatch.setattr(
		sim_process.os, 'getpgid', MagicMock(side_effect=ProcessLookupError), raising=False
	)

	await _force_kill_pid(123)


async def test_force_kill_pid_windows(monkeypatch):
	monkeypatch.setattr(sim_process, 'IS_WINDOWS', True)
	killer = fake_proc(returncode=0)
	exec_ = AsyncMock(return_value=killer)
	monkeypatch.setattr(sim_process.asyncio, 'create_subprocess_exec', exec_)

	await _force_kill_pid(123)

	assert exec_.await_args.args == ('taskkill', '/PID', '123', '/T', '/F')
	killer.wait.assert_awaited_once()


@linux_only
async def test_find_stale_pids_finds_matching_exe():
	own_exe = pathlib.Path(os.readlink('/proc/self/exe'))

	assert os.getpid() in await _find_stale_pids(own_exe)


@linux_only
async def test_find_stale_pids_no_match(tmp_path):
	assert await _find_stale_pids(tmp_path / 'not-a-running-binary') == []


async def test_find_stale_pids_windows_parses_tasklist(monkeypatch):
	monkeypatch.setattr(sim_process, 'IS_WINDOWS', True)
	out = (
		b'"Blocks-Win64-Shipping.exe","4321","Console","1","1,024 K"\r\n'
		b'"Blocks-Win64-Shipping.exe","8765","Console","1","2,048 K"\r\n'
	)
	tasklist = fake_proc()
	tasklist.communicate = AsyncMock(return_value=(out, b''))
	exec_ = AsyncMock(return_value=tasklist)
	monkeypatch.setattr(sim_process.asyncio, 'create_subprocess_exec', exec_)

	pids = await _find_stale_pids(pathlib.Path('C:/sim/Blocks-Win64-Shipping.exe'))

	assert pids == [4321, 8765]
	assert 'IMAGENAME eq Blocks-Win64-Shipping.exe' in exec_.await_args.args


async def test_find_stale_pids_windows_no_tasks(monkeypatch):
	monkeypatch.setattr(sim_process, 'IS_WINDOWS', True)
	tasklist = fake_proc()
	tasklist.communicate = AsyncMock(
		return_value=(b'INFO: No tasks are running which match the specified criteria.\r\n', b'')
	)
	monkeypatch.setattr(
		sim_process.asyncio, 'create_subprocess_exec', AsyncMock(return_value=tasklist)
	)

	assert await _find_stale_pids(pathlib.Path('C:/sim/x.exe')) == []
