# PKD ĐMG - Web vận hành nội bộ

Web PHP nội bộ cho Team PKD **Đắng Mà Ghiền**. Dự án dùng để sale/PKD tạo đơn nhanh, gửi mẫu đơn cho chi nhánh/khách hàng, theo dõi trạng thái đơn, quản lý khách hàng/blacklist, nhập số liệu tiếp cận và xem báo cáo vận hành.

> Tài liệu này là README tổng cho toàn bộ dự án. Mục tiêu là giúp người mới vào dự án hiểu nhanh hệ thống, cách chạy local, cách deploy, các module chính và nguyên tắc phát triển an toàn.

---

## 1. Tổng quan nhanh

### Mục tiêu hệ thống

Hệ thống được thiết kế cho quy trình vận hành order nội bộ:

1. Sale/PKD tiếp nhận khách từ hotline, Zalo, Facebook, TikTok hoặc kênh khác.
2. Sale tạo đơn trên web.
3. Web sinh mẫu **Copy gửi CN** để gửi cho chi nhánh chế biến/chuẩn bị đơn.
4. Web sinh mẫu **Copy gửi KH** để xác nhận lại với khách.
5. Đơn đi qua pipeline trạng thái: **Đang xử lý → Đã gửi CN → Hoàn thành / Hủy**.
6. Admin xem đơn, báo cáo, nhân viên, chi nhánh, menu, mẫu copy và cấu hình hệ thống.

### Đối tượng sử dụng

- **Staff/Sale**: tạo đơn, làm tiếp đơn đang xử lý, gửi CN/KH, hoàn thành đơn, xem đơn của mình, nhập tiếp cận.
- **Admin**: xem toàn bộ team, quản lý nhân viên, chi nhánh, menu, danh mục, mẫu copy, báo cáo, blacklist.

### Stack kỹ thuật

- Backend: PHP custom mini MVC.
- Database: MySQL/MariaDB, charset `utf8mb4`.
- Frontend: HTML/CSS/JavaScript thuần.
- Local server: PHP built-in server hoặc XAMPP.
- Production dự kiến: Hostinger/shared hosting.

---

## 2. Tính năng chính

### 2.1. Đăng nhập và phân quyền

- Đăng nhập bằng tài khoản nhân viên.
- Vai trò:
  - `admin`: quản lý toàn hệ thống.
  - `staff`: chỉ thao tác/xem dữ liệu thuộc phạm vi của mình.
- Admin tạo/sửa tài khoản tại `/settings/users`.

### 2.2. Tạo đơn nhanh

Màn hình chính: `/orders/create`

Các loại đơn:

- **Mang về**: đơn giao/ship.
- **Khách ghé lấy**: khách tự ghé chi nhánh nhận món.
- **Đặt bàn**: khách đặt bàn tại chi nhánh.

Luồng thao tác nhanh:

```text
Vào /orders/create
→ nếu có đơn Đang xử lý thì mở đơn đang xử lý
→ nếu không có đơn Đang xử lý thì tự tạo 1 đơn trống
→ sale nhập thông tin
→ Copy gửi CN / Copy gửi KH / Hoàn thành
```

Nguyên tắc UX của màn tạo đơn:

- Sale thao tác cường độ cao nên hạn chế reload trang.
- Luôn đảm bảo form đang nhập thuộc về một đơn thật có `order_id`.
- Sau khi gửi CN/hoàn thành, hệ thống ưu tiên mở đơn `Đang xử lý` còn lại; nếu không còn mới tạo đơn trống mới.
- Card đơn `Đang xử lý` có thể xóa bằng nút **X** nếu tạo nhầm hoặc bỏ đơn.

### 2.3. Mẫu copy gửi CN / gửi KH

Mẫu copy được cấu hình trong admin tại:

```text
/settings/system
→ Mẫu copy đơn hàng
```

Hệ thống hỗ trợ tách mẫu theo loại đơn:

1. Đơn mang về
   - Mẫu gửi chi nhánh
   - Mẫu gửi khách hàng
2. Đơn ghé lấy
   - Mẫu gửi chi nhánh
   - Mẫu gửi khách hàng
