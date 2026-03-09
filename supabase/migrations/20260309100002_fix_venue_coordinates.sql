-- Fix venue coordinates to actual addresses (geocoded via Nominatim)
UPDATE venues SET latitude = 32.0756734, longitude = 34.7744256 WHERE name = 'Freak TLV';
UPDATE venues SET latitude = 32.1577326, longitude = 34.9112503 WHERE name = 'The Kingdom / הממלכה';
UPDATE venues SET latitude = 32.0730620, longitude = 34.7749940 WHERE name = 'Comics & Vegetables / קומיקס וירקות';
UPDATE venues SET latitude = 31.7687864, longitude = 35.1715439 WHERE name = 'Sirolynia / סירולניה';
UPDATE venues SET latitude = 31.9906118, longitude = 34.7727011 WHERE name = 'Rotemz';
