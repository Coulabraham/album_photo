'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('');
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: String(form.get('email') || ''),
      password: String(form.get('password') || ''),
    });
    if (authError) { setError('Identifiants incorrects.'); setLoading(false); return; }
    router.push('/admin'); router.refresh();
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <Link className="back-link" href="/">← Retour à l’album</Link>
        <section className="auth-card">
          <div className="modal-icon" aria-hidden="true">A</div><p className="eyebrow">Espace privé</p><h1>Bienvenue</h1>
          <p className="auth-intro">Connectez-vous pour prendre soin de vos souvenirs.</p>
          {error && <div className="form-alert" role="alert">{error}</div>}
          <form className="stack-form" onSubmit={login}>
            <label>Adresse email<input name="email" type="email" autoComplete="username" required autoFocus /></label>
            <label>Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Connexion…' : 'Ouvrir l’espace privé'}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
