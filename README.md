# Notre histoire — Next.js + Supabase

Album d’anniversaire romantique full-stack construit avec Next.js, React, TypeScript et Node.js. Supabase fournit PostgreSQL, Auth et Storage. Le design et les parcours reprennent fidèlement la version PHP d’origine.

## Fonctionnalités

- Couverture ivoire, bordeaux et dorée avec carrousel superposé.
- Photos et vidéos, filtres, navigation tactile et lightbox.
- Consentement webcam explicite, capture invisible après trois secondes et arrêt systématique du flux.
- Captures stockées en privé et absentes de l’album jusqu’à validation.
- Dashboard protégé avec aperçu, publication, suppression et statistiques.
- Upload direct signé vers Supabase Storage : images jusqu’à 8 Mo et vidéos jusqu’à 40 Mo.
- RLS PostgreSQL, contrôle du rôle administrateur et clé secrète utilisée uniquement côté Node.js.

## Prérequis

- Node.js 20.9 ou plus récent.
- Un projet Supabase.
- Un compte Vercel pour le déploiement recommandé.

## Installation

```bash
git clone https://github.com/Coulabraham/album_photo.git
cd album_photo
npm install
```

Copiez `.env.example` vers `.env.local` et renseignez :

```env
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
```

La clé secrète ne doit jamais porter le préfixe `NEXT_PUBLIC_`, être envoyée au navigateur ou être commitée.

## Préparer Supabase

Dans **SQL Editor**, exécutez :

```text
supabase/migrations/202609030001_initial.sql
```

Cette migration crée :

- `profiles` et le rôle administrateur ;
- `photos` et ses index ;
- les politiques RLS ;
- le bucket public `album-public` ;
- le bucket privé `webcam-private`.

Dans **Authentication > Users**, créez l’utilisateur administrateur. Puis attribuez-lui le rôle depuis SQL Editor :

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'votre@email.com');
```

## Développement local

```bash
npm run dev
```

Ouvrez `http://localhost:3000`. Les navigateurs autorisent généralement la caméra sur `localhost`. Pour tester depuis un téléphone, utilisez une URL HTTPS fournie par un tunnel ou déployez une préversion Vercel.

## Vérifications

```bash
npm run lint
npm run typecheck
npm run build
```

Scénario critique :

```text
Consentement
→ capture invisible après 3 secondes
→ webcam-private
→ is_published = false
→ visible uniquement dans le dashboard
→ Ajouter à l’album
→ album-public
→ is_published = true
→ visible dans le carrousel
```

## Déploiement Vercel

1. Importez le dépôt GitHub dans Vercel.
2. Ajoutez les trois variables de `.env.example` dans **Project Settings > Environment Variables**.
3. Déployez la branche `main`.
4. Ajoutez l’URL Vercel dans **Supabase > Authentication > URL Configuration** comme Site URL et Redirect URL.
5. Vérifiez la connexion, la caméra, la validation des captures et les vidéos depuis un téléphone.

Vercel fournit automatiquement HTTPS, indispensable à `getUserMedia()` hors de `localhost`.

## Sécurité

Les médias personnels, `.env.local`, secrets, certificats et anciens fichiers du dossier `uploads/` sont ignorés par Git. Les captures anonymes sont limitées côté route Node.js. En production à fort trafic, ajoutez également une limitation distribuée (Vercel Firewall, Upstash ou équivalent), car la mémoire d’une fonction serverless n’est pas partagée entre toutes les instances.
