<?php

declare(strict_types=1);

class Database
{
    private static ?PDO $connection = null;

    public static function getConnection(): PDO
    {
        if (self::$connection === null) {
            $configPath = __DIR__ . '/config.local.php';
            if (!file_exists($configPath)) {
                $configPath = __DIR__ . '/config.example.php';
            }

            $config = require $configPath;

            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                $config['host'],
                $config['database'],
                $config['charset']
            );

            self::$connection = new PDO($dsn, $config['username'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);

            ensureTimelineHoldStatusEnum(self::$connection);
        }

        return self::$connection;
    }
}

function ensureTimelineHoldStatusEnum(PDO $db): void
{
    static $checked = false;
    if ($checked) {
        return;
    }

    try {
        $stmt = $db->query("SHOW COLUMNS FROM timeline_items LIKE 'status'");
        $column = $stmt !== false ? $stmt->fetch() : false;
        $type = is_array($column) ? (string) ($column['Type'] ?? '') : '';

        if ($type !== '' && stripos($type, 'hold') === false) {
            $db->exec(
                "ALTER TABLE timeline_items
                 MODIFY COLUMN status ENUM('pending', 'in_progress', 'hold', 'completed') DEFAULT 'pending'"
            );
        }
    } catch (Throwable $e) {
        // Migration can also be applied manually via database/migrations/add_status_hold.sql
    }

    $checked = true;
}
