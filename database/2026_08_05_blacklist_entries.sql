CREATE TABLE IF NOT EXISTS customer_blacklist_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NULL,
  phone_normalized VARCHAR(30) NOT NULL,
  phone_display VARCHAR(40) NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  reason VARCHAR(255) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  added_by_user_id INT UNSIGNED NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed_by_user_id INT UNSIGNED NULL,
  removed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_blacklist_entry_order (order_id),
  INDEX idx_blacklist_entries_phone (phone_normalized, active, added_at),
  INDEX idx_blacklist_entries_customer (customer_id, active, added_at),
  INDEX idx_blacklist_entries_added_by (added_by_user_id),
  INDEX idx_blacklist_entries_removed_by (removed_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO customer_blacklist_entries
  (customer_id, phone_normalized, phone_display, order_id, reason, active, added_by_user_id, added_at, created_at, updated_at)
SELECT
  c.id,
  c.phone_normalized,
  c.phone_display,
  c.blacklisted_order_id,
  c.blacklist_reason,
  1,
  c.blacklisted_by_user_id,
  COALESCE(c.blacklisted_at, c.updated_at, NOW()),
  COALESCE(c.blacklisted_at, c.created_at, NOW()),
  COALESCE(c.updated_at, NOW())
FROM customers c
WHERE c.is_blacklisted = 1
  AND c.blacklisted_order_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_blacklist_entries e WHERE e.order_id = c.blacklisted_order_id
  );