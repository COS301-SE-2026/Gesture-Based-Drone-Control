# /services/cv-pipeline/drone-control/adapters/tello_adapter.py

import asyncio
import logging
import math
import time

from djitellopy import Tello

from services.commands.command import AnalogInput, CommandType
from services.drone_control.adapters.drone_adapter import DroneAdapter, TelemetryData

logger = logging.getLogger(__name__)


class TelloAdapter(DroneAdapter):
	MOVEMENTSPEED = 50
	MAX_DT_S = 1.0
	WIFI_QUERY_INTERVAL_S = 3.0

	def __init__(
		self,
	) -> None:
		self._tello = Tello(retry_count=1)
		self._connected = False
		self._is_flying = False
		self._hover_task: asyncio.Task | None = None
		self._hover_delay: float = 0.5
		self._x_displacement: float = 0.0
		self._y_displacement: float = 0.0
		self._last_telemetry_time: float | None = None
		self._wifi_signal: int | None = None
		self._last_wifi_query_time: float | None = None
		self._wifi_query_task: asyncio.Task | None = None

	async def connect(self) -> bool:
		try:
			# await asyncio.wait_for(asyncio.to_thread(self._tello.connect()), timeout=5.0)
			self._tello.connect()
			# self._tello.streamon() for camera integration
			# self._frame_reader = self._tello.get_frame_read()
			self._connected = True
			return True
		except Exception:
			self._tello.end()
			return False

	async def disconnect(self) -> None:
		self._assert_connected()

		try:
			if self._is_flying:
				await self.land()
			# self._tello.streamoff()
		except Exception as ex:
			logger.warning('Tello land failed with %s', ex, exc_info=True)
		finally:
			try:
				self._connected = False
				self._tello.end()
			except Exception as ex:
				logger.warning('Tello.end failed with %s', ex, exc_info=True)

	async def takeoff(self) -> None:
		self._assert_connected()
		self._tello.takeoff()
		self._is_flying = True
		self._x_displacement = 0.0
		self._y_displacement = 0.0
		self._last_telemetry_time = None
		logger.info('Tello Drone: taking off')

	async def land(self) -> None:
		self._assert_connected()
		self._assert_flying()

		if self._hover_task is not None and not self._hover_task.done():
			self._hover_task.cancel()

		self._tello.land()
		self._is_flying = False
		logger.info('Tello Drone: landing')

	async def move(self, direction: CommandType, **kwargs):
		"""
		I am aware that the speed kwargs is being used here as a distance
		We are just moving with it considering its perfectly tuned without the kwargs input
		"""
		self._assert_connected()
		self._assert_flying()

		speed = kwargs.get('speed_ms', self.MOVEMENTSPEED)

		velocity_map: dict[CommandType, tuple[int, int, int, int]] = {
			CommandType.MOVE_FORWARD: (0, speed, 0, 0),
			CommandType.MOVE_BACKWARD: (0, -speed, 0, 0),
			CommandType.MOVE_LEFT: (-speed, 0, 0, 0),
			CommandType.MOVE_RIGHT: (speed, 0, 0, 0),
			CommandType.MOVE_UP: (0, 0, speed, 0),
			CommandType.MOVE_DOWN: (0, 0, -speed, 0),
			CommandType.ROTATE_CW: (0, 0, 0, speed),
			CommandType.ROTATE_CCW: (0, 0, 0, -speed),
		}

		vec = velocity_map.get(direction)
		if vec is None:
			logger.warning('Tello.move: no vector for %s - skipping', direction.name)
			return

		lr, fb, ud, yaw = vec

		logger.info(
			'Tello: move %s (vx=%.2f vy=%.2f vz=%.2f dur=%.2fs)',
			direction.name,
			lr,
			fb,
			ud,
			yaw,
		)
		self._tello.send_rc_control(lr, fb, ud, yaw)
		self._reset_hover_watchdog(self._hover_delay)

	async def analog(self, input: AnalogInput) -> None:
		self._assert_connected()
		self._assert_flying()

		fb = int(-input.left_y * self.MOVEMENTSPEED)
		lr = int(input.left_x * self.MOVEMENTSPEED)

		stickz = input.right_y
		triggerz = input.ltrigger - input.rtrigger
		vert = stickz if abs(stickz) >= abs(triggerz) else triggerz
		ud = int(vert * self.MOVEMENTSPEED)

		yaw = int(input.right_x * self.MOVEMENTSPEED)

		self._tello.send_rc_control(lr, fb, ud, yaw)

	async def hover(self) -> None:
		self._assert_connected()
		self._assert_flying()

		self._tello.send_rc_control(0, 0, 0, 0)

	async def emergency_stop(self) -> None:
		self._tello.emergency()

	async def get_telemetry(self):
		if not self._connected:
			return TelemetryData(source='tello-disconnected')

		try:
			state = self._tello.get_current_state()

			altitude = state.get('tof') / 100  # conversion to meters

			vx = state.get('vgx')
			vy = state.get('vgy')
			vz = state.get('vgz')

			vel = math.sqrt(vx**2 + vy**2 + vz**2)
			vel = vel / 100  # cm/s -> m/s

			yaw = state.get('yaw')
			body_heading = math.degrees(math.atan2(vy, vx))
			world_heading = (body_heading + yaw) % 360

			battery = state.get('bat')

			now = time.monotonic()

			if self._last_telemetry_time is None:
				dt = 0.0
			else:
				dt = min(now - self._last_telemetry_time, self.MAX_DT_S)

			self._last_telemetry_time = now

			vx_ms = vx / 100
			vy_ms = vy / 100  # this the cm/s -> m/s
			yaw_rad = math.radians(yaw)
			world_vx = vx_ms * math.cos(yaw_rad) - vy_ms * math.sin(yaw_rad)
			world_vy = vx_ms * math.sin(yaw_rad) + vy_ms * math.cos(
				yaw_rad
			)  # rotational matrix to convert drone local coords to world coords

			if self._is_flying:
				self._x_displacement += world_vx * dt
				self._y_displacement += world_vy * dt  # integral step

			self._schedule_wifi_query_sometimes(now)

			return TelemetryData(
				altitude_m=round(altitude, 3),
				speed_ms=round(vel, 3),
				heading_deg=world_heading,
				battery_pct=battery,
				is_flying=self._is_flying,
				x_displacement=round(self._x_displacement, 3),
				y_displacement=round(self._y_displacement, 3),
				extra={'signal': self._wifi_signal},
				source='tello',
			)

		except Exception as ex:
			logging.exception('TelloAdapter.get_telemetry: error - %s', ex)
			logger.debug('Telemetry exception detail', exc_info=True)
			return TelemetryData(source='tello-error')


	
	

	def _assert_connected(self) -> None:
		if not self._connected:
			raise RuntimeError(
				'Tello Drone is not connected. Await connect() before issuing commands.'
			)

	def _assert_flying(self) -> None:
		if not self._is_flying:
			raise RuntimeError(
				'Tello Drone is not flying. Await takeoff() before issuing flight commands'
			)

	def _schedule_wifi_query_sometimes(self, now: float) -> None:
		if self._wifi_query_task is not None and not self._wifi_query_task.done():
			return

		if (
			self._last_wifi_query_time is not None
			and now - self._last_wifi_query_time < self.WIFI_QUERY_INTERVAL_S
		):
			return

		self._last_wifi_query_time = now
		self._wifi_query_task = asyncio.create_task(self._refresh_wifi_signal())

	async def _refresh_wifi_signal(self) -> None:
		try:
			response = await asyncio.to_thread(self._tello.query_wifi_signal_noise_ratio)
			self._wifi_signal = int(response)
		except Exception as e:
			logger.debug('Tello wifi signal query failed %s', e)

	def _reset_hover_watchdog(self, delay: float) -> None:
		"""
		Cancel any pending auto hovers and schedule a new one
		allows for continuous motion while still hovering after a period of time
		"""
		if self._hover_task is not None and not self._hover_task.done():
			self._hover_task.cancel()

		self._hover_task = asyncio.create_task(self._hover_after(delay))

	async def _hover_after(self, delay: float) -> None:
		try:
			await asyncio.sleep(delay)
			await self.hover()
		except asyncio.CancelledError:
			raise
			# this happens when a new command comes in

	async def stop(self):
		"""
		explicit immediate hover
		"""
		if self._hover_task is not None and not self._hover_task.done():
			self.hover_task.cancel()
		await self.hover()
