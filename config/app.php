<?php

return [
    'name' => getenv('APP_NAME') ?: 'PKD ĐMG',
    'env' => getenv('APP_ENV') ?: 'production',
    'version' => getenv('APP_VERSION') ?: '1.7.5',
    'base_url' => rtrim((string) (getenv('APP_URL') ?: ''), '/'),
    'timezone' => getenv('APP_TIMEZONE') ?: 'Asia/Ho_Chi_Minh',
    'debug' => filter_var(getenv('APP_DEBUG') ?: false, FILTER_VALIDATE_BOOLEAN),
    'session_name' => getenv('APP_SESSION_NAME') ?: 'pkd_dmg_session',
];
