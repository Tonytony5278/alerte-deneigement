import type { Metadata } from 'next';
import Image from 'next/image';
import { Analytics } from './components/Analytics';
import './globals.css';

export const metadata: Metadata = {
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
  title: 'Alerte Neige — Déneigement gratuit pour le Québec',
  description:
    'Reçois des alertes push gratuites 60 minutes avant le déneigement de ta rue. ' +
    'Couvre Montréal, Longueuil, Laval, Québec et Gatineau. Gratuit, sans abonnement.',
  metadataBase: new URL('https://alerteneige.app'),
  openGraph: {
    title: 'Alerte Neige',
    description: 'Alertes de déneigement gratuites pour le Québec',
    url: 'https://alerteneige.app',
    siteName: 'Alerte Neige',
    locale: 'fr_CA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Alerte Neige',
    description: 'Alertes de déneigement gratuites pour le Québec',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-CA">
      <body className="bg-white text-gray-900 antialiased">
        <Analytics />
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-lg text-brand-primary">
              <Image src="/logo.png" alt="Alerte Neige" width={32} height={32} className="rounded-lg" />
              <span>Alerte Neige</span>
            </a>
            <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
              <a href="/#chercher" className="hover:text-brand-primary transition-colors">Chercher</a>
              <a href="/carte" className="hover:text-brand-primary transition-colors">Carte</a>
              <a
                href="https://apps.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand-primary text-white px-3 py-1.5 rounded-full text-xs hover:bg-blue-700 transition-colors"
              >
                Télécharger
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-16 border-t border-gray-100 py-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Alerte Neige &middot; <a href="mailto:info@alerteneige.app" className="hover:underline">info@alerteneige.app</a></p>
          <p className="mt-1">Donn&eacute;es : Ville de Montr&eacute;al, Longueuil, Laval, Qu&eacute;bec et Gatineau &middot; OpenStreetMap</p>
          <p className="mt-1">La signalisation sur rue prime toujours &mdash; cet outil est fourni &agrave; titre informatif.</p>
        </footer>
      </body>
    </html>
  );
}
