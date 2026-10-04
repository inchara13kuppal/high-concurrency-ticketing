CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'Customer',
  date_of_birth DATE
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  login_time TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS login_history_user_time_idx
  ON login_history (user_id, login_time DESC);

CREATE TABLE IF NOT EXISTS venues (
  venue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(180) NOT NULL,
  total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
  location VARCHAR(220) NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(venue_id) ON DELETE RESTRICT,
  title VARCHAR(220) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
  total_capacity INTEGER NOT NULL CONSTRAINT events_total_capacity_positive CHECK (total_capacity > 0),
  available_seats INTEGER NOT NULL CHECK (available_seats >= 0)
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS total_capacity INTEGER;

UPDATE events e
   SET total_capacity = v.total_capacity
  FROM venues v
 WHERE v.venue_id = e.venue_id
   AND e.total_capacity IS NULL;

ALTER TABLE events ALTER COLUMN total_capacity SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'events'::regclass
       AND conname = 'events_total_capacity_positive'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_total_capacity_positive CHECK (total_capacity > 0);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS bookings (
  booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE RESTRICT,
  seat_number VARCHAR(20) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_successful_event_seat_unique
  ON bookings (event_id, seat_number)
  WHERE status = 'SUCCESS';

CREATE INDEX IF NOT EXISTS events_start_time_idx ON events (start_time);
CREATE INDEX IF NOT EXISTS bookings_event_status_idx ON bookings (event_id, status);
CREATE INDEX IF NOT EXISTS bookings_user_created_idx ON bookings (user_id, created_at DESC);

CREATE OR REPLACE VIEW event_sales_summary_view AS
SELECT
  e.event_id,
  e.title AS event_title,
  v.name AS venue_name,
  v.location,
  e.start_time,
  COUNT(b.booking_id)::INTEGER AS tickets_sold,
  COALESCE(SUM(e.base_price), 0)::NUMERIC(12, 2) AS total_revenue
FROM events e
JOIN venues v ON v.venue_id = e.venue_id
LEFT JOIN bookings b ON b.event_id = e.event_id AND b.status = 'SUCCESS'
GROUP BY e.event_id, e.title, v.name, v.location, e.start_time;

CREATE OR REPLACE FUNCTION decrement_event_seats_after_success()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'SUCCESS' THEN
    UPDATE events
       SET available_seats = available_seats - 1
     WHERE event_id = NEW.event_id
       AND available_seats > 0;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No seats remain for event %', NEW.event_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_decrement_event_seats ON bookings;
CREATE TRIGGER bookings_decrement_event_seats
AFTER INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION decrement_event_seats_after_success();

CREATE OR REPLACE FUNCTION create_booking(
  p_user_id UUID,
  p_event_id UUID,
  p_seat_number VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity INTEGER;
  v_available INTEGER;
  v_start_time TIMESTAMPTZ;
  v_seat_number INTEGER;
  v_booking_id UUID;
BEGIN
  IF p_seat_number !~ '^[0-9]{1,4}$' THEN
    RAISE EXCEPTION 'Invalid seat number'
      USING ERRCODE = '22023';
  END IF;

  v_seat_number := p_seat_number::INTEGER;

  SELECT e.total_capacity, e.available_seats, e.start_time
    INTO v_capacity, v_available, v_start_time
    FROM events e
    JOIN venues v ON v.venue_id = e.venue_id
   WHERE e.event_id = p_event_id
   FOR UPDATE OF e;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_start_time <= NOW() THEN
    RAISE EXCEPTION 'Event is no longer available'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_seat_number < 1 OR v_seat_number > v_capacity THEN
    RAISE EXCEPTION 'Seat number is outside the event capacity'
      USING ERRCODE = '22023';
  END IF;

  IF v_available < 1 THEN
    RAISE EXCEPTION 'No seats remain for this event'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO bookings (user_id, event_id, seat_number, status)
  VALUES (p_user_id, p_event_id, LPAD(v_seat_number::TEXT, 3, '0'), 'SUCCESS')
  RETURNING booking_id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_bookings(
  p_user_id UUID,
  p_event_id UUID,
  p_seat_numbers VARCHAR[]
)
RETURNS TABLE(booking_id UUID, seat_number VARCHAR)
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity INTEGER;
  v_available INTEGER;
  v_start_time TIMESTAMPTZ;
  v_date_of_birth DATE;
  v_seat_numbers VARCHAR[];
BEGIN
  IF COALESCE(cardinality(p_seat_numbers), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one seat'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM unnest(p_seat_numbers) AS requested(seat)
     WHERE requested.seat IS NULL
        OR requested.seat !~ '^[0-9]{1,4}$'
  ) THEN
    RAISE EXCEPTION 'Invalid seat number'
      USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM unnest(p_seat_numbers) AS requested(seat)
     WHERE requested.seat::INTEGER < 1
  ) THEN
    RAISE EXCEPTION 'Invalid seat number'
      USING ERRCODE = '22023';
  END IF;

  SELECT ARRAY(
    SELECT CASE
             WHEN length(requested.seat::INTEGER::TEXT) < 3
               THEN lpad(requested.seat::INTEGER::TEXT, 3, '0')
             ELSE requested.seat::INTEGER::TEXT
           END
      FROM unnest(p_seat_numbers) WITH ORDINALITY AS requested(seat, position)
     ORDER BY requested.position
  )::VARCHAR[]
    INTO v_seat_numbers;

  IF cardinality(v_seat_numbers) <> (
    SELECT COUNT(DISTINCT requested.seat)
      FROM unnest(v_seat_numbers) AS requested(seat)
  ) THEN
    RAISE EXCEPTION 'Seat numbers must be unique'
      USING ERRCODE = '22023';
  END IF;

  SELECT u.date_of_birth
    INTO v_date_of_birth
    FROM users u
   WHERE u.user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found'
      USING ERRCODE = 'P0002';
  END IF;
  IF v_date_of_birth IS NULL THEN
    RAISE EXCEPTION 'Add your date of birth before booking tickets'
      USING ERRCODE = '42501';
  END IF;
  IF v_date_of_birth > CURRENT_DATE
     OR EXTRACT(YEAR FROM age(CURRENT_DATE, v_date_of_birth)) < 18 THEN
    RAISE EXCEPTION 'You must be 18 or older to book tickets.'
      USING ERRCODE = '42501';
  END IF;

  SELECT e.total_capacity, e.available_seats, e.start_time
    INTO v_capacity, v_available, v_start_time
    FROM events e
    JOIN venues v ON v.venue_id = e.venue_id
   WHERE e.event_id = p_event_id
   FOR UPDATE OF e;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found'
      USING ERRCODE = 'P0002';
  END IF;
  IF v_start_time <= NOW() THEN
    RAISE EXCEPTION 'Event is no longer available'
      USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM unnest(v_seat_numbers) AS requested(seat)
     WHERE requested.seat::INTEGER > v_capacity
  ) THEN
    RAISE EXCEPTION 'Seat number is outside the event capacity'
      USING ERRCODE = '22023';
  END IF;
  IF v_available < cardinality(v_seat_numbers) THEN
    RAISE EXCEPTION 'Not enough seats remain for this event'
      USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM bookings b
     WHERE b.event_id = p_event_id
       AND b.status = 'SUCCESS'
       AND b.seat_number = ANY(v_seat_numbers)
  ) THEN
    RAISE EXCEPTION 'One or more seats have already been booked'
      USING ERRCODE = '23505';
  END IF;

  RETURN QUERY
    INSERT INTO bookings (user_id, event_id, seat_number, status)
    SELECT p_user_id, p_event_id, requested.seat, 'SUCCESS'
      FROM unnest(v_seat_numbers) AS requested(seat)
     ORDER BY requested.seat::INTEGER
    RETURNING bookings.booking_id, bookings.seat_number;
END;
$$;

CREATE OR REPLACE FUNCTION create_booking(
  p_user_id UUID,
  p_event_id UUID,
  p_seat_number VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  SELECT created.booking_id
    INTO v_booking_id
    FROM create_bookings(p_user_id, p_event_id, ARRAY[p_seat_number]::VARCHAR[]) AS created;
  RETURN v_booking_id;
END;
$$;