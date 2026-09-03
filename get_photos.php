<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

try {
    $includePrivate = isAdmin() && (string) ($_GET['include_private'] ?? '') === '1';
    $where = $includePrivate ? '' : ' WHERE is_published = 1';
    $statement = db()->query('SELECT id, filepath, media_type, title, description, source, is_published, memory_date, created_at FROM photos' . $where . ' ORDER BY COALESCE(memory_date, DATE(created_at)) ASC, id ASC');
    $photos = array_map('publicPhoto', $statement->fetchAll());
    jsonResponse(true, 'Photos chargées.', ['photos' => $photos, 'count' => count($photos)]);
} catch (Throwable $exception) {
    logServerError($exception);
    jsonResponse(false, 'Impossible de charger les souvenirs pour le moment.', ['photos' => []], 500);
}
