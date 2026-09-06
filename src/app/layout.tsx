import type { Metadata } from 'next'
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

export const metadata: Metadata = {
  title: 'SoF Voice — Accountability & Suggestions',
  description:
    'An anonymous accountability and suggestions portal for students and faculty of The School of Future, Kochi.',
  // A portal for anonymous complaints has no business being indexed.
  robots: { index: false, follow: false },
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
