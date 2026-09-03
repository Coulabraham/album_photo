<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
requirePost();
requireAdmin();
requireCsrf();

try {
    if (!isset($_FILES['photo']) || !is_array($_FILES['photo'])) {
        jsonResponse(false, 'Choisissez une photo ou une vidéo.', [], 422);
    }

    $file = $_FILES['photo'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        $messages = [
            UPLOAD_ERR_INI_SIZE => 'Le fichier dépasse la limite du serveur.',
            UPLOAD_ERR_FORM_SIZE => 'Le fichier est trop volumineux.',
            UPLOAD_ERR_PARTIAL => 'Le transfert du fichier est incomplet.',
            UPLOAD_ERR_NO_FILE => 'Choisissez une photo ou une vidéo.',
        ];
        jsonResponse(false, $messages[$file['error']] ?? 'Le transfert a échoué.', [], 422);
    }

    $originalName = (string) ($file['name'] ?? '');
    $clientExtension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov', 'm4v'];
    if (!in_array($clientExtension, $allowedExtensions, true)) {
        jsonResponse(false, 'Extension non autorisée.', [], 422);
    }

    $temporaryPath = (string) ($file['tmp_name'] ?? '');
    if (!is_uploaded_file($temporaryPath)) {
        jsonResponse(false, 'Fichier temporaire invalide.', [], 422);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($temporaryPath);
    $imageMimes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $videoMimes = ['video/mp4' => 'mp4', 'video/webm' => 'webm', 'video/quicktime' => 'mov', 'video/x-m4v' => 'm4v'];
    if (!is_string($mime) || (!isset($imageMimes[$mime]) && !isset($videoMimes[$mime]))) {
        jsonResponse(false, 'Le format réel du fichier n’est pas autorisé.', [], 422);
    }

    $extensionsByMime = [
        'image/jpeg' => ['jpg', 'jpeg'],
        'image/png' => ['png'],
        'image/webp' => ['webp'],
        'video/mp4' => ['mp4', 'm4v'],
        'video/webm' => ['webm'],
        'video/quicktime' => ['mov'],
        'video/x-m4v' => ['m4v'],
    ];
    if (!in_array($clientExtension, $extensionsByMime[$mime], true)) {
        jsonResponse(false, 'L’extension ne correspond pas au contenu réel du fichier.', [], 422);
    }

    $mediaType = isset($imageMimes[$mime]) ? 'image' : 'video';
    $size = (int) ($file['size'] ?? 0);
    $maximumSize = $mediaType === 'image' ? MAX_UPLOAD_BYTES : MAX_VIDEO_UPLOAD_BYTES;
    if ($size < 100 || $size > $maximumSize) {
        $limit = $mediaType === 'image' ? '8 Mo' : '40 Mo';
        jsonResponse(false, "Le fichier doit peser moins de {$limit}.", [], 422);
    }

    if ($mediaType === 'image' && @getimagesize($temporaryPath) === false) {
        jsonResponse(false, 'Le contenu du fichier n’est pas une image valide.', [], 422);
    }
    if ($mediaType === 'video') {
        $signature = file_get_contents($temporaryPath, false, null, 0, 16);
        $isIsoVideo = is_string($signature) && strlen($signature) >= 12 && substr($signature, 4, 4) === 'ftyp';
        $isWebm = is_string($signature) && str_starts_with($signature, "\x1A\x45\xDF\xA3");
        if (!$isIsoVideo && !$isWebm) {
            jsonResponse(false, 'La signature de cette vidéo est invalide.', [], 422);
        }
    }

    $title = cleanText((string) ($_POST['title'] ?? ''), 150);
    $description = cleanText((string) ($_POST['description'] ?? ''), 1000);
    $memoryDate = trim((string) ($_POST['memory_date'] ?? ''));
    if ($title === '') {
        jsonResponse(false, 'Ajoutez un titre à ce souvenir.', [], 422);
    }
    if ($memoryDate !== '') {
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $memoryDate);
        if (!$date || $date->format('Y-m-d') !== $memoryDate) {
            jsonResponse(false, 'La date du souvenir est invalide.', [], 422);
        }
    } else {
        $memoryDate = null;
    }

    $extension = $mediaType === 'image' ? $imageMimes[$mime] : $videoMimes[$mime];
    $filename = ($mediaType === 'image' ? 'photo-' : 'video-') . bin2hex(random_bytes(16)) . '.' . $extension;
    $absolutePath = uploadDirectory() . DIRECTORY_SEPARATOR . $filename;
    if (!move_uploaded_file($temporaryPath, $absolutePath)) {
        throw new RuntimeException('Impossible de déplacer la photo transférée.');
    }

    $filepath = 'uploads/' . $filename;
    try {
        $statement = db()->prepare('INSERT INTO photos (filename, filepath, media_type, title, description, memory_date, source, is_published) VALUES (:filename, :filepath, :media_type, :title, :description, :memory_date, :source, :is_published)');
        $statement->execute(compact('filename', 'filepath', 'title', 'description') + ['media_type' => $mediaType, 'memory_date' => $memoryDate, 'source' => 'upload', 'is_published' => 1]);
        $photoId = (int) db()->lastInsertId();
        $photoStatement = db()->prepare('SELECT id, filepath, media_type, title, description, source, is_published, memory_date, created_at FROM photos WHERE id = :id');
        $photoStatement->execute(['id' => $photoId]);
        $photo = $photoStatement->fetch();
    } catch (Throwable $exception) {
        @unlink($absolutePath);
        throw $exception;
    }

    jsonResponse(true, 'Le souvenir a rejoint l’album.', ['photo' => publicPhoto($photo)], 201);
} catch (Throwable $exception) {
    logServerError($exception);
    jsonResponse(false, 'Impossible d’ajouter ce média.', [], 500);
}