3. Đơn đặt bàn
   - Mẫu gửi chi nhánh
   - Mẫu gửi khách hàng

Các biến mẫu thường dùng:

| Biến | Ý nghĩa |
|---|---|
| `{customer_name}` | Tên khách |
| `{phone}` | Số điện thoại |
| `{address}` | Địa chỉ giao |
| `{branch}` | Chi nhánh |
| `{items}` | Danh sách món |
| `{total_line}` | Dòng tổng tiền/tổng bill |
| `{total}` | Chỉ giá trị tổng tiền |
| `{delivery_time}` | Thời gian giao, mặc định `Giao ngay` |
| `{pickup_time}` | Thời gian khách ghé lấy |
| `{receive_time}` | Thời gian nhận chung |
| `{payment}` | Hình thức thanh toán |
| `{branch_footer}` | Lưu ý nhanh + tag `@` |
| `{guest_count}` | Số lượng khách đặt bàn |
| `{note}` | Ghi chú |

Các tùy chọn hiện có:

- Gửi CN: bật/tắt giá sau từng món.
- Gửi CN: bật/tắt dòng tổng tiền.
- Gửi KH: bật/tắt giá sau từng món.
- Gửi KH: bật/tắt dòng tổng bill.
- Lưu ý nhanh.
- Lưu ý theo điều kiện: CK/COD/hẹn giờ.
- Tag mặc định hoặc tag riêng theo chi nhánh.

### 2.4. Quản lý đơn hàng

Màn hình: `/orders`

- Xem danh sách đơn.
- Lọc theo trạng thái, nhân viên, ngày, chi nhánh.
- Theo dõi pipeline trạng thái.
- Admin có thể xem toàn bộ team.
- Staff chỉ thấy đơn của mình.

Các trạng thái workflow chính:

```text
processing  → Đang xử lý
sent        → Đã gửi CN
completed   → Hoàn thành
cancelled   → Đã hủy
```

### 2.5. Chi tiết đơn

Màn hình: `/orders/{id}`

- Xem thông tin khách.
- Xem danh sách món.
- Xem trạng thái đơn.
- Xem lịch sử khách hàng theo số điện thoại.
- Thao tác blacklist theo từng đơn.
- Admin có công cụ quản trị nâng cao như phân lại người tạo hoặc xóa đơn tùy quyền.

### 2.6. Khách hàng và blacklist

- Hệ thống tự ghi nhận khách theo số điện thoại khi tạo đơn.
- Xem lịch sử mua hàng của khách trong lúc nhập đơn.
- Blacklist theo từng đơn, có lý do.
- Trang blacklist: `/customers/blacklist`.

### 2.7. Tiếp nhận và báo cáo

- Nhập số liệu tiếp cận theo ngày, chi nhánh, kênh.
- Xem báo cáo doanh thu/đơn hàng/hiệu suất.
- Doanh thu báo cáo chỉ nên tính đơn `Hoàn thành`.
- Có báo cáo số khách ước tính dựa trên trường `estimated_guest_count` của món lẩu.

### 2.8. Cài đặt admin

Trang trung tâm:

```text
/settings
```

Các trang con:

```text
/settings/system    → Cài đặt hệ thống, mẫu copy, tạo đơn nhanh
/settings/users     → Tài khoản nhân viên
/settings/branches  → Chi nhánh
/settings/catalogs  → Danh mục món, nguồn đơn, thanh toán, trạng thái
/settings/menu      → Món ăn, tên gửi CN/KH, giá, số khách ước tính
/settings/messages  → Tin nhắn mẫu
/settings/all       → Trang cài đặt đầy đủ cũ, dùng dự phòng
```

---

## 3. Cấu trúc thư mục

