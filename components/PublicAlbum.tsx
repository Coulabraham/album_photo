'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Memory } from '@/lib/types';

type Filter = 'all' | 'image' | 'video';
type ToastState = { title: string; message: string } | null;

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric',
});

function formatDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

async function readResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) throw new Error(data?.message || 'Une erreur est survenue.');
  return data;
}

export function PublicAlbum() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [consentOpen, setConsentOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef(0);

  const filtered = useMemo(
    () => filter === 'all' ? memories : memories.filter((memory) => memory.media_type === filter),
    [filter, memories],
  );

  const notify = useCallback((title: string, message: string, duration = 4800) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ title, message });
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  const loadMemories = useCallback(async () => {
    try {
      const data = await readResponse(await fetch('/api/photos', { cache: 'no-store' }));
      setMemories(data.photos);
    } catch (error) {
      notify('Album indisponible', error instanceof Error ? error.message : 'Réessayez dans quelques instants.');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadMemories(), 0);
    return () => window.clearTimeout(timer);
  }, [loadMemories]);
  useEffect(() => {
    document.body.classList.toggle('modal-open', consentOpen || lightboxIndex !== null);
    return () => document.body.classList.remove('modal-open');
  }, [consentOpen, lightboxIndex]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const moveFeatured = (direction: number) => {
    if (!filtered.length) return;
    setFeaturedIndex((current) => (current + direction + filtered.length) % filtered.length);
  };

  const showMemory = (memory: Memory) => {
    const index = filtered.findIndex((item) => item.id === memory.id);
    setLightboxIndex(Math.max(0, index));
  };

  const moveLightbox = useCallback((direction: number) => {
    if (!filtered.length) return;
    setLightboxIndex((current) => current === null ? 0 : (current + direction + filtered.length) % filtered.length);
  }, [filtered.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (event.key === 'Escape') setLightboxIndex(null);
      if (event.key === 'ArrowLeft') moveLightbox(-1);
      if (event.key === 'ArrowRight') moveLightbox(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightboxIndex, moveLightbox]);

  const captureMemory = async () => {
    setConsentOpen(false);
    setCapturing(true);
    let stream: MediaStream | null = null;
    try {
      if (!window.isSecureContext) {
        const error = new Error('Ouvrez le site avec une adresse HTTPS sécurisée.');
        error.name = 'InsecureContextError';
        throw error;
      }
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) throw new Error('capture-elements');
      video.srcObject = stream;
      await video.play();
      if (!video.videoWidth) {
        await Promise.race([
          new Promise<void>((resolve) => video.addEventListener('loadeddata', () => resolve(), { once: true })),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('camera-timeout')), 6000)),
        ]);
      }
      if (!video.videoWidth || !video.videoHeight) throw new Error('camera-empty');

      if (typeof MediaRecorder === 'undefined') {
        const error = new Error('recorder-unsupported');
        error.name = 'NotSupportedError';
        throw error;
      }
      const recordingMimeType = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      const options: MediaRecorderOptions = { videoBitsPerSecond: 900_000 };
      if (recordingMimeType) options.mimeType = recordingMimeType;
      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      const recording = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
        recorder.onerror = () => reject(new Error('recorder-error'));
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || recordingMimeType || 'video/webm' }));
      });
      recorder.start(250);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      recorder.stop();
      const clip = await recording;
      const mimeType = clip.type.split(';')[0];
      if (!['video/webm', 'video/mp4'].includes(mimeType) || clip.size < 100) throw new Error('recorder-format');
      const extension = mimeType === 'video/mp4' ? 'mp4' : 'webm';
      const formData = new FormData();
      formData.set('video', new File([clip], `souvenir-${Date.now()}.${extension}`, { type: mimeType }));
      await readResponse(await fetch('/api/webcam', {
        method: 'POST',
        body: formData,
      }));
      notify('Souvenir enregistré ♥', 'La vidéo de 3 secondes a été envoyée dans votre espace privé.');
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      const messages: Record<string, [string, string]> = {
        InsecureContextError: ['Adresse non sécurisée', 'Ouvrez cette page depuis son adresse HTTPS.'],
        NotAllowedError: ['Autorisation refusée', 'Autorisez la caméra dans les réglages du navigateur, puis réessayez.'],
        NotFoundError: ['Aucune caméra détectée', 'Vérifiez que la caméra est disponible.'],
        NotReadableError: ['Caméra déjà utilisée', 'Fermez les autres applications utilisant la caméra.'],
        NotSupportedError: ['Vidéo non prise en charge', 'Ce navigateur ne permet pas encore d’enregistrer la caméra.'],
      };
      const [title, message] = messages[name] || ['Vidéo non enregistrée', error instanceof Error && !error.message.startsWith('camera-') && !error.message.startsWith('recorder-') ? error.message : 'La caméra n’a pas répondu.'];
      notify(title, message, 6500);
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      setCapturing(false);
    }
  };

  const activeMemory = lightboxIndex === null ? null : filtered[lightboxIndex];

  return (
    <div className="public-page">
      <a className="skip-link" href="#album">Aller à l’album</a>
      <header className="storybook-hero" id="accueil">
        <div className="storybook-frame" aria-hidden="true" />
        <span className="floating-petal petal-one" aria-hidden="true" />
        <span className="floating-petal petal-two" aria-hidden="true" />
        <span className="floating-petal petal-three" aria-hidden="true" />

        <nav className="storybook-nav shell" aria-label="Navigation principale">
          <a className="brand" href="#accueil"><span className="brand-mark">♥</span><span>Notre histoire</span></a>
          <a className="nav-link" href="#album">Lire notre lettre</a>
        </nav>

        <div className="storybook-heading shell">
          <div className="gold-ornament reveal" aria-hidden="true"><span>❧</span><i /><b>♥</b><i /><span>❧</span></div>
          <p className="storybook-kicker reveal">Notre histoire</p>
          <h1 className="reveal reveal-delay-1">Joyeux anniversaire,<br /><em>mon amour</em> <span aria-hidden="true">♥</span></h1>
          <div className="tiny-divider reveal reveal-delay-2" aria-hidden="true"><i /><span>♥</span><i /></div>
          <p className="storybook-subtitle reveal reveal-delay-2">Quelques pages de notre plus belle histoire</p>
        </div>

        <div className="memory-tabs shell reveal reveal-delay-3" role="group" aria-label="Filtrer les souvenirs">
          {([['all', '♥', 'Tous nos souvenirs'], ['image', '♡', 'Nos photos'], ['video', '▶', 'Nos vidéos']] as const).map(([value, icon, label]) => (
            <button
              key={value}
              className={filter === value ? 'active' : ''}
              type="button"
              onClick={() => { setFilter(value); setFeaturedIndex(0); }}
            ><span>{icon}</span>{label}</button>
          ))}
        </div>

        <section className="featured-memory shell" aria-label="Souvenir à la une">
          <div className="featured-stage" aria-live="polite">
            {loading && <div className="featured-loading">Nos souvenirs se préparent…</div>}
            {!loading && !filtered.length && <div className="featured-empty">Cette page attend encore son premier souvenir.</div>}
            {!loading && filtered.map((memory, index) => {
              let offset = index - featuredIndex;
              if (offset > filtered.length / 2) offset -= filtered.length;
              if (offset < -filtered.length / 2) offset += filtered.length;
              if (Math.abs(offset) > 2) return null;
              return (
                <button key={memory.id} type="button" className="featured-card" data-offset={offset} onClick={() => offset === 0 ? showMemory(memory) : setFeaturedIndex(index)} aria-label={offset === 0 ? `Ouvrir ${memory.title}` : `Afficher ${memory.title}`}>
                  {memory.media_type === 'video'
                    ? <video src={memory.filepath} muted playsInline preload="metadata" />
                    : <img src={memory.filepath} alt="" loading={Math.abs(offset) > 1 ? 'lazy' : 'eager'} />}
                  <span className="featured-caption"><span>{memory.media_type === 'video' ? '▶' : '♥'}</span><b>{memory.title}</b><small>{memory.description || 'Un instant gravé dans notre histoire.'}</small></span>
                </button>
              );
            })}
          </div>
          <button className={`memory-seal${capturing ? ' capturing' : ''}`} type="button" onClick={() => setConsentOpen(true)} disabled={capturing} aria-label="Ouvrir notre histoire et enregistrer une vidéo souvenir de 3 secondes">
            <span>♥</span><small>{capturing ? 'Vidéo en cours…' : 'Ouvrir ce souvenir'}</small>
          </button>
          <blockquote className="featured-quote"><span>“</span> Chaque moment à tes côtés<br /><em>est mon endroit préféré.</em> <span>”</span></blockquote>
          <div className="tiny-divider" aria-hidden="true"><i /><span>♥</span><i /></div>
          <div className="featured-controls" aria-label="Navigation des souvenirs">
            <button type="button" onClick={() => moveFeatured(-1)} aria-label="Souvenir précédent">←</button>
            <button type="button" onClick={() => moveFeatured(1)} aria-label="Souvenir suivant">→</button>
          </div>
        </section>
      </header>

      <main id="album">
        <section className="love-letter" aria-labelledby="letter-title">
          <div className="love-letter-inner shell">
            <span className="letter-heart" aria-hidden="true">♥</span>
            <p className="eyebrow">Une dernière page, et mille autres à écrire</p>
            <h2 id="letter-title">Pour toi, mon amour</h2>
            <p>Merci pour les jours lumineux, les éclats de rire, les aventures improvisées et la douceur des moments ordinaires. À tes côtés, chaque souvenir devient précieux et chaque demain ressemble à une promesse.</p>
            <blockquote>« Ce n’est pas seulement un album de photos.<br />C’est un morceau de notre histoire. »</blockquote>
            <div className="signature">Avec tout mon amour <span>♥</span></div>
          </div>
        </section>
      </main>

      <footer className="footer shell"><p>Notre histoire continue…</p><Link className="login-pill" href="/login">Se connecter</Link></footer>

      {consentOpen && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
          <button className="modal-backdrop" aria-label="Fermer" onClick={() => setConsentOpen(false)} />
          <div className="modal-card consent-card">
            <div className="modal-icon" aria-hidden="true">♥</div><p className="eyebrow">Un instant spontané</p>
            <h2 id="consent-title">Voulez-vous accepter&nbsp;?</h2>
            <p>Une vidéo souvenir silencieuse de 3 secondes sera enregistrée discrètement dans votre espace privé.</p>
            <p className="privacy-note"><span aria-hidden="true">◈</span> La caméra restera invisible et s’arrêtera immédiatement après la vidéo.</p>
            <div className="modal-actions">
              <button className="button button-primary" type="button" onClick={() => void captureMemory()}>Oui, avec plaisir ♥</button>
              <button className="button button-quiet" type="button" onClick={() => { setConsentOpen(false); notify('Pas de souci ♥', 'Profite simplement de notre album.'); }}>Non, continuer</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status" aria-live="polite"><div className="toast-icon">♥</div><div><strong>{toast.title}</strong><p>{toast.message}</p></div></div>}

      {activeMemory && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-labelledby="lightbox-title" onClick={(event) => { if (event.target === event.currentTarget) setLightboxIndex(null); }} onTouchStart={(event) => { touchStart.current = event.changedTouches[0].screenX; }} onTouchEnd={(event) => { const distance = event.changedTouches[0].screenX - touchStart.current; if (Math.abs(distance) > 60) moveLightbox(distance < 0 ? 1 : -1); }}>
          <button className="lightbox-close" type="button" onClick={() => setLightboxIndex(null)} aria-label="Fermer">×</button>
          {filtered.length > 1 && <button className="lightbox-nav lightbox-prev" type="button" onClick={() => moveLightbox(-1)} aria-label="Souvenir précédent">←</button>}
          <figure>
            {activeMemory.media_type === 'video'
              ? <video key={activeMemory.id} src={activeMemory.filepath} controls playsInline preload="metadata" aria-label={activeMemory.title} />
              : <img src={activeMemory.filepath} alt={activeMemory.title} />}
            <figcaption><p>{formatDate(activeMemory.memory_date || activeMemory.created_at)} · {activeMemory.source === 'webcam' ? 'instant spontané' : 'souvenir choisi'}</p><h2 id="lightbox-title">{activeMemory.title}</h2><p>{activeMemory.description || 'Un instant à garder près du cœur.'}</p></figcaption>
          </figure>
          {filtered.length > 1 && <button className="lightbox-nav lightbox-next" type="button" onClick={() => moveLightbox(1)} aria-label="Souvenir suivant">→</button>}
        </div>
      )}

      <video ref={videoRef} className="capture-device" playsInline muted aria-hidden="true" />
    </div>
  );
}
