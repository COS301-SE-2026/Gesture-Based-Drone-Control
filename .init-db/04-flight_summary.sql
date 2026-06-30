CREATE TABLE IF NOT EXISTS Flight_Summary(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid,
    user_id UUID REFERENCES Users(id) ON DELETE SET NULL,
    drone_id SERIAL NOT NULL REFERENCES Drones(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    max_altitude DOUBLE PRECISION,
    avg_battery_drain REAL,
    avg_speed REAL,
    control_count INTEGER,
);

CREATE INDEX IF NOT EXISTS idx_flight_summary_drone_id ON flight_summary(drone_id);
CREATE INDEX IF NOT EXISTS idx_flight_summary_user_id ON flight_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_summary_started_at ON flight_summary(started_at);