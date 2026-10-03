INSERT INTO venues (venue_id, name, total_capacity, location)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Bengaluru Palace Grounds', 120, 'Bengaluru, Karnataka'),
  ('10000000-0000-4000-8000-000000000002', 'Jio World Garden', 90, 'Mumbai, Maharashtra'),
  ('10000000-0000-4000-8000-000000000003', 'Gachibowli Stadium', 100, 'Hyderabad, Telangana'),
  ('10000000-0000-4000-8000-000000000004', 'Mysuru Open Air Arena', 80, 'Mysuru, Karnataka')
ON CONFLICT (venue_id) DO UPDATE
  SET name = EXCLUDED.name,
      total_capacity = EXCLUDED.total_capacity,
      location = EXCLUDED.location;

INSERT INTO events (event_id, venue_id, title, start_time, base_price, available_seats)
VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Rockstar: Special Big-Screen Screening', NOW() + INTERVAL '12 days', 699.00, 120),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'K.G.F: Chapter 2 — Special Screening', NOW() + INTERVAL '19 days', 899.00, 90),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'Jawan: A Big-Screen Celebration', NOW() + INTERVAL '26 days', 999.00, 100),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'Kantara: Special Screening', NOW() + INTERVAL '34 days', 599.00, 80)
ON CONFLICT (event_id) DO UPDATE
  SET venue_id = EXCLUDED.venue_id,
      title = EXCLUDED.title,
      start_time = EXCLUDED.start_time,
      base_price = EXCLUDED.base_price;