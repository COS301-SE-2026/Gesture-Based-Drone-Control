CREATE TABLE IF NOT EXISTS Drones(
    id SERIAL PRIMARY KEY,
    display_name VARCHAR NOT NULL,
    is_simulated BOOLEAN NOT NULL
);

INSERT INTO Drones (display_name, is_simulated) 
VALUES('Airsim', true),
('Project Airsim', true),
('XFly 1.0', false) 
ON CONFLICT (id) DO NOTHING;