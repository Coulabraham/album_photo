<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit('Not found');
}

$username = cleanText((string) ($argv[1] ?? 'admin'), 80);
$password = (string) ($argv[2] ?? '');

if ($username === '' || mb_strlen($password) < 12) {
    fwrite(STDERR, "Usage : php create_admin.php <utilisateur> <mot-de-passe-de-12-caracteres-minimum>\n");
    exit(1);
}

try {
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $statement = db()->prepare(
        'INSERT INTO admins (username, password_hash) VALUES (:username, :password_hash) '
        . 'ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)'
    );
    $statement->execute(['username' => $username, 'password_hash' => $hash]);
    fwrite(STDOUT, "Le compte administrateur « {$username} » est prêt.\n");
} catch (Throwable $exception) {
    logServerError($exception);
    fwrite(STDERR, "Impossible de créer le compte administrateur. Vérifiez la base de données.\n");
    exit(1);
}
