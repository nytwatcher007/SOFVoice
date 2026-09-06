/**
 * Term-end purge — manual inspection and run.
 *
 *   npm run purge              dry run: shows what WOULD go, deletes nothing
 *   npm run purge -- --confirm actually deletes
 *   npm run purge -- --days 90 use a different retention window
 *
 * pg_cron runs the same function monthly inside the database, so this script is
 * not how the purge normally happens. It exists so a human can see what the
 * scheduled job is about to remove, before it removes it.
 *
 * Dry run is the default deliberately. There is no undo and no backup of this
 * data outside Supabase's own — a mistyped retention window would silently
 * destroy complaints.
 */
import pg from 'pg'

const args = process.argv.slice(2)
const confirm = args.includes('--confirm')
const daysArg = args.indexOf('--days')
const days = daysArg !== -1 ? Number(args[daysArg + 1]) : 180

if (!Number.isFinite(days) || days < 1) {
  console.error('--days must be a positive number')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_ADMIN_URL,
  ssl: { rejectUnauthorized: false },
})
await client.connect()

// Exactly the predicate purge_expired_submissions() uses. Kept in sync by
// eye — if you change one, change the other.
const { rows } = await client.query(
  `select status, category, subject, resolved_on
     from public.submissions
    where status in ('resolved','dismissed')
      and resolved_on is not null
      and resolved_on < ((now() at time zone 'utc')::date - $1::integer)
    order by resolved_on`,
  [days]
)

console.log(`\nRetention: ${days} days after an entry was resolved or dismissed.`)
console.log('Escalated, new and reviewing entries are never purged.\n')

if (rows.length === 0) {
  console.log('Nothing is eligible for purging.\n')
  await client.end()
  process.exit(0)
}

console.log(`${rows.length} entr${rows.length === 1 ? 'y' : 'ies'} eligible:\n`)
for (const r of rows) {
  const on = new Date(r.resolved_on).toISOString().slice(0, 10)
  console.log(`  [${r.status}] ${on}  ${r.category} — ${r.subject}`)
}

if (!confirm) {
  console.log('\nDRY RUN — nothing was deleted.')
  console.log('To actually delete these, re-run with:  npm run purge -- --confirm\n')
  await client.end()
  process.exit(0)
}

const deleted = (
  await client.query('select public.purge_expired_submissions($1) as n', [days])
).rows[0].n

console.log(`\nDeleted ${deleted} entr${deleted === 1 ? 'y' : 'ies'}. This cannot be undone.`)
console.log('Anyone holding a reference code for these can no longer look them up.\n')

await client.end()
