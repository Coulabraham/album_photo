import type { Metadata } from 'next';
import '../assets/css/style.css';

export const metadata: Metadata = {
  title: 'Notre histoire — Joyeux anniversaire',
  description: 'Un album d’anniversaire créé avec amour, pour revivre notre histoire.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
