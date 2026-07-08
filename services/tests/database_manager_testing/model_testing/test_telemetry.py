from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy.exc import IntegrityError

from services.database_manager.models.telemetry import Telemetry
from services.database_manager.models.drone import Drone
from services.database_manager.models.flight_summary import FlightSummary

async def test_create_telemetry_minimal_fields(session):
    reading = Telemetry()
    session.add(reading)