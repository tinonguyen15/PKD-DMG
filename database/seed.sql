USE `pkd_dmg`;

INSERT INTO users (employee_code, username, password_hash, name, role, active) VALUES
('ADMIN', 'admin', '$2y$10$RPGMQiTny8tgaKwrkNOoVOWgPVhvvB.UzaKl4YUEVOkfM9VofRCqC', 'Trưởng nhóm PKD', 'admin', 1),
('001', 'sale001', '$2y$10$QAkvJWEueMdIyidcV/Dx2.7fdisAxdIey8kzJh7rEHZJblZBN8.32', 'Nhân viên Sale 001', 'staff', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), active = VALUES(active);

INSERT INTO system_settings (setting_key, value_json, locked) VALUES
('copy_branch_include_notice', 'false', 0),
('copy_branch_notice_bank_transfer_enabled', 'false', 0),
('copy_branch_notice_default_enabled', 'false', 0),
('copy_branch_notice_cod_enabled', 'false', 0),
('copy_branch_notice_scheduled_enabled', 'false', 0),
('copy_branch_include_tag', 'false', 0),
('copy_branch_tag_text', '""', 0),
('copy_branch_tag_require_branch_match', 'false', 0),
('copy_branch_tag_by_branch', '{}', 0),
('copy_branch_notice_bank_transfer', '"⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé."', 0),
('copy_branch_notice_default', '"⚠ Lưu ý: Lên đơn và gửi Bill giúp em nhé."', 0),
('copy_branch_notice_cod', '"⚠ Lưu ý: Đơn ship COD nhé"', 0),
('copy_branch_notice_scheduled', '"⚠ Lưu ý: Đơn hẹn giờ giao nhé"', 0),
('copy_branch_quick_notice_paid_ck', '"⚠ Lưu ý: Khách đã CK nhé"', 0),
('copy_branch_quick_notice_call_before_delivery', '"⚠ Lưu ý: Gọi khách trước khi giao nhé"', 0),
('copy_branch_quick_notice_urgent', '"⚠ Lưu ý: Khách lấy gấp nhé"', 0),
('copy_branch_quick_notice_invoice', '"⚠ Lưu ý: Khách cần hóa đơn nhé"', 0),
('auto_mark_sent_on_branch_copy', 'false', 0),
('customer_confirmation_intro', '""', 0),
('customer_confirmation_footer', '""', 0),
('default_order_type', '"delivery"', 0),
('default_branch_id', '0', 0),
('default_source_id', '0', 0),
('default_delivery_payment_method_id', '0', 0),
('default_pickup_payment_method_id', '0', 0),
('remember_last_order_choices', 'false', 0),
('show_recent_menu_items_first', 'true', 0),
('favorite_menu_item_ids', '[]', 0),
('default_contact_branch_id', '0', 0),
('default_contact_channel', '"hotline_1900"', 0),
('default_report_range', '"today"', 0)
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

INSERT INTO branches (name, address, phone, active, sort_order) VALUES
('CN ĐMG 1', '', '', 1, 1),
('CN ĐMG 2', '', '', 1, 2),
('CN ĐMG 3', '', '', 1, 3)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO menu_categories (slug, name, active, sort_order) VALUES
('lau-suon-chia', 'Lẩu sườn chìa', 1, 1),
('lau-xi-quach', 'Lẩu xí quách', 1, 2),
('mon-them', 'Món thêm', 1, 3),
('do-uong', 'Đồ uống', 1, 4)
ON DUPLICATE KEY UPDATE name = VALUES(name), active = VALUES(active), sort_order = VALUES(sort_order);