```text
PKD-DMG/
├─ app/
│  ├─ Controllers/       # Controller xử lý route/request
│  ├─ Core/              # Auth, Database, Controller, CSRF, helper lõi
│  ├─ Models/            # Query DB và business logic
│  ├─ Views/             # Giao diện PHP view
│  └─ bootstrap.php      # Nạp config, helper, autoload nội bộ
├─ config/
│  ├─ app.php            # APP_NAME, APP_URL, APP_VERSION, timezone...
│  └─ database.php       # Cấu hình DB qua ENV hoặc fallback local
├─ database/
│  ├─ schema.sql         # Schema nền
│  ├─ seed.sql           # Dữ liệu seed ban đầu
│  └─ 2026_*.sql         # Migration bổ sung theo thời gian
├─ public/
│  ├─ index.php          # Front controller + route chính
│  ├─ .htaccess          # Rewrite khi deploy Apache/Hostinger
│  └─ assets/
│     ├─ css/            # CSS giao diện
│     ├─ js/             # JavaScript màn tạo đơn/settings/...
│     └─ images/         # Logo, ảnh món, assets giao diện
├─ scripts/              # Script hỗ trợ dev/admin nếu có
├─ .env.example          # Mẫu biến môi trường, không chứa secret thật
├─ README.md             # Tài liệu tổng dự án
└─ run.bat               # Chạy local nhanh trên Windows nếu có
```

---

## 4. Cài đặt local

### 4.1. Yêu cầu máy local

- PHP 8.1+ hoặc 8.2+.
- MySQL/MariaDB.
- XAMPP nếu chạy trên Windows.
- Git.

### 4.2. Clone repo và chọn nhánh dev

```bash
git clone https://github.com/tinonguyen15/PKD-DMG.git
cd PKD-DMG
git checkout dev/order-ui-test
```

Nếu repo đã có sẵn:

```bash
git fetch origin
git checkout dev/order-ui-test
git pull origin dev/order-ui-test
```

### 4.3. Tạo file `.env`

Copy file mẫu:

```bash
cp .env.example .env
```

Trên Windows có thể dùng:

```powershell
copy .env.example .env
```

Ví dụ `.env` local:

```env
APP_NAME="PKD ĐMG"
APP_ENV=local
APP_VERSION=1.7.38
APP_URL=http://localhost:8000
APP_DEBUG=true
APP_TIMEZONE=Asia/Ho_Chi_Minh
APP_SESSION_NAME=pkd_dmg_session

DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pkd_dmg
DB_USERNAME=root
DB_PASSWORD=
```

> Không commit file `.env` thật lên GitHub.

### 4.4. Import database local

Tạo DB mới từ schema + seed:

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' --default-character-set=utf8mb4 -u root -e "DROP DATABASE IF EXISTS pkd_dmg; CREATE DATABASE pkd_dmg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE pkd_dmg; source C:/Code/PKD-DMG/database/schema.sql; source C:/Code/PKD-DMG/database/seed.sql;"
```

Nếu đang có DB cũ, import thêm các migration trong thư mục `database/` theo thứ tự ngày tăng dần, ví dụ:

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' --default-character-set=utf8mb4 -u root -e "USE pkd_dmg; source C:/Code/PKD-DMG/database/2026_08_04_order_form_update.sql; source C:/Code/PKD-DMG/database/2026_08_04_user_preferences.sql; source C:/Code/PKD-DMG/database/2026_08_04_notice_templates.sql; source C:/Code/PKD-DMG/database/2026_08_04_notice_conditions.sql; source C:/Code/PKD-DMG/database/2026_08_04_order_quick_settings.sql; source C:/Code/PKD-DMG/database/2026_08_05_customers.sql; source C:/Code/PKD-DMG/database/2026_08_05_blacklist_audit.sql; source C:/Code/PKD-DMG/database/2026_08_05_blacklist_entries.sql;"
```

Khi không chắc DB đang thiếu migration nào, ưu tiên backup DB trước rồi import lần lượt các file migration theo ngày.

### 4.5. Chạy web local

```bash
php -S 127.0.0.1:8000 -t public
```

Hoặc chạy:

```powershell
.\run.bat
```

Mở trình duyệt:

```text
http://localhost:8000
```

---

## 5. Tài khoản seed

Tài khoản seed mặc định có thể thay đổi theo `database/seed.sql`, nhưng bản đầu thường có:

```text
Admin: admin / admin123456
Staff: sale001 / staff123456
```

Sau khi deploy thật:

1. Đăng nhập admin.
2. Vào `/settings/users`.
3. Đổi mật khẩu admin.
4. Tắt/xóa tài khoản demo nếu không dùng.

---

## 6. Deploy lên Hostinger/shared hosting

