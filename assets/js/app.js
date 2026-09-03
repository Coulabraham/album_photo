(() => {
    'use strict';

    const $ = (selector, root = document) => root.querySelector(selector);
    const endpoint = (name) => name;
    const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    let toastTimer;

    function formatDate(value) {
        const normalized = String(value).replace(' ', 'T');
        const date = new Date(normalized);
        return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
    }

    function showToast(title, message, duration = 3800) {
        const toast = $('#toast');
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.classList.remove('leaving');
        $('#toast-title').textContent = title;
        $('#toast-message').textContent = message;
        toast.hidden = false;
        toastTimer = window.setTimeout(() => {
            toast.classList.add('leaving');
            window.setTimeout(() => { toast.hidden = true; toast.classList.remove('leaving'); }, 420);
        }, duration);
    }

    async function request(url, options = {}) {
        const response = await fetch(endpoint(url), { headers: { Accept: 'application/json', ...(options.headers || {}) }, ...options });
        let data;
        try { data = await response.json(); } catch { throw new Error('Réponse serveur illisible.'); }
        if (!response.ok || !data.success) throw new Error(data.message || 'Une erreur est survenue.');
        return data;
    }

    function escapeSelector(value) {
        return window.CSS && CSS.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, '');
    }

    // Album public
    const publicExperience = $('#featured-stage');
    const gallery = $('#gallery');
    if (publicExperience) {
        let photos = [];
        let visiblePhotos = [];
        let featuredPhotos = [];
        let lightboxPhotos = [];
        let lightboxIndex = 0;
        let featuredIndex = 0;
        let selectedYear = 'all';
        let selectedFilter = 'all';
        let lastFocusedElement = null;

        function photosByKind() {
            if (selectedFilter === 'image' || selectedFilter === 'video') return photos.filter((photo) => photo.media_type === selectedFilter);
            if (selectedFilter === 'webcam' || selectedFilter === 'upload') return photos.filter((photo) => photo.source === selectedFilter);
            return photos;
        }

        const emptyAlbum = (message = 'Les premières pages attendent vos souvenirs.') => {
            if (!gallery) return;
            gallery.replaceChildren();
            const empty = document.createElement('div');
            empty.className = 'empty-album';
            const content = document.createElement('div');
            const mark = document.createElement('span');
            mark.className = 'empty-mark'; mark.textContent = '♡';
            const title = document.createElement('h3'); title.textContent = 'Une histoire prête à fleurir';
            const copy = document.createElement('p'); copy.textContent = message;
            content.append(mark, title, copy); empty.append(content); gallery.append(empty);
        };

        function photoCard(photo, index) {
            const card = document.createElement('button');
            card.type = 'button'; card.className = 'gallery-card'; card.dataset.id = photo.id;
            card.style.animationDelay = `${Math.min(index * 70, 420)}ms`;
            card.setAttribute('aria-label', `Agrandir : ${photo.title}`);
            const frame = document.createElement('span'); frame.className = 'photo-frame';
            let media;
            if (photo.media_type === 'video') {
                media = document.createElement('video');
                media.src = photo.filepath; media.muted = true; media.playsInline = true; media.preload = 'metadata';
                const play = document.createElement('span'); play.className = 'video-play'; play.textContent = '▶'; play.setAttribute('aria-hidden', 'true');
                frame.append(media, play);
            } else {
                media = document.createElement('img');
                media.src = photo.filepath; media.alt = photo.title; media.loading = index > 2 ? 'lazy' : 'eager'; media.decoding = 'async';
                frame.append(media);
            }
            const count = document.createElement('span'); count.className = 'photo-index'; count.textContent = String(index + 1).padStart(2, '0');
            frame.append(count);
            const copy = document.createElement('span'); copy.className = 'photo-copy';
            const words = document.createElement('span');
            const title = document.createElement('h3'); title.textContent = photo.title;
            const description = document.createElement('p'); description.textContent = photo.description || 'Un instant à garder près du cœur.';
            const date = document.createElement('span'); date.className = 'photo-date'; date.textContent = photo.year;
            words.append(title, description); copy.append(words, date); card.append(frame, copy);
            card.addEventListener('click', () => openLightbox(photo.id, visiblePhotos));
            return card;
        }

        function renderGallery(year = selectedYear) {
            selectedYear = year;
            const matchingKind = photosByKind();
            visiblePhotos = year === 'all' ? matchingKind : matchingKind.filter((photo) => photo.year === year);
            if (!gallery) return;
            gallery.replaceChildren();
            if (!visiblePhotos.length) { emptyAlbum('Aucun souvenir ne correspond encore à cette sélection.'); return; }
            const fragment = document.createDocumentFragment();
            visiblePhotos.forEach((photo, index) => fragment.append(photoCard(photo, index)));
            gallery.append(fragment);
        }

        function renderTimeline() {
            const timeline = $('#timeline');
            if (!timeline) return;
            const years = [...new Set(photosByKind().map((photo) => photo.year))];
            if (selectedYear !== 'all' && !years.includes(selectedYear)) selectedYear = 'all';
            timeline.replaceChildren();
            if (years.length < 2) return;
            const all = document.createElement('button'); all.type = 'button'; all.textContent = 'Toute notre histoire'; all.className = selectedYear === 'all' ? 'active' : ''; all.dataset.year = 'all';
            timeline.append(all);
            years.forEach((year) => {
                const button = document.createElement('button'); button.type = 'button'; button.textContent = year; button.dataset.year = year; button.classList.toggle('active', selectedYear === year); timeline.append(button);
            });
            timeline.onclick = (event) => {
                const button = event.target.closest('button'); if (!button) return;
                timeline.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
                renderGallery(button.dataset.year);
            };
        }

        function renderFeatured() {
            const stage = $('#featured-stage');
            featuredPhotos = photosByKind();
            stage.replaceChildren();
            if (!featuredPhotos.length) {
                const empty = document.createElement('div'); empty.className = 'featured-empty'; empty.textContent = 'Cette page attend encore son premier souvenir.'; stage.append(empty); return;
            }
            featuredIndex = ((featuredIndex % featuredPhotos.length) + featuredPhotos.length) % featuredPhotos.length;
            featuredPhotos.forEach((photo, index) => {
                let offset = index - featuredIndex;
                if (offset > featuredPhotos.length / 2) offset -= featuredPhotos.length;
                if (offset < -featuredPhotos.length / 2) offset += featuredPhotos.length;
                if (Math.abs(offset) > 2) return;
                const card = document.createElement('button'); card.type = 'button'; card.className = 'featured-card'; card.dataset.offset = String(offset); card.dataset.id = photo.id;
                card.setAttribute('aria-label', offset === 0 ? `Ouvrir ${photo.title}` : `Afficher ${photo.title}`);
                if (photo.media_type === 'video') {
                    const video = document.createElement('video'); video.src = photo.filepath; video.muted = true; video.playsInline = true; video.preload = 'metadata'; card.append(video);
                } else {
                    const image = document.createElement('img'); image.src = photo.filepath; image.alt = ''; image.loading = Math.abs(offset) > 1 ? 'lazy' : 'eager'; card.append(image);
                }
                const caption = document.createElement('span'); caption.className = 'featured-caption';
                const heart = document.createElement('span'); heart.textContent = photo.media_type === 'video' ? '▶' : '♥';
                const title = document.createElement('b'); title.textContent = photo.title;
                const description = document.createElement('small'); description.textContent = photo.description || 'Un instant gravé dans notre histoire.';
                caption.append(heart, title, description); card.append(caption);
                card.addEventListener('click', () => {
                    if (offset === 0) openLightbox(photo.id, featuredPhotos);
                    else { featuredIndex = index; renderFeatured(); }
                });
                stage.append(card);
            });
        }

        $('#featured-prev').addEventListener('click', () => { if (featuredPhotos.length) { featuredIndex -= 1; renderFeatured(); } });
        $('#featured-next').addEventListener('click', () => { if (featuredPhotos.length) { featuredIndex += 1; renderFeatured(); } });
        $('#memory-tabs').addEventListener('click', (event) => {
            const button = event.target.closest('button[data-filter]'); if (!button) return;
            selectedFilter = button.dataset.filter; selectedYear = 'all'; featuredIndex = 0;
            $('#memory-tabs').querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
            renderTimeline(); renderGallery(); renderFeatured();
        });

        async function loadPhotos() {
            if (gallery) gallery.setAttribute('aria-busy', 'true');
            try {
                const data = await request('get_photos.php');
                photos = data.photos;
                renderTimeline(); renderGallery(); renderFeatured();
            } catch (error) {
                emptyAlbum('L’album se repose un instant. Réessayez dans quelques minutes.');
            } finally { if (gallery) gallery.setAttribute('aria-busy', 'false'); }
        }

        function openLightbox(id, collection = visiblePhotos) {
            lightboxPhotos = collection;
            lightboxIndex = Math.max(0, lightboxPhotos.findIndex((photo) => String(photo.id) === String(id)));
            lastFocusedElement = document.activeElement;
            updateLightbox();
            $('#lightbox').hidden = false; document.body.classList.add('modal-open'); $('.lightbox-close').focus();
        }

        function updateLightbox() {
            const photo = lightboxPhotos[lightboxIndex]; if (!photo) return;
            const image = $('#lightbox-image');
            const video = $('#lightbox-video');
            video.pause();
            if (photo.media_type === 'video') {
                image.hidden = true; image.src = '';
                video.hidden = false; video.src = photo.filepath; video.setAttribute('aria-label', photo.title); video.load();
            } else {
                video.hidden = true; video.removeAttribute('src'); video.load();
                image.hidden = false; image.src = photo.filepath; image.alt = photo.title;
            }
            $('#lightbox-title').textContent = photo.title;
            $('#lightbox-description').textContent = photo.description || 'Un instant à garder près du cœur.';
            const source = photo.source === 'webcam' ? 'instant spontané' : 'souvenir choisi';
            $('#lightbox-date').textContent = `${formatDate(photo.memory_date || photo.created_at)} · ${source}`;
            $('.lightbox-prev').hidden = lightboxPhotos.length < 2;
            $('.lightbox-next').hidden = lightboxPhotos.length < 2;
        }

        function closeLightbox() {
            $('#lightbox').hidden = true; document.body.classList.remove('modal-open'); $('#lightbox-image').src = '';
            const video = $('#lightbox-video'); video.pause(); video.removeAttribute('src'); video.load();
            if (lastFocusedElement) lastFocusedElement.focus();
        }

        $('.lightbox-close').addEventListener('click', closeLightbox);
        $('.lightbox-prev').addEventListener('click', () => { lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length; updateLightbox(); });
        $('.lightbox-next').addEventListener('click', () => { lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length; updateLightbox(); });
        $('#lightbox').addEventListener('click', (event) => { if (event.target === $('#lightbox')) closeLightbox(); });
        let touchStartX = 0;
        $('#lightbox').addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
        $('#lightbox').addEventListener('touchend', (event) => {
            const distance = event.changedTouches[0].screenX - touchStartX;
            if (Math.abs(distance) > 60 && lightboxPhotos.length > 1) {
                lightboxIndex = (lightboxIndex + (distance < 0 ? 1 : -1) + lightboxPhotos.length) % lightboxPhotos.length; updateLightbox();
            }
        }, { passive: true });

        document.addEventListener('keydown', (event) => {
            if ($('#lightbox').hidden) return;
            if (event.key === 'Escape') closeLightbox();
            if (event.key === 'ArrowLeft') $('.lightbox-prev').click();
            if (event.key === 'ArrowRight') $('.lightbox-next').click();
        });

        const consentModal = $('#consent-modal');
        const openStory = $('#open-story');
        function showConsent() { consentModal.hidden = false; document.body.classList.add('modal-open'); $('#accept-camera').focus(); }
        function closeConsent() { consentModal.hidden = true; document.body.classList.remove('modal-open'); }
        openStory.addEventListener('click', showConsent);
        $('#decline-camera').addEventListener('click', () => { closeConsent(); showToast('Pas de souci ♥', 'Profite simplement de notre album.'); });
        $('[data-close-consent]').addEventListener('click', closeConsent);
        consentModal.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeConsent();
            if (event.key === 'Tab') {
                const buttons = [...consentModal.querySelectorAll('button:not([disabled])')];
                const first = buttons[0], last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        });

        const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
        async function captureMemory() {
            const acceptButton = $('#accept-camera');
            acceptButton.disabled = true; acceptButton.textContent = 'Un instant…';
            closeConsent();
            openStory.disabled = true; openStory.classList.add('capturing');
            const sealLabel = openStory.querySelector('small');
            if (sealLabel) sealLabel.textContent = 'Souvenir en cours…';
            let stream = null;
            try {
                if (!window.isSecureContext) {
                    const insecureError = new Error('La caméra exige une adresse locale sécurisée.');
                    insecureError.name = 'InsecureContextError';
                    throw insecureError;
                }
                if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const video = $('#camera'); video.srcObject = stream;
                await video.play();
                if (!video.videoWidth) {
                    await Promise.race([
                        new Promise((resolve) => video.addEventListener('loadeddata', resolve, { once: true })),
                        wait(6000).then(() => { throw new Error('camera-timeout'); })
                    ]);
                }
                if (!video.videoWidth || !video.videoHeight) throw new Error('camera-empty');
                await wait(3000);
                const canvas = $('#capture-canvas');
                const maxWidth = 1600;
                const scale = Math.min(1, maxWidth / video.videoWidth);
                canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
                canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
                canvas.getContext('2d', { alpha: false }).drawImage(video, 0, 0, canvas.width, canvas.height);
                const image = canvas.toDataURL('image/jpeg', .86);
                const data = await request('upload.php', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image })
                });
                showToast('Souvenir enregistré ♥', 'La photo a été envoyée dans votre espace privé.', 4800);
                await loadPhotos();
                const newCard = gallery?.querySelector(`[data-id="${escapeSelector(data.id)}"]`);
                if (newCard) newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (error) {
                console.error('Capture webcam impossible :', error);
                const messages = {
                    InsecureContextError: ['Adresse locale non sécurisée', 'Ouvre le site avec https://localhost/album_anniv/. Une adresse 192.168.x.x en HTTP bloque la caméra.'],
                    NotAllowedError: ['Autorisation refusée', 'Autorise la caméra dans les réglages du navigateur, puis recharge la page. L’album reste accessible ♥'],
                    PermissionDeniedError: ['Autorisation refusée', 'Autorise la caméra dans les réglages du navigateur, puis recharge la page. L’album reste accessible ♥'],
                    NotFoundError: ['Aucune caméra détectée', 'Vérifie que ta webcam est branchée. L’album reste accessible ♥'],
                    DevicesNotFoundError: ['Aucune caméra détectée', 'Vérifie que ta webcam est branchée. L’album reste accessible ♥'],
                    NotReadableError: ['Caméra déjà utilisée', 'Ferme les autres applications qui utilisent la webcam, puis réessaie.'],
                    TrackStartError: ['Caméra déjà utilisée', 'Ferme les autres applications qui utilisent la webcam, puis réessaie.']
                };
                const fallback = ['Photo non enregistrée', error.message && !['unsupported', 'camera-timeout', 'camera-empty'].includes(error.message) ? error.message : 'La caméra n’a pas répondu. Tu peux tout de même profiter de l’album ♥'];
                const [title, message] = messages[error.name] || fallback;
                showToast(title, message, 6500);
            } finally {
                if (stream) stream.getTracks().forEach((track) => track.stop());
                const video = $('#camera'); video.pause(); video.srcObject = null;
                const canvas = $('#capture-canvas'); canvas.width = 1; canvas.height = 1;
                acceptButton.disabled = false; acceptButton.textContent = 'Oui, avec plaisir ♥';
                openStory.disabled = false; openStory.classList.remove('capturing');
                if (sealLabel) sealLabel.textContent = 'Ouvrir ce souvenir';
            }
        }
        $('#accept-camera').addEventListener('click', captureMemory);
        loadPhotos();
    }

    // Administration
    const adminGallery = $('#admin-gallery');
    if (adminGallery) {
        let adminPhotos = [];
        const pendingGallery = $('#pending-gallery');
        const pendingSection = $('#pending-section');
        const csrf = $('meta[name="csrf-token"]').content;
        const uploadPanel = $('#upload-panel');
        const uploadForm = $('#upload-form');
        const fileInput = $('#photo-input');
        let previewUrl = '';

        function updateStats() {
            const published = adminPhotos.filter((photo) => photo.is_published);
            const pending = adminPhotos.filter((photo) => !photo.is_published && photo.source === 'webcam');
            $('#stat-total').textContent = adminPhotos.length;
            $('#stat-images').textContent = adminPhotos.filter((photo) => photo.media_type !== 'video').length;
            $('#stat-videos').textContent = adminPhotos.filter((photo) => photo.media_type === 'video').length;
            $('#stat-upload').textContent = adminPhotos.filter((photo) => photo.source === 'upload').length;
            $('#stat-webcam').textContent = pending.length;
            $('#photo-count-label').textContent = `${published.length} souvenir${published.length > 1 ? 's' : ''}`;
            $('#pending-count-label').textContent = `${pending.length} en attente`;
        }

        function adminCard(photo, pending = false) {
                const card = document.createElement('article'); card.className = 'admin-card'; card.dataset.id = photo.id;
                const imageBox = document.createElement('div'); imageBox.className = 'admin-card-image';
                let media;
                if (photo.media_type === 'video') {
                    media = document.createElement('video'); media.src = photo.filepath; media.muted = true; media.playsInline = true; media.preload = 'metadata';
                    const play = document.createElement('span'); play.className = 'video-play'; play.textContent = '▶'; play.setAttribute('aria-hidden', 'true');
                    imageBox.append(media, play);
                } else {
                    media = document.createElement('img'); media.src = photo.filepath; media.alt = ''; media.loading = 'lazy';
                    imageBox.append(media);
                }
                const badge = document.createElement('span'); badge.className = 'source-badge'; badge.textContent = pending ? 'À valider' : (photo.source === 'webcam' ? 'Webcam publiée' : 'Ajout manuel');
                imageBox.append(badge);
                const body = document.createElement('div'); body.className = 'admin-card-body';
                const title = document.createElement('h3'); title.textContent = photo.title;
                const description = document.createElement('p'); description.textContent = photo.description || 'Sans description';
                const meta = document.createElement('div'); meta.className = 'admin-card-meta';
                const date = document.createElement('span'); date.textContent = formatDate(photo.created_at);
                const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete-button'; remove.textContent = 'Supprimer';
                remove.addEventListener('click', () => deletePhoto(photo));
                meta.append(date);
                if (pending) {
                    const actions = document.createElement('div'); actions.className = 'review-actions';
                    const publish = document.createElement('button'); publish.type = 'button'; publish.className = 'publish-button'; publish.textContent = 'Ajouter à l’album';
                    publish.addEventListener('click', () => publishPhoto(photo, publish));
                    actions.append(publish, remove); body.append(title, description, meta, actions);
                } else {
                    meta.append(remove); body.append(title, description, meta);
                }
                card.append(imageBox, body);
                return card;
        }

        function renderAdmin() {
            adminGallery.replaceChildren(); pendingGallery.replaceChildren(); updateStats();
            const pending = adminPhotos.filter((photo) => !photo.is_published && photo.source === 'webcam').slice().reverse();
            const published = adminPhotos.filter((photo) => photo.is_published).slice().reverse();
            pendingSection.hidden = pending.length === 0;
            pending.forEach((photo) => pendingGallery.append(adminCard(photo, true)));
            if (!published.length) {
                const empty = document.createElement('div'); empty.className = 'admin-empty'; empty.textContent = 'Votre album est prêt à accueillir son premier souvenir.'; adminGallery.append(empty); return;
            }
            published.forEach((photo) => {
                adminGallery.append(adminCard(photo));
            });
        }

        async function loadAdminPhotos() {
            adminGallery.setAttribute('aria-busy', 'true');
            try { adminPhotos = (await request('get_photos.php?include_private=1')).photos; renderAdmin(); }
            catch (error) { adminGallery.textContent = error.message; showToast('Chargement impossible', error.message); }
            finally { adminGallery.setAttribute('aria-busy', 'false'); }
        }

        async function deletePhoto(photo) {
            if (!window.confirm(`Voulez-vous vraiment supprimer « ${photo.title} » ?`)) return;
            const button = document.querySelector(`[data-id="${escapeSelector(photo.id)}"] .delete-button`);
            if (button) { button.disabled = true; button.textContent = 'Suppression…'; }
            const body = new FormData(); body.append('id', photo.id); body.append('csrf_token', csrf);
            try {
                await request('delete.php', { method: 'POST', body });
                adminPhotos = adminPhotos.filter((item) => item.id !== photo.id); renderAdmin();
                showToast('Photo supprimée', 'Le souvenir a été retiré de l’album.');
            } catch (error) { if (button) { button.disabled = false; button.textContent = 'Supprimer'; } showToast('Suppression impossible', error.message); }
        }

        async function publishPhoto(photo, button) {
            button.disabled = true; button.textContent = 'Ajout…';
            const body = new FormData(); body.append('id', photo.id); body.append('csrf_token', csrf);
            try {
                await request('publish.php', { method: 'POST', body });
                photo.is_published = true; renderAdmin();
                showToast('Ajouté à l’album ♥', 'La photo est maintenant visible dans le carrousel public.');
            } catch (error) {
                button.disabled = false; button.textContent = 'Ajouter à l’album'; showToast('Publication impossible', error.message);
            }
        }

        function hideUploadPanel() {
            uploadPanel.hidden = true; uploadForm.reset();
            if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = '';
            $('#photo-preview').hidden = true; $('#photo-preview').removeAttribute('src'); $('#drop-prompt').hidden = false;
            const videoPreview = $('#video-preview'); videoPreview.pause(); videoPreview.hidden = true; videoPreview.removeAttribute('src'); videoPreview.load();
        }
        $('#show-upload').addEventListener('click', () => { uploadPanel.hidden = false; uploadPanel.scrollIntoView({ behavior: 'smooth', block: 'center' }); fileInput.focus(); });
        $('#cancel-upload').addEventListener('click', hideUploadPanel);
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0]; if (!file) return;
            if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(file);
            const imagePreview = $('#photo-preview'); const videoPreview = $('#video-preview');
            if (file.type.startsWith('video/')) {
                imagePreview.hidden = true; imagePreview.removeAttribute('src');
                videoPreview.src = previewUrl; videoPreview.hidden = false; videoPreview.load();
            } else {
                videoPreview.pause(); videoPreview.hidden = true; videoPreview.removeAttribute('src'); videoPreview.load();
                imagePreview.src = previewUrl; imagePreview.hidden = false;
            }
            $('#drop-prompt').hidden = true;
        });
        const dropZone = $('#drop-zone');
        ['dragenter', 'dragover'].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.add('dragging'); }));
        ['dragleave', 'drop'].forEach((name) => dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.remove('dragging'); }));
        dropZone.addEventListener('drop', (event) => {
            if (!event.dataTransfer.files.length) return;
            const transfer = new DataTransfer(); transfer.items.add(event.dataTransfer.files[0]); fileInput.files = transfer.files; fileInput.dispatchEvent(new Event('change'));
        });
        uploadForm.addEventListener('submit', async (event) => {
            event.preventDefault(); const submit = uploadForm.querySelector('[type="submit"]'); submit.disabled = true; submit.textContent = 'Ajout en cours…';
            try {
                const data = await request('add_photo.php', { method: 'POST', body: new FormData(uploadForm) });
                adminPhotos.push(data.photo); hideUploadPanel(); renderAdmin(); showToast('Souvenir ajouté ♥', 'La photo apparaît maintenant dans votre album.');
            } catch (error) { showToast('Ajout impossible', error.message); }
            finally { submit.disabled = false; submit.textContent = 'Ajouter à l’album'; }
        });
        loadAdminPhotos();
    }
})();
