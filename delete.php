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
    $pdo = db();
    $statement = $pdo->prepare('SELECT filename FROM photos WHERE id = :id');
    $statement->execute(['id' => $id]);
    $photo = $statement->fetch();
    if (!$photo) {
        jsonResponse(false, 'Cette photo n’existe plus.', [], 404);
    }

    $filename = basename((string) $photo['filename']);
    $absolutePath = uploadDirectory() . DIRECTORY_SEPARATOR . $filename;
    $pdo->beginTransaction();
    $delete = $pdo->prepare('DELETE FROM photos WHERE id = :id');
    $delete->execute(['id' => $id]);
    if (is_file($absolutePath) && !unlink($absolutePath)) {
        throw new RuntimeException('Le fichier ne peut pas être supprimé.');
    }
    $pdo->commit();
    jsonResponse(true, 'Photo supprimée.', ['id' => $id]);
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    logServerError($exception);
    jsonResponse(false, 'Impossible de supprimer la photo.', [], 500);
}
