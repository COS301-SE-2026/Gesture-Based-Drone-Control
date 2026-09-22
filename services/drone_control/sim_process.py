from __future__ import annotations

import asyncio
import contextlib
import functools
import logging
import os
import pathlib
import shlex
import shutil
import signal
import subprocess
import sys
import tempfile

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

IS_WINDOWS = sys.platform == 'win32'

SIM_BINARY_GLOB = '*/Binaries/*/*-Shipping*'
SIGNALLING_GLOB = '*/Samples/PixelStreaming/WebServers/SignallingWebServer'

SIGNALLING_READY_TIMEOUT_S = 15.0
SIM_READY_TIMEOUT_S = 150.0
READY_POLL_INTERVAL_S = 0.5

TERM_GRACE_S = 5.0
KILL_GRACE_S = 2.0

LOG_DIR = pathlib.Path(tempfile.gettempdir()) / 'gbdc-pixelstream'


class SimLaunchError(RuntimeError):
    """The simulator or its signalling server could not be started."""


# PLATFORM DETECTION

if IS_WINDOWS:
    import win32api
    import win32con
    import win32job

    def _create_kill_on_close_job():
        """
        job objects are windows only set of processes the kernel manages together (stupid windows)
        """
        try:
            job = win32job.CreateJobObject(None, '')
            info = win32job.QueryInformationJobObject(
                job, win32job.JobObjectExtendedLimitInformation
            )
            info['BasicLimitInformation']['LimitFlags'] |= (
                win32job.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            )
            win32job.SetInformationJobObject(
                job, win32job.JobObjectExtendedLimitInformation, info
            )
            return job
        except Exception:
            logger.exception('PixelStreamLauncher: could not create windows job object')
            return None

    _JOB = _create_kill_on_close_job()

    def _adopt(pid: int) -> None:
        if _JOB is None:
            return

        try:
            handle = win32api.OpenProcess(
                win32con.PROCESS_SET_QUOTA | win32con.PROCESS_TERMINATE, False, pid
            )
            try:
                win32job.AssignProcessToJobObject(_JOB, handle)
            finally:
                win32api.CloseHandle(handle)

        except Exception:
            logger.exception('PixelStreamLauncher: could not adopt pid %d into the job', pid)

    _SPAWN_KWARGS: dict = {
        'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP,
    }
else:
    import ctypes
    import ctypes.util

    _PR_SET_PDEATHSIG = 1
    try:
        _libc = ctypes.CDLL(ctypes.util.find_library('c'), use_errno=True)
    except Exception:
        _libc = None

    def _die_with_parent() -> None:
        if _libc is not None:
            _libc.prctl(_PR_SET_PDEATHSIG, signal.SIGKILL, 0, 0, 0, 0)

    _SPAWN_KWARGS = {
        'start_new_session': True,
        'preexec_fn': _die_with_parent,
    }


# ORPHAN HOUSEKEEPING
#
# module level, not inside the platform branch above: each of these has to
# exist on both platforms, and each picks its own mechanism internally.

async def _force_kill_pid(pid: int) -> None:
    if IS_WINDOWS:
        proc = await asyncio.create_subprocess_exec(
            'taskkill', '/PID', str(pid), '/T', '/F',
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
        )
        await proc.wait()
    else:
        with contextlib.suppress(OSError):
            os.killpg(os.getpgid(pid), signal.SIGKILL)


