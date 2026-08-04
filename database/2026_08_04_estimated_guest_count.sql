ALTER TABLE menu_items
  ADD COLUMN estimated_guest_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER image_path;

UPDATE menu_items
SET estimated_guest_count = CASE slug
  WHEN 'lau-nho' THEN 2
  WHEN 'lau-lon' THEN 3
  WHEN 'lau-suon-chia-nho' THEN 2
  WHEN 'lau-suon-chia-dac-biet' THEN 4
  WHEN 'lau-dac-biet' THEN 5
  ELSE estimated_guest_count
END
WHERE slug IN (
  'lau-nho',
  'lau-lon',
  'lau-suon-chia-nho',
  'lau-suon-chia-dac-biet',
  'lau-dac-biet'
);
