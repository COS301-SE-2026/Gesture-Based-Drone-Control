# /services/telemetry/manager.py


async def get_drone_telemetry() -> dict:
    # this will have to read data from our various sources
    return {
        "battery": 100,
        "altitude": 20,
        "heading": 180,
        "speed": 12.3,
        "mode": "GUIDED",
    }


async def get_sim_telemetry() -> dict:
    # this will have to read data from our various sources
    return {
        "battery": 100,
        "altitude": 20,
        "heading": 180,
        "longitude": 28.1928,
        "latitude": -20.1829,
        "speed": 12.3,
        "mode": "GUIDED",
    }
