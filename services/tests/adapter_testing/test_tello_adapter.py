import pytest 
from unittest.mock import AsyncMock, MagicMock, patch, call
import math
from types import SimpleNamespace

with patch.dict( 'sys.modules', {
    'djitellopy': MagicMock(),
}):
    from services.drone_control.adapters.tello_adapter import TelloAdapter

@pytest.fixture
def mock_tello():
    """Create a mock Tello instance."""
    tello = MagicMock()
    tello.connect = MagicMock()
    tello.streamon = MagicMock()
    tello.get_frame_read = MagicMock(return_value=MagicMock())
    tello.land = MagicMock()
    tello.streamoff = MagicMock()
    tello.end = MagicMock()
    tello.takeoff = MagicMock()
    tello.send_rc_control = MagicMock()
    tello.emergency = MagicMock()
    tello.get_current_state = MagicMock(return_value={
        'tof': 100,   # 1 meter
        'vgx': 20,
        'vgy': 30,
        'vgz': 40,
        'yaw': 45,
        'bat': 85,
    })
    tello.get_position = MagicMock(return_value=(1.2, 3.4))
    tello.send_command_with_return = MagicMock(return_value='70')
    return tello

@pytest.fixture
def adapter(mock_tello):
    """Create a TelloAdapter instance with a mocked Tello."""
    with patch('services.drone_control.adapters.tello_adapter.Tello', return_value=mock_tello):
        adapter = TelloAdapter(
            _tello=None,  # will be ignored
            _frameReader=None,
            _connected=False,
            _is_flying=False,
        )
        # Manually inject the mock for easier testing
        adapter._tello = mock_tello
        return adapter

@pytest.mark.asyncio
async def test_connect_success(adapter, mock_tello):
    result = await adapter.connect()
    assert result is True
    mock_tello.connect.assert_called_once()
    mock_tello.streamon.assert_called_once()
    mock_tello.get_frame_read.assert_called_once()
    assert adapter._connected is True

@pytest.mark.asyncio
async def test_connect_failure(adapter, mock_tello):
    mock_tello.connect.side_effect = Exception("Connection failed")
    result = await adapter.connect()
    assert result is False
    mock_tello.streamon.assert_not_called()
    assert adapter._connected is False

@pytest.mark.asyncio
async def test_disconnect(adapter, mock_tello):
    adapter._connected = True
    await adapter.disconnect()
    mock_tello.land.assert_called_once()
    mock_tello.streamoff.assert_called_once()
    mock_tello.end.assert_called_once()
    assert adapter._connected is False

@pytest.mark.asyncio
async def test_disconnect_not_connected(adapter, mock_tello):
    adapter._connected = False
    with pytest.raises(RuntimeError, match = "Tello Drone is not connected."):
        await adapter.disconnect()
    mock_tello.land.assert_not_called()