import { ComingInNextSlice } from '@/components/ComingInNextSlice'
import { requireMember } from '@/lib/session'

export default async function ComplaintPage() {
  await requireMember()

  return (
    <ComingInNextSlice
      title="Raise a concern"
      summary="An anonymous accountability complaint. Your name and contact are discarded on the server before the submission is stored — the database physically cannot hold them against a complaint."
    />
  )
}