async def _find_stale_pids(binary: pathlib.Path) -> list[int]:
    found: list[int] = []

    if IS_WINDOWS:
        proc = await asyncio.create_subprocess_exec(
            'tasklist', '/FI', f'IMAGENAME eq {binary.name}', '/FO', 'CSV', '/NH',
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        out, _ = await proc.communicate()
        for line in out.decode(errors='replace').splitlines():
            parts = [p.strip('"') for p in line.split('","')]
            if len(parts) > 1 and parts[1].isdigit():
                found.append(int(parts[1]))

        return found

    target = str(binary)
    with os.scandir('/proc') as entries:
        for entry in entries:
            if not entry.name.isdigit():
                continue
            with contextlib.suppress(OSError):
                if os.readlink(f'/proc/{entry.name}/exe') == target:
                    found.append(int(entry.name))
    return found


def _discover(
    root: pathlib.Path, glob: str, what: str, override: str, keep
) -> pathlib.Path:
    if override:
        chosen = pathlib.Path(override).expanduser().resolve()
        if not keep(chosen):
            raise SimLaunchError(f'{what} override does not exist: {chosen}')
        return chosen

    matches = sorted(p for p in root.glob(glob) if keep(p))

    if not matches:
        raise SimLaunchError(
            f'Could not find the {what} under {root} (looked for {glob}). '
            'Check PAS_PATH or set the override in .env'
        )

    if len(matches) > 1:
        listed = ', '.join(str(m) for m in matches)
        raise SimLaunchError(
            f'Ambiguous {what} under {root}: {listed}. Set the override in .env'
        )

    return matches[0]


# SETTINGS

class SimSettings(BaseSettings):
    pas_path: str = ''
    pas_http_port: int = 8080
    pas_signalling_port: int = 8888
    pas_services_port: int = 8990
    pas_node: str = 'node'
    pas_sim_args: str = '-PixelStreamingEncoderCodec=VP8 -windowed -ResX=1280 -ResY=720'
    pas_sim_binary: str = ''
    pas_signalling_dir: str = ''

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    @field_validator('*', mode='before')
    @classmethod
    def _strip(cls, value):
        return value.strip() if isinstance(value, str) else value

    @property
    def ue_root(self) -> pathlib.Path:
        if not self.pas_path:
            raise SimLaunchError(
                'PAS_PATH is not set in .env - point it at the simulator launcher '
                '(Blocks.sh / Blocks.exe) or the folder containing it'
            )

        path = pathlib.Path(self.pas_path).expanduser().resolve()
        if not path.exists():
            raise SimLaunchError(f'PAS_PATH does not exist: {path}')
        return path if path.is_dir() else path.parent


# LAUNCHER

class PixelStreamLauncher:
    def __init__(self, settings: SimSettings | None = None) -> None:
        self._s = settings or SimSettings()
        self._cirrus: asyncio.subprocess.Process | None = None
        self._sim: asyncio.subprocess.Process | None = None
        self._lock = asyncio.Lock()

    # cached: discovery globs the whole UE tree, and a launch touches these
    # four times over between bootstrap, cirrus and the sim
    @functools.cached_property
    def sim_binary(self) -> pathlib.Path:
        def keep(p: pathlib.Path) -> bool:
            return p.is_file() and (p.suffix == '.exe' if IS_WINDOWS else p.suffix == '')

        return _discover(
            self._s.ue_root, SIM_BINARY_GLOB, 'simulator binary', self._s.pas_sim_binary, keep
        )

    @functools.cached_property
    def signalling_dir(self) -> pathlib.Path:
        return _discover(
            self._s.ue_root,
            SIGNALLING_GLOB,
            'signalling server',
            self._s.pas_signalling_dir,
            lambda p: p.is_dir(),
        )

    @property
    def project_name(self) -> str:
        return self.sim_binary.parents[2].name

    @property
    def is_running(self) -> bool:
        return self._sim is not None and self._sim.returncode is None

    @property
    def player_url(self) -> str:
        return (
            f'http://127.0.0.1:{self._s.pas_http_port}/'
            '?AutoConnect=true&AutoPlayVideo=true&StartVideoMuted=true'
            '&MatchViewportRes=true&HoveringMouse=true'
        )

    # LIFECYCLE

    async def start(self) -> None:
        async with self._lock:
            if self.is_running:
                return

            binary = self._check_bootstrap()
            await self._sweep_orphans(binary)

            try:
                await self._start_cirrus()
                await self._start_sim(binary)
            except BaseException:
                await self._teardown()
                raise

            logger.info('PixelStreamLauncher: ready. stream at %s', self.player_url)

    async def stop(self) -> bool:
        async with self._lock:
            had = self._cirrus is not None or self._sim is not None
            await self._teardown()
            return had

    async def _teardown(self) -> None:
        await asyncio.gather(
            self._kill_tree(self._sim, 'sim'),
            self._kill_tree(self._cirrus, 'cirrus'),
        )
        self._sim = None
        self._cirrus = None

    def _check_bootstrap(self) -> pathlib.Path:
        """
        Resolve everything up front and fail loudly and namefully. A silent
        failure here is the single most likely thing to waste debugging time.
        """
        binary = self.sim_binary  # raises with a useful message if discovery fails
        signalling = self.signalling_dir

        if not IS_WINDOWS and not os.access(binary, os.X_OK):
            # Blocks.sh chmod +x's this on every run; bypassing it means we must
            # do it ourselves, or exec fails with EACCES on a fresh checkout
            os.chmod(binary, binary.stat().st_mode | 0o111)

        for required in (
            signalling / 'cirrus.js',
            signalling / 'Public' / 'player.html',
            signalling / 'node_modules',
        ):
            if not required.exists():
                raise SimLaunchError(
                    f'Pixel streaming is not bootstrapped ({required} is missing). '
                    'Run: task ps-setup'
                )

        if shutil.which(self._s.pas_node) is None:
            raise SimLaunchError(
                f'{self._s.pas_node!r} is not on PATH - node is needed to run the '
                'signalling server'
            )

        return binary

    async def _sweep_orphans(self, binary: pathlib.Path) -> None:
        """
        Kill any sim left from a previous run - the case the per-platform
        mechanisms cannot cover (a UE helper, a run from before this code
        landed, a kill that raced the fork).

        Note this also reaps a sim the developer started by hand, since it holds
        the ports we need.
        """
        for pid in await _find_stale_pids(binary):
            logger.warning('PixelStreamLauncher: reaping orphaned sim pid %d', pid)
            await _force_kill_pid(pid)

    async def _spawn(self, name: str, argv: list[str], cwd: pathlib.Path):
        """
        stdout and stderr go to a file, never a PIPE. UE logs heavily, and a
        full 64KiB pipe buffer blocks it mid-startup - a hang that looks exactly
        like a slow load. A file also means _log_tail() can explain a failure.
        """
        logger.info('PixelStreamLauncher: starting %s: %s', name, shlex.join(argv))

        LOG_DIR.mkdir(parents=True, exist_ok=True)
        with (LOG_DIR / f'{name}.log').open('wb') as sink:
            proc = await asyncio.create_subprocess_exec(
                *argv,
                cwd=str(cwd),
                stdout=sink,
                stderr=asyncio.subprocess.STDOUT,
                **_SPAWN_KWARGS,
            )

        # posix ties the child to us inside preexec_fn, before exec. windows
        # has to do it from the parent, so there is a microsecond window where
        # a child that dies instantly is never adopted - harmless, since the
        # thing we are protecting against is a LONG-lived orphan
        if IS_WINDOWS:
            _adopt(proc.pid)

        return proc

    async def _start_cirrus(self) -> None:
        self._cirrus = await self._spawn(
            'cirrus',
            [
                shutil.which(self._s.pas_node),  # absolute: windows needs the .exe resolved
                'cirrus.js',
                f'--HttpPort={self._s.pas_http_port}',
                f'--StreamerPort={self._s.pas_signalling_port}',
                '--PublicIp=127.0.0.1',
            ],
            self.signalling_dir,
        )
        await self._await_port(
            self._s.pas_signalling_port, SIGNALLING_READY_TIMEOUT_S, self._cirrus, 'cirrus'
        )

    async def _start_sim(self, binary: pathlib.Path) -> None:
        self._sim = await self._spawn(
            'sim',
            [
                str(binary),
                self.project_name,  # the positional Blocks.sh/.exe injects
                f'-PixelStreamingURL=ws://127.0.0.1:{self._s.pas_signalling_port}',
                '-Unattended',
                '-NoSound',
                *shlex.split(self._s.pas_sim_args),
            ],
            self._s.ue_root,
        )
        await self._await_port(
            self._s.pas_services_port, SIM_READY_TIMEOUT_S, self._sim, 'sim'
        )

    async def _await_port(self, port: int, timeout: float, proc, name: str) -> None:
        loop = asyncio.get_running_loop()
        deadline = loop.time() + timeout

        while loop.time() < deadline:
            # check the child every tick. without this a missing pak file or an
            # EGL/D3D failure turns into a silent 150 second wait
            if proc.returncode is not None:
                raise SimLaunchError(
                    f'{name} exited with code {proc.returncode} during startup.\n'
                    f'{self._log_tail(name)}'
                )
            if await _port_open(port):
                logger.info('PixelStreamLauncher: %s is up on port %d', name, port)
                return
            await asyncio.sleep(READY_POLL_INTERVAL_S)

        raise SimLaunchError(
            f'{name} did not open port {port} within {timeout:.0f}s.\n{self._log_tail(name)}'
        )

    @staticmethod
    def _log_tail(name: str, lines: int = 15) -> str:
        with contextlib.suppress(OSError):
            tail = (LOG_DIR / f'{name}.log').read_text(errors='replace').splitlines()[-lines:]
            return 'Last output:\n' + '\n'.join(tail)
        return f'(no log at {LOG_DIR / f"{name}.log"})'

    async def _kill_tree(self, proc, name: str) -> None:
        if proc is None or proc.returncode is not None:
            return

        if IS_WINDOWS:
            # same mechanism electron already uses on the backend itself
            killer = await asyncio.create_subprocess_exec(
                'taskkill', '/PID', str(proc.pid), '/T', '/F',
                stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
            )
            await killer.wait()
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(proc.wait(), timeout=KILL_GRACE_S)
                logger.info('PixelStreamLauncher: %s killed', name)
            return

        # pgid == pid: start_new_session makes the child a session leader.
        # captured rather than looked up, so an exited child cannot resolve to
        # someone else's group
        pgid = proc.pid

        for sig, grace in ((signal.SIGTERM, TERM_GRACE_S), (signal.SIGKILL, KILL_GRACE_S)):
            if proc.returncode is not None:
                return
            with contextlib.suppress(ProcessLookupError, PermissionError):
                os.killpg(pgid, sig)
            try:
                await asyncio.wait_for(proc.wait(), timeout=grace)
                logger.info('PixelStreamLauncher: %s exited on %s', name, sig.name)
                return
            except TimeoutError:
                # UE never honours SIGTERM - its main thread parks in
                # pthread_cond_wait - so this always falls through once
                logger.warning('PixelStreamLauncher: %s ignored %s', name, sig.name)

        logger.error('PixelStreamLauncher: %s survived SIGKILL', name)


async def _port_open(port: int, host: str = '127.0.0.1') -> bool:
    try:
        _, writer = await asyncio.open_connection(host, port)
    except (OSError, asyncio.TimeoutError):
        return False
    writer.close()
    with contextlib.suppress(Exception):
        await writer.wait_closed()
    return True

launcher = PixelStreamLauncher()