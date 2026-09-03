<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
requireAdmin(false);
header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'");
?>
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?= htmlspecialchars(csrfToken(), ENT_QUOTES, 'UTF-8') ?>">
    <title>Administration — Notre album</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="admin-page">
    <header class="admin-topbar">
        <a class="brand" href="index.php"><span class="brand-mark">A</span><span>Notre album</span></a>
        <div class="admin-user">
            <span>Bonjour, <?= htmlspecialchars((string) $_SESSION['admin_username'], ENT_QUOTES, 'UTF-8') ?></span>
            <form action="logout.php" method="post">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken(), ENT_QUOTES, 'UTF-8') ?>">
                <button class="text-button" type="submit">Se déconnecter</button>
            </form>
        </div>
    </header>

    <main class="admin-main shell">
        <div class="admin-heading">
            <div><p class="eyebrow">Le jardin de vos souvenirs</p><h1>Votre collection</h1></div>
            <button class="button button-primary" id="show-upload" type="button">＋ Ajouter un média</button>
        </div>

        <section class="stats" aria-label="Statistiques">
            <article><span id="stat-total">—</span><p>Souvenirs au total</p></article>
            <article><span id="stat-images">—</span><p>Images</p></article>
            <article><span id="stat-videos">—</span><p>Vidéos</p></article>
            <article><span id="stat-upload">—</span><p>Ajouts manuels</p></article>
            <article><span id="stat-webcam">—</span><p>Captures à valider</p></article>
        </section>

        <section class="upload-panel" id="upload-panel" hidden aria-labelledby="upload-title">
            <div class="panel-copy"><p class="eyebrow">Un nouveau chapitre</p><h2 id="upload-title">Ajouter un souvenir</h2><p>Images jusqu’à 8 Mo · vidéos jusqu’à 40 Mo.</p></div>
            <form id="upload-form" class="upload-form" enctype="multipart/form-data">
                <input type="hidden" name="csrf_token" value="<?= htmlspecialchars(csrfToken(), ENT_QUOTES, 'UTF-8') ?>">
                <label class="drop-zone" id="drop-zone">
                    <input type="file" name="photo" id="photo-input" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,video/x-m4v" required>
                    <img id="photo-preview" alt="Aperçu de la photo" hidden>
                    <video id="video-preview" muted playsinline controls hidden aria-label="Aperçu de la vidéo"></video>
                    <span class="drop-prompt" id="drop-prompt"><b>Choisir une photo ou une vidéo</b><small>ou la déposer ici · JPG, PNG, WEBP, MP4, WEBM, MOV</small></span>
                </label>
                <div class="form-fields">
                    <label>Titre<input type="text" name="title" maxlength="150" placeholder="Notre premier voyage…" required></label>
                    <label>Date du souvenir <input type="date" name="memory_date"><small>Laissez vide pour utiliser la date d’aujourd’hui.</small></label>
                    <label>Description<textarea name="description" maxlength="1000" rows="4" placeholder="L’histoire derrière cette photo…"></textarea></label>
                    <div class="form-actions"><button class="button button-quiet" id="cancel-upload" type="button">Annuler</button><button class="button button-primary" type="submit">Ajouter à l’album</button></div>
                </div>
            </form>
        </section>

        <section class="admin-gallery-section pending-section" id="pending-section" aria-labelledby="pending-title" hidden>
            <div class="admin-section-title">
                <div><p class="eyebrow">Espace privé</p><h2 id="pending-title">Captures webcam à valider</h2></div>
                <span id="pending-count-label"></span>
            </div>
            <p class="pending-help">Ces photos ne sont pas visibles dans l’album. Choisissez celles que vous souhaitez publier.</p>
            <div class="admin-gallery" id="pending-gallery" aria-live="polite"></div>
        </section>

        <section class="admin-gallery-section" aria-labelledby="collection-title">
            <div class="admin-section-title"><h2 id="collection-title">Dans l’album</h2><span id="photo-count-label"></span></div>
            <div class="admin-gallery" id="admin-gallery" aria-live="polite" aria-busy="true"></div>
        </section>
    </main>

    <div class="toast" id="toast" role="status" aria-live="polite" hidden><div class="toast-icon">♥</div><div><strong id="toast-title"></strong><p id="toast-message"></p></div></div>
    <script src="assets/js/app.js" defer></script>
</body>
</html>
