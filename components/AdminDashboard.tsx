'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Memory } from '@/lib/types';

type ToastState = { title: string; message: string } | null;

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const formatDate = (value: string) => dateFormatter.format(new Date(value));

async function readResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) throw new Error(data?.message || 'Une erreur est survenue.');
  return data;
}

export function AdminDashboard({ email }: { email: string }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  const pending = useMemo(() => photos.filter((photo) => !photo.is_published && photo.source === 'webcam').reverse(), [photos]);
  const published = useMemo(() => photos.filter((photo) => photo.is_published).reverse(), [photos]);

  const notify = useCallback((title: string, message: string) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 4300);
  }, []);

  const loadPhotos = useCallback(async () => {
    try {
      const data = await readResponse(await fetch('/api/photos?include_private=1', { cache: 'no-store' }));
      setPhotos(data.photos);
    } catch (error) {
      notify('Chargement impossible', error instanceof Error ? error.message : 'Réessayez plus tard.');
    } finally { setLoading(false); }
  }, [notify]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPhotos(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPhotos]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function chooseFile(file: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setSelectedFile(file);
    setPreview(file ? URL.createObjectURL(file) : '');
  }

  async function logout() {
    await createClient().auth.signOut();
    router.push('/login'); router.refresh();
  }

  async function removePhoto(photo: Memory) {
    if (!window.confirm(`Voulez-vous vraiment supprimer « ${photo.title} » ?`)) return;
    try {
      await readResponse(await fetch('/api/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: photo.id }),
      }));
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      notify('Souvenir supprimé', 'Le fichier et son enregistrement ont été supprimés.');
    } catch (error) { notify('Suppression impossible', error instanceof Error ? error.message : 'Réessayez.'); }
  }

  async function publishPhoto(photo: Memory) {
    try {
      await readResponse(await fetch('/api/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: photo.id }),
      }));
      await loadPhotos();
      notify('Ajouté à l’album ♥', 'La photo est maintenant visible dans le carrousel public.');
    } catch (error) { notify('Publication impossible', error instanceof Error ? error.message : 'Réessayez.'); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!selectedFile) { notify('Fichier manquant', 'Choisissez une photo ou une vidéo.'); return; }
    setUploading(true);
    const form = new FormData(formElement);
    try {
      const signed = await readResponse(await fetch('/api/upload-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedFile.name, mime: selectedFile.type, size: selectedFile.size }),
      }));
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from('album-public').uploadToSignedUrl(
        signed.storagePath, signed.token, selectedFile, { contentType: selectedFile.type },
      );
      if (uploadError) throw uploadError;
      const result = await readResponse(await fetch('/api/media', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath: signed.storagePath,
          filename: selectedFile.name,
          mime: selectedFile.type,
          size: selectedFile.size,
          title: String(form.get('title') || ''),
          description: String(form.get('description') || ''),
          memoryDate: String(form.get('memoryDate') || '') || null,
        }),
      }));
      setPhotos((current) => [...current, result.photo]);
      setUploadOpen(false); chooseFile(null); formElement.reset();
      notify('Souvenir ajouté ♥', 'Le média apparaît maintenant dans votre album.');
    } catch (error) { notify('Ajout impossible', error instanceof Error ? error.message : 'Réessayez.'); }
    finally { setUploading(false); }
  }

  const stats = {
    total: photos.length,
    images: photos.filter((photo) => photo.media_type === 'image').length,
    videos: photos.filter((photo) => photo.media_type === 'video').length,
    uploads: photos.filter((photo) => photo.source === 'upload').length,
    pending: pending.length,
  };

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <Link className="brand" href="/"><span className="brand-mark">A</span><span>Notre album</span></Link>
        <div className="admin-user"><span>{email}</span><button className="text-button" type="button" onClick={() => void logout()}>Se déconnecter</button></div>
      </header>
      <main className="admin-main shell">
        <div className="admin-heading"><div><p className="eyebrow">Le jardin de vos souvenirs</p><h1>Votre collection</h1></div><button className="button button-primary" type="button" onClick={() => setUploadOpen(true)}>＋ Ajouter un média</button></div>
        <section className="stats" aria-label="Statistiques">
          <article><span>{stats.total}</span><p>Souvenirs au total</p></article>
          <article><span>{stats.images}</span><p>Images</p></article>
          <article><span>{stats.videos}</span><p>Vidéos</p></article>
          <article><span>{stats.uploads}</span><p>Ajouts manuels</p></article>
          <article><span>{stats.pending}</span><p>Captures à valider</p></article>
        </section>

        {uploadOpen && (
          <section className="upload-panel" aria-labelledby="upload-title">
            <div className="panel-copy"><p className="eyebrow">Un nouveau chapitre</p><h2 id="upload-title">Ajouter un souvenir</h2><p>Images jusqu’à 8 Mo · vidéos jusqu’à 40 Mo.</p></div>
            <form className="upload-form" onSubmit={upload}>
              <label className="drop-zone">
                <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,video/x-m4v" required onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
                {preview && selectedFile?.type.startsWith('video/') && <video src={preview} muted playsInline controls aria-label="Aperçu de la vidéo" />}
                {preview && !selectedFile?.type.startsWith('video/') && <img src={preview} alt="Aperçu du média" />}
                {!preview && <span className="drop-prompt"><b>Choisir une photo ou une vidéo</b><small>JPG, PNG, WEBP, MP4, WEBM, MOV</small></span>}
              </label>
              <div className="form-fields">
                <label>Titre<input type="text" name="title" maxLength={150} placeholder="Notre premier voyage…" required /></label>
                <label>Date du souvenir<input type="date" name="memoryDate" /><small>Laissez vide pour utiliser la date d’aujourd’hui.</small></label>
                <label>Description<textarea name="description" maxLength={1000} rows={4} placeholder="L’histoire derrière ce souvenir…" /></label>
                <div className="form-actions"><button className="button button-quiet" type="button" onClick={() => { setUploadOpen(false); chooseFile(null); }}>Annuler</button><button className="button button-primary" type="submit" disabled={uploading}>{uploading ? 'Ajout en cours…' : 'Ajouter à l’album'}</button></div>
              </div>
            </form>
          </section>
        )}

        {pending.length > 0 && (
          <section className="admin-gallery-section pending-section" aria-labelledby="pending-title">
            <div className="admin-section-title"><div><p className="eyebrow">Espace privé</p><h2 id="pending-title">Captures webcam à valider</h2></div><span>{pending.length} en attente</span></div>
            <p className="pending-help">Ces photos ne sont pas visibles dans l’album. Choisissez celles que vous souhaitez publier.</p>
            <div className="admin-gallery">{pending.map((photo) => <AdminCard key={photo.id} photo={photo} pending onPublish={publishPhoto} onDelete={removePhoto} />)}</div>
          </section>
        )}

        <section className="admin-gallery-section" aria-labelledby="collection-title">
          <div className="admin-section-title"><h2 id="collection-title">Dans l’album</h2><span>{published.length} souvenir{published.length > 1 ? 's' : ''}</span></div>
          <div className="admin-gallery" aria-busy={loading}>
            {loading && <div className="admin-empty">Chargement de la collection…</div>}
            {!loading && !published.length && <div className="admin-empty">Votre album est prêt à accueillir son premier souvenir.</div>}
            {published.map((photo) => <AdminCard key={photo.id} photo={photo} onPublish={publishPhoto} onDelete={removePhoto} />)}
          </div>
        </section>
      </main>
      {toast && <div className="toast" role="status" aria-live="polite"><div className="toast-icon">♥</div><div><strong>{toast.title}</strong><p>{toast.message}</p></div></div>}
    </div>
  );
}

