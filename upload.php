<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
requirePost();

try {
    $payload = json_decode(file_get_contents('php://input') ?: '', true, 4, JSON_THROW_ON_ERROR);
    $image = $payload['image'] ?? '';
    if (!is_string($image) || !preg_match('#^data:image/jpeg;base64,([A-Za-z0-9+/=\r\n]+)$#', $image, $matches)) {
        jsonResponse(false, 'Format de capture invalide.', [], 422);
    }

    $binary = base64_decode($matches[1], true);
    if ($binary === false || strlen($binary) < 100 || strlen($binary) > MAX_UPLOAD_BYTES) {
        jsonResponse(false, 'La capture est invalide ou trop volumineuse.', [], 422);
    }

    $imageInfo = @getimagesizefromstring($binary);
    if ($imageInfo === false || ($imageInfo['mime'] ?? '') !== 'image/jpeg') {
        jsonResponse(false, 'Le contenu reçu n’est pas une image JPEG valide.', [], 422);
    }

    $filename = 'souvenir-' . bin2hex(random_bytes(16)) . '.jpg';
    $absolutePath = uploadDirectory() . DIRECTORY_SEPARATOR . $filename;
    if (file_put_contents($absolutePath, $binary, LOCK_EX) === false) {
        throw new RuntimeException('Échec de l’écriture du fichier.');
    }

    $filepath = 'uploads/' . $filename;
    try {
        $statement = db()->prepare('INSERT INTO photos (filename, filepath, media_type, title, description, source, is_published) VALUES (:filename, :filepath, :media_type, :title, :description, :source, :is_published)');
        $statement->execute([
            'filename' => $filename,
            'filepath' => $filepath,
            'media_type' => 'image',
            'title' => 'Le jour où tu as ouvert cet album',
            'description' => 'Un instant spontané, capturé avec ton accord.',
            'source' => 'webcam',
            'is_published' => 0,
        ]);
    } catch (Throwable $exception) {
        @unlink($absolutePath);
        throw $exception;
    }

    jsonResponse(true, 'Photo enregistrée', ['path' => $filepath, 'id' => (int) db()->lastInsertId()], 201);
} catch (JsonException) {
    jsonResponse(false, 'Requête JSON invalide.', [], 400);
} catch (Throwable $exception) {
    logServerError($exception);
    jsonResponse(false, 'Une erreur est survenue pendant l’enregistrement.', [], 500);
}
