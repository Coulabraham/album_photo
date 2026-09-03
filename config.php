<?php
declare(strict_types=1);

// Configuration locale XAMPP. En production, utilisez de préférence les variables d'environnement.
const DB_HOST = '127.0.0.1';
const DB_NAME = 'anniversaire';
const DB_USER = 'root';
const DB_PASS = '';
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 40 * 1024 * 1024;

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('anniversaire_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('ANNIV_DB_HOST') ?: DB_HOST;
    $name = getenv('ANNIV_DB_NAME') ?: DB_NAME;
    $user = getenv('ANNIV_DB_USER') ?: DB_USER;
    $pass = getenv('ANNIV_DB_PASS');
    $pass = $pass === false ? DB_PASS : $pass;

    $pdo = new PDO(
        "mysql:host={$host};dbname={$name};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    return $pdo;
}

function jsonResponse(bool $success, string $message, array $data = [], int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode(['success' => $success, 'message' => $message] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requirePost(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        jsonResponse(false, 'Méthode non autorisée.', [], 405);
    }
}

function isAdmin(): bool
{
    return !empty($_SESSION['admin_id']) && !empty($_SESSION['admin_authenticated']);
}

function requireAdmin(bool $json = true): void
{
    if (isAdmin()) {
        return;
    }
    if ($json) {
        jsonResponse(false, 'Session expirée. Reconnectez-vous.', [], 401);
    }
    header('Location: login.php');
    exit;
}

function csrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function requireCsrf(): void
{
    $token = $_POST['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($token) || !hash_equals(csrfToken(), $token)) {
        jsonResponse(false, 'Jeton de sécurité invalide. Actualisez la page.', [], 403);
    }
}

function uploadDirectory(): string
{
    $directory = __DIR__ . DIRECTORY_SEPARATOR . 'uploads';
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        throw new RuntimeException('Le dossier de destination est indisponible.');
    }
    return $directory;
}

function publicPhoto(array $photo): array
{
    $memoryDate = !empty($photo['memory_date']) ? (string) $photo['memory_date'] : null;
    $timelineDate = $memoryDate ?: (string) $photo['created_at'];
    return [
        'id' => (int) $photo['id'],
        'filepath' => (string) $photo['filepath'],
        'media_type' => (string) ($photo['media_type'] ?? 'image'),
        'title' => (string) $photo['title'],
        'description' => (string) $photo['description'],
        'source' => (string) $photo['source'],
        'is_published' => (bool) ($photo['is_published'] ?? true),
        'memory_date' => $memoryDate,
        'created_at' => (string) $photo['created_at'],
        'year' => date('Y', strtotime($timelineDate)),
    ];
}

function cleanText(string $value, int $maxLength): string
{
    $value = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    if (mb_strlen($value) > $maxLength) {
        $value = mb_substr($value, 0, $maxLength);
    }
    return $value;
}

function logServerError(Throwable $exception): void
{
    error_log('[Album anniversaire] ' . $exception->getMessage());
}
