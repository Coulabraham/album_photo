<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

if (isAdmin()) {
    header('Location: admin.php');
    exit;
}

$error = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $attempts = (int) ($_SESSION['login_attempts'] ?? 0);
    $lastAttempt = (int) ($_SESSION['last_login_attempt'] ?? 0);
    if ($attempts >= 5 && time() - $lastAttempt < 300) {
        $error = 'Trop de tentatives. Patientez cinq minutes.';
    } elseif (!hash_equals(csrfToken(), (string) ($_POST['csrf_token'] ?? ''))) {
        $error = 'La session a expiré. Réessayez.';
    } else {
        $_SESSION['last_login_attempt'] = time();
        try {
            $username = cleanText((string) ($_POST['username'] ?? ''), 80);
            $statement = db()->prepare('SELECT id, username, password_hash FROM admins WHERE username = :username LIMIT 1');
            $statement->execute(['username' => $username]);
            $admin = $statement->fetch();
            if ($admin && password_verify((string) ($_POST['password'] ?? ''), $admin['password_hash'])) {
                session_regenerate_id(true);
                $_SESSION['admin_id'] = (int) $admin['id'];
                $_SESSION['admin_username'] = (string) $admin['username'];
                $_SESSION['admin_authenticated'] = true;
                $_SESSION['login_attempts'] = 0;
                unset($_SESSION['csrf_token']);
                header('Location: admin.php');
                exit;
            }
            $_SESSION['login_attempts'] = $attempts + 1;
            $error = 'Identifiants incorrects.';
        } catch (Throwable $exception) {
            logServerError($exception);
            $error = 'Connexion au service indisponible.';
        }
    }
}
header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'");
?>
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Connexion — Notre album</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="auth-page">
    <main class="auth-shell">
        <a class="back-link" href="index.php">← Retour à l’album</a>
        <section class="auth-card">
            <div class="modal-icon" aria-hidden="true">A</div>
            <p class="eyebrow">Espace privé</p>
            <h1>Bienvenue</h1>
            <p class="auth-intro">Connectez-vous pour prendre soin de vos souvenirs.</p>
            <?php if ($error !== ''): ?><div class="form-alert" role="alert"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
            <form method="post" class="stack-form">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken(), ENT_QUOTES, 'UTF-8') ?>">
                <label>Nom d’utilisateur<input name="username" type="text" autocomplete="username" required autofocus></label>
                <label>Mot de passe<input name="password" type="password" autocomplete="current-password" required></label>
                <button class="button button-primary" type="submit">Ouvrir l’espace privé</button>
            </form>
        </section>
    </main>
</body>
</html>
