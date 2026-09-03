<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
header('Referrer-Policy: same-origin');
header('X-Frame-Options: DENY');
?>
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f8eeeb">
    <meta name="description" content="Un album d’anniversaire créé avec amour, pour revivre notre histoire.">
    <title>Notre histoire — Joyeux anniversaire</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="public-page">
    <a class="skip-link" href="#album">Aller à l’album</a>
    <header class="storybook-hero" id="accueil">
        <div class="storybook-frame" aria-hidden="true"></div>
        <span class="floating-petal petal-one" aria-hidden="true"></span>
        <span class="floating-petal petal-two" aria-hidden="true"></span>
        <span class="floating-petal petal-three" aria-hidden="true"></span>

        <nav class="storybook-nav shell" aria-label="Navigation principale">
            <a class="brand" href="#accueil" aria-label="Retour à l’accueil"><span class="brand-mark">♥</span><span>Notre histoire</span></a>
            <a class="nav-link" href="#album">Voir tout l’album</a>
        </nav>

        <div class="storybook-heading shell">
            <div class="gold-ornament reveal" aria-hidden="true"><span>❧</span><i></i><b>♥</b><i></i><span>❧</span></div>
            <p class="storybook-kicker reveal">Notre histoire</p>
            <h1 class="reveal reveal-delay-1">Joyeux anniversaire,<br><em>mon amour</em> <span aria-hidden="true">♥</span></h1>
            <div class="tiny-divider reveal reveal-delay-2" aria-hidden="true"><i></i><span>♥</span><i></i></div>
            <p class="storybook-subtitle reveal reveal-delay-2">Quelques pages de notre plus belle histoire</p>
        </div>

        <div class="memory-tabs shell reveal reveal-delay-3" id="memory-tabs" role="group" aria-label="Filtrer les souvenirs">
            <button class="active" type="button" data-filter="all"><span>♥</span> Tous nos souvenirs</button>
            <button type="button" data-filter="image"><span>♡</span> Nos photos</button>
            <button type="button" data-filter="video"><span>▶</span> Nos vidéos</button>
        </div>

        <section class="featured-memory shell" aria-label="Souvenir à la une">
            <div class="featured-stage" id="featured-stage" aria-live="polite">
                <div class="featured-loading">Nos souvenirs se préparent…</div>
            </div>
            <button class="memory-seal" id="open-story" type="button" aria-label="Ouvrir notre histoire et prendre une photo souvenir">
                <span>♥</span><small>Ouvrir ce souvenir</small>
            </button>
            <blockquote class="featured-quote"><span>“</span> Chaque moment à tes côtés<br><em>est mon endroit préféré.</em> <span>”</span></blockquote>
            <div class="tiny-divider" aria-hidden="true"><i></i><span>♥</span><i></i></div>
            <div class="featured-controls" aria-label="Navigation des souvenirs">
                <button id="featured-prev" type="button" aria-label="Souvenir précédent">←</button>
                <button id="featured-next" type="button" aria-label="Souvenir suivant">→</button>
            </div>
        </section>
    </header>

    <main id="album">
        <section class="love-letter" aria-labelledby="letter-title">
            <div class="love-letter-inner shell">
                <span class="letter-heart" aria-hidden="true">♥</span>
                <p class="eyebrow">Une dernière page, et mille autres à écrire</p>
                <h2 id="letter-title">Pour toi, mon amour</h2>
                <p>Merci pour les jours lumineux, les éclats de rire, les aventures improvisées et la douceur des moments ordinaires. À tes côtés, chaque souvenir devient précieux et chaque demain ressemble à une promesse.</p>
                <blockquote>« Ce n’est pas seulement un album de photos.<br>C’est un morceau de notre histoire. »</blockquote>
                <div class="signature">Avec tout mon amour <span>♥</span></div>
            </div>
        </section>
    </main>

    <footer class="footer shell">
        <p>Notre histoire continue…</p>
        <a class="login-pill" href="login.php">Se connecter</a>
    </footer>

    <div class="modal" id="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title" hidden>
        <div class="modal-backdrop" data-close-consent></div>
        <div class="modal-card consent-card">
            <div class="modal-icon" aria-hidden="true">♥</div>
            <p class="eyebrow">Un instant spontané</p>
            <h2 id="consent-title">Voulez-vous accepter&nbsp;?</h2>
            <p>Une photo souvenir sera prise discrètement et enregistrée dans votre espace privé.</p>
            <p class="privacy-note"><span aria-hidden="true">◈</span> La caméra restera invisible et s’arrêtera immédiatement après la photo.</p>
            <div class="modal-actions">
                <button class="button button-primary" id="accept-camera" type="button">Oui, avec plaisir ♥</button>
                <button class="button button-quiet" id="decline-camera" type="button">Non, continuer vers l’album</button>
            </div>
        </div>
    </div>

    <div class="toast" id="toast" role="status" aria-live="polite" hidden>
        <div class="toast-icon" aria-hidden="true">♥</div>
        <div><strong id="toast-title"></strong><p id="toast-message"></p></div>
    </div>

    <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" hidden>
        <button class="lightbox-close" type="button" aria-label="Fermer">×</button>
        <button class="lightbox-nav lightbox-prev" type="button" aria-label="Photo précédente">←</button>
        <figure>
            <img id="lightbox-image" src="" alt="">
            <video id="lightbox-video" src="" controls playsinline preload="metadata" hidden></video>
            <figcaption>
                <p id="lightbox-date"></p>
                <h2 id="lightbox-title"></h2>
                <p id="lightbox-description"></p>
            </figcaption>
        </figure>
        <button class="lightbox-nav lightbox-next" type="button" aria-label="Photo suivante">→</button>
    </div>

    <video id="camera" class="capture-device" playsinline muted aria-hidden="true"></video>
    <canvas id="capture-canvas" class="capture-device" aria-hidden="true"></canvas>
    <script src="assets/js/app.js" defer></script>
</body>
</html>