### 6.1. Nguyên tắc bảo mật khi deploy

- Không đưa `.env` chứa mật khẩu thật lên GitHub.
- Không public thư mục `app/`, `config/`, `database/` nếu hosting cho phép tách document root.
- Document root nên trỏ vào thư mục `public/`.
- Nếu không trỏ được document root, cần dùng root `index.php`/`.htaccess` phù hợp để route request an toàn.

### 6.2. Các bước deploy gợi ý

1. Pull code nhánh ổn định cần deploy.
2. Upload source lên hosting.
3. Tạo database MySQL trên Hostinger.
4. Import `database/schema.sql`, `database/seed.sql`, sau đó import migration còn thiếu.
5. Tạo `.env` trên server:

```env
APP_NAME="PKD ĐMG"
APP_ENV=production
APP_VERSION=1.7.38
APP_URL=https://ten-domain-cua-ban.vn
APP_DEBUG=false
APP_TIMEZONE=Asia/Ho_Chi_Minh
APP_SESSION_NAME=pkd_dmg_session

DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=ten_database
DB_USERNAME=ten_user
DB_PASSWORD=mat_khau_that
```

6. Kiểm tra đăng nhập.
7. Kiểm tra tạo đơn/copy gửi CN/KH.
8. Đổi mật khẩu admin.

---

## 7. Quy trình Git/branch

### 7.1. Nhánh chính

- `main`: nhánh production/stable, không sửa trực tiếp khi web đang có người dùng thật.
- `dev/order-ui-test`: nhánh test UI/order hiện tại.

### 7.2. Nguyên tắc làm việc an toàn

- Mọi thay đổi code/test UI nên làm ở `dev/order-ui-test` trước.
- Không push thẳng lên `main` nếu chưa được xác nhận.
- Trước khi test local luôn pull đúng nhánh:

```bash
git fetch origin
git checkout dev/order-ui-test
git pull origin dev/order-ui-test
```

- Sau khi test ổn mới cân nhắc merge sang `main`.

### 7.3. Gợi ý commit message

```text
feat: add order template settings
fix: prevent copy button reload on order create
ui: redesign system settings page
docs: update project readme
```

---

## 8. Các route quan trọng

### Public/auth

```text
/login
/logout
```

### Dashboard và nghiệp vụ

```text
/                       → Tổng quan
/orders/create          → Tạo đơn nhanh
/orders                 → Danh sách đơn
/orders/{id}            → Chi tiết đơn
/customers/blacklist    → Danh sách blacklist
/contacts               → Tiếp nhận/liên hệ
/reports                → Báo cáo
/reports/export         → Xuất báo cáo
```

### Settings/admin

```text
/settings               → Trung tâm cài đặt
/settings/system        → Cài đặt hệ thống
/settings/users         → Tài khoản nhân viên
/settings/branches      → Chi nhánh
/settings/catalogs      → Danh mục chung
/settings/menu          → Món ăn
/settings/messages      → Tin nhắn mẫu
/settings/all           → Trang cài đặt đầy đủ dự phòng
```

### API/AJAX nội bộ màn tạo đơn

```text
/orders/new-processing-json
/orders/{id}/edit-data
/orders/{id}/autosave
/orders/{id}/reopen-edit-json
/orders/{id}/status
/orders/{id}/delete-processing
/orders/customer-lookup
/orders/customer-blacklist
```

---

## 9. Module quan trọng cho dev

### 9.1. Order

Controller/model/view chính:

```text
app/Controllers/OrderController.php
app/Controllers/OrderWorkspaceController.php
app/Controllers/OrderAutosaveController.php
app/Models/OrderModel.php
app/Models/OrderEditModel.php
app/Views/orders/create.php
app/Views/orders/index.php
app/Views/orders/show.php
```

JS/CSS liên quan:

```text
public/assets/js/order-create-flow.js
public/assets/js/order-open-orders.js
public/assets/js/order-cache-guard.js
public/assets/js/order-edit-mode.js
public/assets/js/menu-card-click.js
public/assets/css/order-create.css
public/assets/css/active-orders.css
```

Ghi chú:

- `order-create-flow.js`: luồng thao tác nhanh, tạo/mở/xóa đơn đang xử lý.
- `order-open-orders.js`: mở card đơn vào form, cache payload, fill form mượt.
- `order-cache-guard.js`: guard validate/copy/autosave, xử lý lỗi cache/dirty form.
- `menu-card-click.js`: click món và module dựng template copy `OrderCopyTemplates`.

### 9.2. Settings

```text
app/Controllers/SettingsController.php
app/Models/PreferenceModel.php
app/Views/settings/home.php
app/Views/settings/system.php
app/Views/partials/preference_fields.php
public/assets/css/settings-system.css
```

Ghi chú:

- `PreferenceModel` quản lý cấu hình hệ thống/user.
- `preference_fields.php` là partial dùng chung cho admin system settings và profile settings.
- Mẫu copy đơn hàng được lưu qua các key `copy_template_*`.

### 9.3. Customer/blacklist

```text
app/Models/CustomerModel.php
app/Models/CustomerBlacklistModel.php
app/Views/customers/blacklist.php
```

Migration liên quan:

```text
database/2026_08_05_customers.sql
database/2026_08_05_blacklist_audit.sql
database/2026_08_05_blacklist_entries.sql
```

---

## 10. Quy tắc nghiệp vụ hiện tại

### 10.1. Đơn mang về

Các trường nên có trước khi gửi CN/hoàn thành:

- Tên khách.
- SĐT đủ 10 số.
- Địa chỉ giao.
- Ít nhất 1 món.

Thời gian giao nếu bỏ trống thì mặc định là `Giao ngay`.

### 10.2. Đơn ghé lấy

Các trường nên có trước khi gửi CN/hoàn thành:

- Tên khách.
- Chi nhánh.
- Ít nhất 1 món.

SĐT không bắt buộc theo rule vận hành hiện tại.

### 10.3. Đơn đặt bàn

Các trường nên có:

- Tên khách.
- Chi nhánh.
- Số lượng khách.
- Thời gian.

Đơn đặt bàn không bắt buộc chọn món.

### 10.4. Copy gửi CN

- Dùng mẫu chi nhánh theo loại đơn.
- Tên món ưu tiên `branch_name` trong menu.
- Có thể bật/tắt giá từng món và dòng tổng tiền.
- Có thể thêm lưu ý nhanh, lưu ý theo điều kiện và tag `@`.
- Sau khi copy gửi CN, đơn chuyển sang `Đã gửi CN` theo flow hiện tại.

### 10.5. Copy gửi KH

- Dùng mẫu khách hàng theo loại đơn.
- Tên món ưu tiên `customer_name` trong menu.
- Có thể bật/tắt giá từng món và dòng tổng bill.
- Không tự đổi trạng thái đơn.

---

## 11. Checklist test sau mỗi lần sửa lớn

### Tạo đơn

```text
[ ] Vào /orders/create khi không có đơn đang xử lý → tự có 1 đơn trống
[ ] Vào /orders/create khi có đơn đang xử lý → tự mở đơn đang xử lý
[ ] Thêm món bằng click card
[ ] Sửa số lượng món
[ ] Sửa ghi chú món
[ ] Autosave không làm mất thông tin khi chuyển qua lại card đơn
```

### Copy/gửi trạng thái

```text
[ ] Copy gửi CN đủ điều kiện → copy được, có thông báo, chuyển Đã gửi CN
[ ] Copy gửi KH → copy được, có thông báo, không đổi trạng thái
[ ] Hoàn thành → không nhảy sang tổng quan, xóa khỏi màn tạo đơn, mở đơn tiếp theo
[ ] Thiếu trường bắt buộc → báo ngay tại field, không chỉ hiện toast góc màn hình
[ ] Clipboard fallback hoạt động nếu trình duyệt không cho navigator.clipboard
```

### Mẫu copy

```text
[ ] Sửa mẫu tại /settings/system → lưu được
[ ] Vào /orders/create → preview gửi CN ăn theo mẫu mới
[ ] Copy gửi KH ăn theo mẫu mới
[ ] Biến {items}, {total_line}, {branch_footer} render đúng
```

### Settings