INSERT INTO menu_items (category_id, slug, name, branch_name, customer_name, price, unit, image_path, active, sort_order) VALUES
((SELECT id FROM menu_categories WHERE slug='lau-xi-quach'), 'lau-dac-biet', 'Lẩu đặc biệt Đắng Mà Ghiền', 'Lẩu đặc biệt ĐMG', 'Lẩu đặc biệt Đắng Mà Ghiền', 529000, 'phần', '/assets/images/menu/lau-dac-biet.jpg', 1, 1),
((SELECT id FROM menu_categories WHERE slug='lau-suon-chia'), 'lau-suon-chia-dac-biet', 'Lẩu sườn chìa lớn', 'Lẩu sườn chìa (Lớn)', 'Lẩu sườn chìa (Lớn)', 449000, 'phần', '/assets/images/menu/lau-suon-chia-dac-biet.jpg', 1, 2),
((SELECT id FROM menu_categories WHERE slug='lau-suon-chia'), 'lau-suon-chia-nho', 'Lẩu sườn chìa nhỏ', 'Lẩu sườn chìa (Nhỏ)', 'Lẩu sườn chìa (Nhỏ)', 309000, 'phần', '/assets/images/menu/lau-suon-chia-nho.jpg', 1, 3),
((SELECT id FROM menu_categories WHERE slug='lau-xi-quach'), 'lau-lon', 'Lẩu xí quách lớn', 'Lẩu xí quách (Lớn)', 'Lẩu xí quách (Lớn)', 309000, 'phần', '/assets/images/menu/lau-lon.jpg', 1, 4),
((SELECT id FROM menu_categories WHERE slug='lau-xi-quach'), 'lau-nho', 'Lẩu xí quách nhỏ', 'Lẩu xí quách (Nhỏ)', 'Lẩu xí quách (Nhỏ)', 209000, 'phần', '/assets/images/menu/lau-nho.jpg', 1, 5),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'ca-thac-lac-vien', 'Cá thác lác viên', 'Cá viên', 'Cá thác lác viên', 69000, 'phần', '/assets/images/menu/ca-thac-lac-vien.jpg', 1, 6),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'cha-ca-chien', 'Chả cá chiên', 'Chả cá', 'Chả cá chiên', 95000, 'phần', '/assets/images/menu/cha-ca-chien.jpg', 1, 7),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'suon-chia-them', 'Sườn chìa', 'Sườn chìa', 'Sườn chìa', 69000, 'phần', '/assets/images/menu/suon-chia-them.jpg', 1, 8),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'xi-quach', 'Xí quách', 'Xí quách', 'Xí quách', 69000, 'phần', '/assets/images/menu/xi-quach.jpg', 1, 9),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'tuy', 'Tủy', 'Tủy', 'Tủy', 49000, 'phần', '', 1, 10),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'dot-kho-qua-rung', 'Đọt khổ qua rừng lớn', 'Đọt (Lớn)', 'Đọt Khổ Qua Rừng (Lớn)', 49000, 'phần', '/assets/images/menu/dot-kho-qua-rung.jpg', 1, 11),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'dot-kho-qua-rung-nho', 'Đọt khổ qua rừng nhỏ', 'Đọt (Nhỏ)', 'Đọt Khổ Qua Rừng (Nhỏ)', 29000, 'phần', '/assets/images/menu/dot-kho-qua-rung.jpg', 1, 12),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'set-rau', 'Set rau tổng hợp lớn', 'Set rau (Lớn)', 'Set rau tổng hợp (Lớn)', 69000, 'set', '/assets/images/menu/set-rau.jpg', 1, 13),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'set-rau-nho', 'Set rau tổng hợp nhỏ', 'Set rau (Nhỏ)', 'Set rau tổng hợp (Nhỏ)', 49000, 'set', '/assets/images/menu/set-rau.jpg', 1, 14),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'rau-ngot', 'Rau ngót', 'Rau ngót', 'Rau ngót', 16000, 'phần', '/assets/images/menu/rau-ngot.jpg', 1, 15),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'muop', 'Mướp', 'Mướp', 'Mướp', 16000, 'phần', '', 1, 16),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'kho-qua-bao', 'Khổ qua bào', 'Khổ qua bào', 'Khổ qua bào', 16000, 'phần', '/assets/images/menu/kho-qua-bao.jpg', 1, 17),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'nam-them', 'Nấm lớn', 'Nấm (Lớn)', 'Nấm (Lớn)', 49000, 'phần', '/assets/images/menu/nam-them.jpg', 1, 18),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'nam-them-nho', 'Nấm nhỏ', 'Nấm (Nhỏ)', 'Nấm (Nhỏ)', 29000, 'phần', '/assets/images/menu/nam-them.jpg', 1, 19),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'kho-qua-rung-nhoi', 'Khổ qua rừng nhồi', 'Nhồi', 'Khổ qua rừng nhồi', 55000, 'phần', '/assets/images/menu/kho-qua-rung-nhoi.jpg', 1, 20),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'kho-qua-rung', 'Khổ qua rừng', 'Khổ qua rừng', 'Khổ qua rừng', 16000, 'phần', '', 1, 21),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'bun', 'Bún', 'Bún', 'Bún', 10000, 'phần', '/assets/images/menu/bun.jpg', 1, 22),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'nuoc-lau-them', 'Nước lẩu', 'Nước lẩu', 'Nước lẩu', 10000, 'phần', '/assets/images/menu/nuoc-lau-them.jpg', 1, 23),
((SELECT id FROM menu_categories WHERE slug='mon-them'), 'mi-goi', 'Mì gói', 'Mì gói', 'Mì gói', 7000, 'gói', '/assets/images/menu/mi-goi.jpg', 0, 24),
((SELECT id FROM menu_categories WHERE slug='do-uong'), 'coca', 'Coca', 'Coca', 'Coca', 15000, 'lon', '', 1, 25),
((SELECT id FROM menu_categories WHERE slug='do-uong'), 'sprite', 'Sprite', 'Sprite', 'Sprite', 15000, 'lon', '', 1, 26),
((SELECT id FROM menu_categories WHERE slug='do-uong'), 'nuoc-sam', 'Nước sâm', 'Nước sâm', 'Nước sâm', 12000, 'chai', '', 1, 27),
((SELECT id FROM menu_categories WHERE slug='do-uong'), 'nuoc-suoi', 'Nước suối', 'Nước suối', 'Nước suối', 10000, 'chai', '', 1, 28),
((SELECT id FROM menu_categories WHERE slug='do-uong'), 'tiger-crystal', 'Tiger Crystal', 'Tiger Crystal', 'Tiger Crystal', 26000, 'lon', '', 1, 29),
((SELECT id FROM menu_categories WHERE slug='do-uong'), 'tiger', 'Tiger', 'Tiger', 'Tiger', 24000, 'lon', '', 1, 30),
((SELECT id FROM menu_categories WHERE slug='do-uong'), 'heineken-lon-cao', 'Heineken (lon cao)', 'Heineken cao', 'Heineken lon cao', 27000, 'lon', '', 1, 31),
((SELECT id FROM menu_categories WHERE slug='do-uong'), 'heineken-lon-lun', 'Heineken (lon lùn)', 'Heineken lùn', 'Heineken lon lùn', 22000, 'lon', '', 1, 32),
((SELECT id FROM menu_categories WHERE slug='do-uong'), 'sai-gon', 'Sài Gòn', 'Sài Gòn', 'Sài Gòn', 18000, 'lon', '', 1, 33)
ON DUPLICATE KEY UPDATE name = VALUES(name), branch_name = VALUES(branch_name), customer_name = VALUES(customer_name), price = VALUES(price), unit = VALUES(unit), image_path = VALUES(image_path), active = VALUES(active), sort_order = VALUES(sort_order);

