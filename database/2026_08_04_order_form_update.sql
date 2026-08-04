USE `pkd_dmg`;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS guest_count INT UNSIGNED NULL AFTER receive_time;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS item_note VARCHAR(255) NULL AFTER customer_name;
