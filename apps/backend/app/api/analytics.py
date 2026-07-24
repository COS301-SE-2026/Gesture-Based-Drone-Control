from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from services.database_manager.database import get_db
from services.database_manager.managers.flight_manager import flight_manager

router = APIRouter(prefix='/analytics', tags=['analytics'])

"""
analytics routes is to read-only the endpoints over flight history stored in the db
GET/analytics/flights - most recent completed/in progress flight
GET/analytics/summary - aggregate stats across all completed flights

this is populated by the flight_manager, which drone.py calls calls into on /drone/connect
(starts the flight), /drone/disconnect (ends the flight)

at every 10th telem tick over the websocket we record_telemetry
"""


"""
returns the most recently started flight, newest first

each entry has a derived duration_min that is computed from started_at/ended_at
instead of being stored directly.
flights that havent ended yet (ended_at is None) report 
duration_min as None rather than inprogress

-limit is the max num of flights to retunr, defualt is 10
-returns a list of dicts shaped for frontend use performance bar graph


"""


@router.get('/flights')
async def recent_flights(limit: int = 10, db: AsyncSession = Depends(get_db)):
	flights = await flight_manager.get_recent_flights(db, limit)
	return [
		{
			'id': str(f.id),
			'started_at': f.started_at.isoformat(),
			'ended_at': f.ended_at.isoformat() if f.ended_at else None,
			'max_altitude': f.max_altitude,
			'avg_speed': f.avg_speed,
			'duration_min': (
				(f.ended_at - f.started_at).total_seconds() / 60 if f.ended_at else None
			),
		}
		for f in flights
	]


"""
returns aggregate stats across all completed flights (ended_at is not None)
in progress flights are excluded so an active sess doesnt skew the avgs
 before its completed its flight
-linked to FlightManager.get_summ_stats
"""


@router.get('/summary')
async def summary_stats(db: AsyncSession = Depends(get_db)):
	return await flight_manager.get_summ_stats(db)
