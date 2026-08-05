<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    echo "Script này chỉ chạy bằng CLI.\n";
    exit(1);
}

require dirname(__DIR__) . '/app/bootstrap.php';

use App\Core\Database;

$password = (string) (getenv('STAFF_ACCOUNT_PASSWORD') ?: '');
if (mb_strlen($password, 'UTF-8') < 8) {
    fwrite(STDERR, "Thiếu STAFF_ACCOUNT_PASSWORD hoặc mật khẩu dưới 8 ký tự.\n");
    fwrite(STDERR, "Ví dụ: STAFF_ACCOUNT_PASSWORD='mat-khau-tam' php scripts/create_staff_accounts.php\n");
    exit(1);
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$users = [
    ['NV001', 'luthithiet', 'Lữ Thị Thiết'],
    ['NV002', 'nguyenquochuy', 'Nguyễn Quốc Huy'],
    ['NV003', 'nguyenthitruongvy', 'Nguyễn Thị Trường Vy'],
    ['NV004', 'doanthithuykieu', 'Đoàn Thị Thúy Kiều'],
    ['NV005', 'nguyenhongtuquyen', 'Nguyễn Hồng Tú Quyên'],
    ['NV006', 'nguyenthimyduyen', 'Nguyễn Thị Mỹ Duyên'],
    ['NV007', 'nguyenhoangtramy', 'Nguyễn Hoàng Trà My'],
    ['NV008', 'truongthihongluu', 'Trương Thị Hồng Lưu'],
    ['NV009', 'tathiphuong', 'Tạ Thị Phượng'],
    ['NV010', 'maithilinh', 'Mai Thị Linh'],
];

foreach ($users as [$employeeCode, $username, $name]) {
    Database::execute(
        "INSERT INTO users (employee_code, username, password_hash, name, role, active)
         VALUES (?, ?, ?, ?, 'staff', 1)
         ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            active = 1,
            role = IF(role = 'admin', 'admin', VALUES(role)),
            password_hash = VALUES(password_hash),
            updated_at = CURRENT_TIMESTAMP",
        [$employeeCode, $username, $passwordHash, $name]
    );

    echo $employeeCode . ' | ' . $username . ' | ' . $name . PHP_EOL;
}

echo "Hoàn tất tạo/cập nhật " . count($users) . " tài khoản nhân viên.\n";
