ALTER TABLE venues
  ADD COLUMN latitude DOUBLE PRECISION,
  ADD COLUMN longitude DOUBLE PRECISION;

-- Seed example coordinates for test data
-- UPDATE venues SET latitude = 32.0853, longitude = 34.7818 WHERE city = 'Tel Aviv';
-- UPDATE venues SET latitude = 31.7683, longitude = 35.2137 WHERE city = 'Jerusalem';
