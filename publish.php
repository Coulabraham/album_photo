<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
requirePost();
requireAdmin();
requireCsrf();

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$id || $id < 1) {
    jsonResponse(false, 'Identifiant invalide.', [], 422);
}

try {
    $statement = db()->prepare('SELECT id, source, is_published FROM photos WHERE id = :id');
    $statement->execute(['id' => $id]);
    $photo = $statement->fetch();
    if (!$photo) {
        jsonResponse(false, 'Cette capture n’existe plus.', [], 404);
    }
    if ((bool) $photo['is_published']) {
        jsonResponse(true, 'Cette photo est déjà dans l’album.', ['id' => $id]);
    }

    $update = db()->prepare('UPDATE photos SET is_published = 1 WHERE id = :id');
    $update->execute(['id' => $id]);
    jsonResponse(true, 'La photo a été ajoutée à l’album.', ['id' => $id]);
} catch (Throwable $exception) {
    logServerError($exception);
    jsonResponse(false, 'Impossible d’ajouter cette photo à l’album.', [], 500);
}
