# DMG Order & KPI

Chrome/Edge Extension Manifest V3 hỗ trợ nhân viên sale tạo đơn nhanh cho Lẩu Khổ Qua Rừng Đắng Mà Ghiền. Extension chạy hoàn toàn trong trình duyệt, không backend, không gửi dữ liệu khách hàng ra internet.

## Chức năng chính

- Tạo đơn mang về, khách ghé lấy hoặc khách đặt bàn.
- Chọn món bằng nút cộng/trừ và tính tổng thanh toán.
- Sao chép nội dung đơn gửi chi nhánh.
- Lưu lịch sử đơn local, dữ liệu vẫn còn sau khi tắt máy/mở lại trình duyệt.
- Gắn mã nhân viên vào đơn để xem KPI cuối ngày trên từng máy.
- Theo dõi đơn hàng theo nhóm `Đang xử lí`, `Đã gửi CN`, `Đã hoàn thành`.
- Xem KPI, lịch sử, mở lại, nhân bản, xóa và sao chép đơn cũ trong tab `Báo cáo`.
- Quản lý tin nhắn mẫu có biến lấy từ đơn hiện tại.
- Quản lý món ăn, chi nhánh, nhân viên, trạng thái, hình thức thanh toán.
- Quản lý nguồn đơn để phân luồng và lọc báo cáo.
- Quản lý tên món riêng cho nội dung gửi chi nhánh và gửi khách hàng.
- Xuất/nhập toàn bộ dữ liệu bằng JSON.

## Cấu trúc thư mục

```text
manifest.json
background.js
sidepanel.html
app.html
assets/css/styles.css
assets/js/app.js
assets/js/order.js
assets/js/history.js
assets/js/messages.js
assets/js/settings.js
assets/js/storage.js
assets/js/utils.js
assets/js/default-data.js
assets/icons/
```

## Cài đặt bằng Load unpacked

1. Mở Chrome hoặc Edge.
2. Vào `chrome://extensions` hoặc `edge://extensions`.
3. Bật `Developer mode`.
4. Chọn `Load unpacked`.
5. Chọn thư mục `C:\Code\Tool-Work-DMG`.
6. Bấm icon extension để mở Side Panel.

## Cách sử dụng nhanh

1. Vào `Cài đặt` -> `Nhân viên` để tạo và chọn mã nhân viên đang dùng.
2. Vào tab `Tạo đơn`.
3. Chọn loại đơn, nguồn đơn, nhập tên khách và số điện thoại.
4. Bấm cộng/trừ món để lên giỏ.
5. Bấm `Sao chép đơn` để gửi chi nhánh hoặc `Lưu đơn` để ghi lịch sử.

Mã nhân viên, tên khách hàng và số điện thoại là bắt buộc khi sao chép/lưu đơn.

## Đơn hàng

Vào tab `Đơn hàng` để theo dõi tiến độ xử lý đơn. Màn này tập trung vào việc xem còn bao nhiêu đơn đang xử lý và đơn nào đã hoàn thành.

Đơn hàng được chia thành 3 nhóm:

- `Đang xử lí`: đơn mới lưu.
- `Đã gửi CN`: đơn đã sao chép/gửi cho chi nhánh hoặc được chuyển thủ công.
- `Đã hoàn thành`: đơn đã xử lý xong.

Trong từng đơn có thể:

- Đổi nhanh hình thức thanh toán.
- Đổi nhanh trạng thái đơn.
- Chuyển tình trạng xử lý.
- Sao chép lại nội dung đơn.
- Mở đơn về màn `Tạo đơn` để chỉnh sửa thêm; bấm `Lưu đơn` sẽ cập nhật đơn cũ.

## Báo cáo KPI

Vào tab `Báo cáo`, chọn ngày và mã nhân viên để xem:

- Số đơn.
- Tổng doanh thu.
- Giá trị trung bình đơn.

Dữ liệu báo cáo nằm trên từng máy. Nếu nhân viên dùng nhiều máy, cần xem báo cáo trên đúng máy đã tạo đơn.

## Sao lưu và khôi phục

Vào `Cài đặt` -> `Dữ liệu`:

- `Xuất JSON`: tải file sao lưu toàn bộ dữ liệu.
- `Nhập JSON`: khôi phục dữ liệu từ file hợp lệ.
- `Xóa lịch sử đơn`: xóa riêng lịch sử.
- `Khôi phục mặc định`: đưa toàn bộ dữ liệu về mặc định.

## Quyền extension sử dụng

- `storage`: lưu dữ liệu local bằng `chrome.storage.local`.
- `sidePanel`: mở giao diện trong Chrome/Edge Side Panel.
- `clipboardWrite`: sao chép đơn và tin nhắn mẫu.

Extension không yêu cầu quyền đọc website, history, tabs hoặc dữ liệu trang web.

## Thêm món mới

Vào `Cài đặt` -> `Món ăn` -> `Thêm món`, nhập tên món, tên khi sao chép gửi chi nhánh, tên khi gửi khách hàng, giá, đơn vị, danh mục và placeholder ảnh.

Trong `Cài đặt` -> `Món ăn` có thể thêm, sửa, xóa và sắp xếp danh mục món. Chỉ xóa được danh mục khi không còn món nào đang dùng danh mục đó.

## Quy tắc ghi tắt món

Vào `Cài đặt` -> `Ghi tắt` để cấu hình cách hiện giá dạng `319k` hoặc hỗ trợ dữ liệu cũ chưa có tên gửi riêng. Tên gửi chính được chỉnh trong từng món ăn. Mỗi quy tắc gồm:

- Chữ cần khớp trong tên món.
- Tên xuất ra.
- Tùy chọn hiện giá dạng `319k`.

Ví dụ: `Khổ qua rừng nhồi` -> `Nhồi`, `Lẩu đặc biệt` -> `Lẩu đặc biệt 319k`.

## Thêm chi nhánh

Vào `Cài đặt` -> `Chi nhánh` -> `Thêm`, nhập tên chi nhánh, địa chỉ và số điện thoại nếu cần.

## Thêm nguồn đơn

Vào `Cài đặt` -> `Nguồn đơn` để thêm, sửa, xóa, sắp xếp hoặc chọn nguồn mặc định như Facebook, Zalo, Hotline, Google, Khách quen.

Ở tab `Tạo đơn`, nguồn đơn hiển thị thành các nút ngang để bấm chọn nhanh. Nguồn mặc định sẽ tự được chọn cho đơn mới.

## Thêm tin nhắn mẫu

Vào `Tin nhắn` -> `Thêm tin nhắn`, chọn danh mục, nhập tiêu đề và nội dung. Có thể dùng biến:

```text
{{ten_khach}}
{{so_dien_thoai}}
{{dia_chi}}
{{chi_nhanh}}
{{tong_tien}}
{{thoi_gian}}
{{danh_sach_mon}}
{{hinh_thuc_thanh_toan}}
```