INSERT INTO order_sources (name, active, sort_order) VALUES
('Facebook', 1, 1),
('FB Ads', 1, 2),
('Zalo', 1, 3),
('Hotline', 1, 4),
('Google', 1, 5),
('Khách quen', 1, 6),
('Walk-in', 1, 7),
('Khác', 1, 8)
ON DUPLICATE KEY UPDATE active = VALUES(active), sort_order = VALUES(sort_order);

INSERT INTO payment_methods (name, active, sort_order) VALUES
('Tiền mặt', 1, 1),
('Chuyển khoản', 1, 2),
('COD', 1, 3),
('Thanh toán khi ghé lấy', 1, 4),
('Đã thanh toán trước', 1, 5)
ON DUPLICATE KEY UPDATE active = VALUES(active), sort_order = VALUES(sort_order);

INSERT INTO order_statuses (name, active, sort_order) VALUES
('Done', 1, 1),
('CK', 1, 2),
('COD', 1, 3),
('Đã thanh toán', 1, 4),
('Chưa thanh toán', 1, 5),
('Đã xác nhận', 1, 6),
('Đã hủy', 1, 7)
ON DUPLICATE KEY UPDATE active = VALUES(active), sort_order = VALUES(sort_order);

INSERT INTO message_categories (name, sort_order) VALUES
('Xác nhận đơn', 1),
('Hỏi thông tin khách', 2),
('Thanh toán', 3),
('Giao hàng', 4),
('Hết món', 5),
('Chăm sóc sau đơn', 6),
('Khác', 7)
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

INSERT INTO message_templates (category_id, title, content, is_pinned, active, sort_order) VALUES
((SELECT id FROM message_categories WHERE name='Hỏi thông tin khách'), 'Xin thông tin giao hàng', 'Dạ anh/chị cho em xin tên người nhận, số điện thoại, địa chỉ và thời gian muốn nhận món để em lên đơn giúp mình ạ.', 0, 1, 1),
((SELECT id FROM message_categories WHERE name='Hỏi thông tin khách'), 'Xin thời gian nhận', 'Dạ anh/chị muốn nhận món vào khoảng mấy giờ để bên em chuẩn bị món tốt nhất ạ?', 0, 1, 2),
((SELECT id FROM message_categories WHERE name='Xác nhận đơn'), 'Xác nhận đơn đã lên', 'Dạ bên em đã ghi nhận đơn của {{ten_khach}}. Tổng thanh toán là {{tong_tien}}. Thời gian nhận dự kiến: {{thoi_gian}} ạ.', 1, 1, 3),
((SELECT id FROM message_categories WHERE name='Thanh toán'), 'Xác nhận chuyển khoản', 'Dạ bên em đã nhận được thông tin chuyển khoản của anh/chị. Bên em sẽ tiến hành chuẩn bị món ngay ạ.', 0, 1, 4),
((SELECT id FROM message_categories WHERE name='Giao hàng'), 'Đơn đang được giao', 'Dạ đơn của anh/chị đã được bàn giao cho tài xế. Anh/chị để ý điện thoại giúp em ạ.', 0, 1, 5),
((SELECT id FROM message_categories WHERE name='Hết món'), 'Thông báo hết món', 'Dạ hiện tại món anh/chị chọn đang tạm hết. Anh/chị có thể đổi sang món khác hoặc bên em hỗ trợ điều chỉnh đơn giúp mình ạ.', 0, 1, 6),
((SELECT id FROM message_categories WHERE name='Chăm sóc sau đơn'), 'Cảm ơn khách', 'Dạ cảm ơn anh/chị đã đặt món tại Lẩu Khổ Qua Rừng Đắng Mà Ghiền. Chúc anh/chị và gia đình dùng bữa ngon miệng ạ.', 0, 1, 7)
ON DUPLICATE KEY UPDATE category_id = VALUES(category_id), content = VALUES(content), is_pinned = VALUES(is_pinned), active = VALUES(active), sort_order = VALUES(sort_order);
