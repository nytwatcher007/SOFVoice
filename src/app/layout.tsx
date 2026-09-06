import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

// The live site pairs Plus Jakarta Sans with Polysans for display. Polysans is a
// commercial Wildtype licence and is not redistributable, so Jakarta carries
// headings too — a deliberate divergence, recorded in CLAUDE.md.
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap',
})

const DESCRIPTION =
  'An anonymous accountability and suggestions portal for students and faculty of The School of Future, Kochi.'

export const metadata: Metadata = {
  // Needed so the Open Graph image resolves to an absolute URL in production.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sof-voice.vercel.app'
  ),
  title: {
    default: 'SoF Voice — Accountability & Suggestions',
    template: '%s · SoF Voice',
  },
  description: DESCRIPTION,
  applicationName: 'SoF Voice',

  // A portal for anonymous complaints has no business being in search results.
  // This does NOT stop link previews: WhatsApp and Slack still unfurl, which is
  // how students will actually receive it. Nothing is leaked either way —
  // no submission is reachable without the access code.
  robots: { index: false, follow: false, nocache: true },

  openGraph: {
    type: 'website',
    siteName: 'SoF Voice',
    title: 'SoF Voice — Accountability & Suggestions',
    description: DESCRIPTION,
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SoF Voice — Accountability & Suggestions',
    description: DESCRIPTION,
  },

  appleWebApp: { capable: true, title: 'SoF Voice', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false, email: false, address: false },
}

export const viewport: Viewport = {
  // Matches --sof-espresso, so mobile browser chrome doesn't sit as a white bar
  // above a dark page. themeColor lives here, not in metadata — Next warns and
  // ignores it in the metadata export.
  themeColor: '#180b05',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-espresso text-cream">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
