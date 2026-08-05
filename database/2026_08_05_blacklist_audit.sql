ALTER TABLE customers
  ADD COLUMN blacklisted_by_user_id INT UNSIGNED NULL AFTER blacklist_reason,
  ADD COLUMN blacklisted_order_id BIGINT UNSIGNED NULL AFTER blacklisted_by_user_id,
  ADD COLUMN blacklisted_at DATETIME NULL AFTER blacklisted_order_id;

CREATE TABLE IF NOT EXISTS customer_blacklist_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NULL,
  phone_normalized VARCHAR(30) NOT NULL,
  phone_display VARCHAR(40) NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  action VARCHAR(20) NOT NULL DEFAULT 'add',
  reason VARCHAR(255) NULL,
  user_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_blacklist_logs_phone (phone_normalized, created_at),
  INDEX idx_blacklist_logs_customer (customer_id, created_at),
  INDEX idx_blacklist_logs_order (order_id),
  INDEX idx_blacklist_logs_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
