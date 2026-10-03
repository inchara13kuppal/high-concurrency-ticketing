INSERT INTO venues (venue_id, name, total_capacity, location)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Brooklyn Mirage', 120, 'Brooklyn, New York'),
  ('10000000-0000-4000-8000-000000000002', 'The Wiltern', 90, 'Los Angeles, California'),
  ('10000000-0000-4000-8000-000000000003', 'The Anthem', 100, 'Washington, DC'),
  ('10000000-0000-4000-8000-000000000004', 'Terminal 5', 80, 'New York, New York')
ON CONFLICT (venue_id) DO NOTHING;

INSERT INTO events (event_id, venue_id, title, start_time, base_price, available_seats)
VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Afterglow: The Night Market', NOW() + INTERVAL '12 days', 68.00, 120),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Avery Park — Live in Color', NOW() + INTERVAL '19 days', 54.00, 90),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'The Electric Garden', NOW() + INTERVAL '26 days', 82.50, 100),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'Cinema Under the Stars', NOW() + INTERVAL '34 days', 32.00, 80)
ON CONFLICT (event_id) DO NOTHING;