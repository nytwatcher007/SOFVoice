import Image from 'next/image'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-hairline">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Image
          src="/sof-logo-footer.svg"
          alt="The School of Future"
          width={140}
          height={40}
          className="h-10 w-auto"
        />
        <p className="max-w-md text-xs leading-relaxed text-cream/50">
          SoF Voice is run by the SoF Kochi student council. Complaints are stored
          with no name, no account, and no record of who submitted them.
        </p>
      </div>
    </footer>
  )
}