function AdminCard({ photo, pending = false, onPublish, onDelete }: {
  photo: Memory;
  pending?: boolean;
  onPublish: (photo: Memory) => Promise<void>;
  onDelete: (photo: Memory) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => { setBusy(true); try { await action(); } finally { setBusy(false); } };
  return (
    <article className="admin-card">
      <div className="admin-card-image">
        {photo.media_type === 'video' ? <video src={photo.filepath} muted playsInline preload="metadata" /> : <img src={photo.filepath} alt="" loading="lazy" />}
        {photo.media_type === 'video' && <span className="video-play">▶</span>}
        <span className="source-badge">{pending ? 'À valider' : photo.source === 'webcam' ? 'Webcam publiée' : 'Ajout manuel'}</span>
      </div>
      <div className="admin-card-body">
        <h3>{photo.title}</h3><p>{photo.description || 'Sans description'}</p>
        <div className="admin-card-meta"><span>{formatDate(photo.created_at)}</span>{!pending && <button className="delete-button" type="button" disabled={busy} onClick={() => void run(() => onDelete(photo))}>Supprimer</button>}</div>
        {pending && <div className="review-actions"><button className="publish-button" type="button" disabled={busy} onClick={() => void run(() => onPublish(photo))}>{busy ? 'Traitement…' : 'Ajouter à l’album'}</button><button className="delete-button" type="button" disabled={busy} onClick={() => void run(() => onDelete(photo))}>Supprimer</button></div>}
      </div>
    </article>
  );
}
