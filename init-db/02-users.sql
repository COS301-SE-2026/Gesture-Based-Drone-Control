CREATE TABLE IF NOT EXISTS Users(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL,
    first_name VARCHAR,
    last_name VARCHAR,
    is_active BOOLEAN NOT NULL DEFAULT true
);