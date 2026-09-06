import { ComingInNextSlice } from '@/components/ComingInNextSlice'
import { requireMember } from '@/lib/session'

export default async function TrackPage() {
  await requireMember()

  return (
    <ComingInNextSlice
      title="Track a submission"
      summary="Enter the reference code you were given to see its status and any reply. Only a one-way hash of the code is stored, so a lost code cannot be recovered or looked up by anyone — including the council."
    />
  )
}