```text
[ ] /settings hiển thị trung tâm cài đặt
[ ] /settings/system mở giao diện chuyên nghiệp, bảng biến dễ hiểu
[ ] /settings/users thêm/sửa nhân viên
[ ] /settings/menu sửa tên món, tên gửi CN/KH, giá
[ ] /settings/branches sửa chi nhánh
```

### Phân quyền

```text
[ ] Staff chỉ thấy đơn của mình
[ ] Admin thấy toàn bộ đơn/team
[ ] Staff không vào được trang admin settings
```

---

## 12. Lưu ý khi sửa code

### 12.1. Không trộn template copy với flow tạo đơn

Mẫu copy nên nằm ở nhóm cấu hình/template. Không nên hard-code mẫu trong nhiều file JS khác nhau, vì dễ phát sinh lỗi kiểu:

```text
Sửa flow tạo đơn → vô tình hỏng mẫu gửi CN/KH
```

Hiện tại frontend dùng module:

```js
window.OrderCopyTemplates = {
  branch,
  customer,
  updatePreview,
  money
}
```

Khi sửa mẫu, ưu tiên sửa trong admin `/settings/system` hoặc phần render template tập trung, không rải logic ở nhiều handler copy.

### 12.2. Hạn chế reload ở màn tạo đơn

Sale thao tác nhanh, nên các thao tác sau nên dùng AJAX/fetch:

- Tạo đơn trống.
- Mở đơn đang xử lý.
- Autosave.
- Copy gửi CN.
- Hoàn thành.
- Xóa đơn đang xử lý.

Chỉ reload khi thật sự cần thiết.

### 12.3. Cẩn thận cache dữ liệu đơn

Màn tạo đơn có cache payload để mở card nhanh. Nếu sửa form rồi chuyển qua lại đơn, cần đảm bảo dữ liệu dirty/autosave không bị payload cũ ghi đè.

### 12.4. Không commit secret

Không commit:

- `.env` thật.
- Mật khẩu database.
- Token/API key.
- File backup DB có dữ liệu khách hàng.

---

## 13. Troubleshooting

### 13.1. Trắng trang hoặc lỗi 500

Bật debug local:

```env
APP_DEBUG=true
APP_ENV=local
```

Kiểm tra:

- PHP version.
- Kết nối DB.
- File `.env`.
- Import migration thiếu.
- Quyền đọc/ghi file trên hosting.

### 13.2. Không đăng nhập được

Kiểm tra:

- DB đã import `seed.sql` chưa.
- Bảng `users` có tài khoản active không.
- Mật khẩu seed có bị đổi không.
- Session/cookie có bị domain sai không.

### 13.3. Copy gửi CN/KH không hoạt động

Kiểm tra:

- Form hiện tại có `order_id` chưa.
- Trình duyệt có chặn clipboard không.
- Có thông báo lỗi dưới cụm nút copy không.
- Console browser có lỗi JS không.
- File JS/CSS đã refresh theo `APP_VERSION` mới chưa.

### 13.4. Sửa CSS/JS nhưng trình duyệt không đổi

Tăng version trong `.env` local:

```env
APP_VERSION=1.7.xx
```

Sau đó hard refresh:

```text
Ctrl + Shift + R
```

---

## 14. Roadmap gợi ý

Các hướng có thể nâng cấp tiếp:

- Preview mẫu copy ngay trong admin bằng dữ liệu giả lập.
- Cho admin tạo nhiều template theo từng chi nhánh/kênh bán.
- Lưu lịch sử thay đổi mẫu copy.
- Thêm test tự động cho render template.
- Tối ưu màn tạo đơn cho tablet/mobile.
- Tích hợp Zalo OA/hotline/API ngoài nếu có nhu cầu.
- Xuất báo cáo nâng cao theo nhân viên, chi nhánh, khung giờ.

---

## 15. Người phụ trách và nguyên tắc vận hành

- Dự án phục vụ vận hành nội bộ PKD Đắng Mà Ghiền.
- Production có người dùng thật nên mọi thay đổi cần test kỹ trên nhánh dev trước.
- Khi sửa luồng tạo đơn/copy/trạng thái, luôn test lại checklist ở mục 11.
- Khi sửa database, luôn backup trước khi import migration lên production.
