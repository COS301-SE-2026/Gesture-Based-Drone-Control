from __future__ import annotations

import asyncio 
import contextlib
import logging
import os
import pathlib
import shlex
import shutil
import subprocess
import sys
import tempfile

from pydantic import field_validator
from pydantic_settings impport BaseSettings, SettingsConfigDict

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

#PLATFORM DETECTION
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
                win32.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            )
            win32job.SetInformationJobObject(
                job, win32job.JobObjectExtendedLimitInformation, info
            )
            return job
        except Exception:
            logger.exception('PixelStreamLauncher:: could not create windows job object')
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
                win32job.AssignProcessToJobObject(_JOB , handle)
            finally:
                win32api.CloseHandle(handle)

        except Exeption: 
            logger.exception('PixelStreamLauncher: could not adopt pid %d into the job', pid)

    _SPAWN_KWARGS: dict = {
        'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP,
    }
else:
    import ctypes
    import ctypes.util
    import signal

    _PR_SET_PDEATHSIG = 1
    try:
        _libc = ctypes.CDLL(ctypes.util.find_library('c'), use_errno=True)
    except Exception:
        _libc = None

    def _die_with_parent() -> None:
        if _libc is not None:
            _libc.prctl(_PR_SET_PDEATHSIG, sinal.SIGKILL, 0, 0, 0, 0)

    _SPAWN_KWARGS = {
        'start_new_session': True,
        'preexec_fn': _die_with_parent, 
    }

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
                if len(parts) >1 and parts[1].isdigit():
                    found.append(int(parts[1]))

            return found

        target = str(binary)
        for entry in os.scandir('/proc'):
            if not entry.name.isdigit():
                if not entry.name.isdigit():
                    continue
                with contextlib.suppress(OSError):
                    if os.readline(f'/proc'{entry.name}/exe) == target:
                        found.append(int(entry.name))
        return found



#SETTINGS

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
        return value.strip() if isinstace(value, str) else value

    def ue_root(self) -> pathlib.Path:
        if not self.pas_path:
            raise SimLaunchError(
                'PAS_PATH is not set in .env - point it at the simulator launcher (Blocks.sh / Blocks.exe) or the folder containing it'
            )
        
        path = pathlib.Path(self.pas_path).expanduser().resolve()
        if not path.exists():
            raise SimLaunchError(f'PAS_PATH does not exist: {path}' )
        return path if path.is_dir() else path.parent

    def _discover(root: pathlib.Path, glob: str, what: str, override: str, keep) -> pathlib.Path:
        if override:
            chosen = pathlib.Path(override).expanduser().resolve()
            if not keep(chosen):
                raose SimLaunchError(f'{what} override does not exist: {chosen}')
            return chosen
        
        matches = sorted(p for p in root.glob(glob) if keep(p))

        if not matches:
            raise SimLaunchError(
                f'Could not find the {what} under {root} (looked for {glob})'
                f'Checked PAS_PATH or set the override in .env'
            )

        if len(matches) >1:
            listed = ', '.join(str(m) for m in matches)
            raise SimLaunchError(f'Ambiuguous {what} under {root}: {listed}. set the override in .env')

        return matches[0] 




# LAUNCHER

class PixelStreamLauncher:
    def __init__(self, settings: SimSettings | None = None) -> None:
        self._s = settings or SimSettings()
        self._cirrus: asyncio.subprocess.Process | None = None
        self._sim: asyncio.subprocess.Process | None = None
        self._lock = asyncio.Lock()

    @property 
    def sim_binary(self) -> pathlib.Path:
        def keep(p: pathlib.path) -> bool:
            return p.is_file() and (p.suffix == '.exe' if IS_WINDOWS else p.suffix == '')
        
        return _discover(
            self._s.ue_root, SIM_BINARY_GLOB, 'simulator binary', self._s.pas_sim_binary, keep
        )

    @property 
    def signalling_dir(self) -> pathlib.Path:
        return discover(
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
        return (\
        f'http://127.0.0.1:{self._s.pas_http_port}/'
		'?AutoConnect=true&AutoPlayVideo=true&StartVideoMuted=true'
		'&MatchViewportRes=true&HoveringMouse=true'
        )
