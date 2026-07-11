CREATE TABLE IF NOT EXISTS Telemetry(
    id BIGSERIAL PRIMARY KEY,
    flight_id UUID REFERENCES Flight_Summary(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    displacement_x DOUBLE PRECISION,
    displacement_y DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    battery_level REAL,
    speed REAL,
    command_count INTEGER
);

CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_at ON telemetry(recorded_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_flight_id ON telemetry(flight_id);