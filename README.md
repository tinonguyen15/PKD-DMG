# PKD ĐMG Web V1

Web PHP nội bộ cho Team PKD Đắng Mà Ghiền: đăng nhập nhân viên, tạo đơn nhanh, theo dõi trạng thái, nhập tiếp cận cuối ngày và báo cáo team.

## Chạy local bằng XAMPP

1. Bật Apache và MySQL/MariaDB trong XAMPP.
2. Import database bằng MariaDB/MySQL với UTF-8:

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' --default-character-set=utf8mb4 -u root -e "DROP DATABASE IF EXISTS pkd_dmg; source C:/Code/PKD-DMG/database/schema.sql; source C:/Code/PKD-DMG/database/seed.sql;"
```

Nếu đã có DB từ bản trước, chạy migration bổ sung:

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' --default-character-set=utf8mb4 -u root -e "source C:/Code/PKD-DMG/database/2026_08_04_order_form_update.sql; source C:/Code/PKD-DMG/database/2026_08_04_user_preferences.sql; source C:/Code/PKD-DMG/database/2026_08_04_notice_templates.sql; source C:/Code/PKD-DMG/database/2026_08_04_notice_conditions.sql; source C:/Code/PKD-DMG/database/2026_08_04_remove_copy_master_switches.sql; source C:/Code/PKD-DMG/database/2026_08_04_order_quick_settings.sql; source C:/Code/PKD-DMG/database/2026_08_04_order_drafts.sql;"
```

3. Kiểm tra `config/database.php`. Mặc định đang dùng:

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pkd_dmg
DB_USERNAME=root
DB_PASSWORD=
```

4. Chạy web:

```powershell
php -S 127.0.0.1:8000 -t public
```

Hoặc chạy `run.bat`.

## Tài khoản seed

- Admin: `admin` / `admin123456`
- Nhân viên: `sale001` / `staff123456`

Sau khi đưa lên thật, đăng nhập admin và đổi mật khẩu ngay trong `Cài đặt`.

## Deploy hosting

- Trỏ document root của `pkd.dangmaghien.vn` vào thư mục `public/`.
- Nếu hosting không cho trỏ document root, upload toàn bộ source ngoài public_html và chỉ đưa nội dung `public/` vào public_html, sau đó chỉnh đường dẫn require trong `public/index.php` cho đúng vị trí `app/bootstrap.php`.
- Import `database/schema.sql` rồi `database/seed.sql` bằng charset `utf8mb4`.
- Cập nhật `config/database.php` hoặc biến môi trường `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`.

## Phạm vi V1

- Doanh thu báo cáo chỉ tính đơn `Đã hoàn thành`.
- Đơn `Đang xử lý` và `Đã gửi CN` là pipeline, hiển thị riêng.
- `Mang về` chỉ dùng thanh toán `COD` hoặc `Chuyển khoản`; `Khách ghé lấy` chỉ dùng `Thanh toán khi ghé lấy` hoặc `Đã thanh toán trước`.
- `Đặt bàn` lưu số lượng khách, thời gian, chi nhánh và ghi chú đặt bàn; không bắt buộc chọn món.
- Staff chỉ thấy đơn/báo cáo/tiếp cận của chính mình.
- Admin xem toàn team và quản lý tài khoản, chi nhánh, món, nguồn, thanh toán, trạng thái phụ, mẫu tin nhắn.
- Chưa tích hợp tự động Facebook/Zalo/Hotline; chỉ nhập chỉ số tiếp cận thủ công theo ngày + chi nhánh + kênh.
