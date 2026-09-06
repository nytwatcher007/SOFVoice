import Image from 'next/image'
import Link from 'next/link'

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-espresso/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-3" aria-label="SoF Voice — home">
          {/* Official SoF navbar logo, downloaded from the live site. Never
              recolour, redraw, or substitute it (CLAUDE.md lines 61-69). */}
          <Image
            src="/sof-logo-nav.svg"
            alt="The School of Future"
            width={125}
            height={26}
            priority
          />
          <span className="border-l border-hairline pl-3 text-sm font-semibold tracking-tight text-cream">
            Voice
          </span>
        </Link>

        <span className="text-xs text-cream/50">Student Council &middot; Kochi</span>
      </nav>
    </header>
  )
}
