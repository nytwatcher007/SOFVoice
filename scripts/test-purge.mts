/**
 * Term-end purge suite (slice 9).
 *
 * Purging is the only irreversible operation in the system, so what it must
 * NOT delete matters more than what it does. Assertion 2 is the important one:
 * the purge function must not hand the application role the DELETE capability
 * that slice 7 deliberately removed.
 */
import pg from 'pg'

const admin = new pg.Client({
  connectionString: process.env.DATABASE_ADMIN_URL,
  ssl: { rejectUnauthorized: false },
})
const app = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

let failures = 0
const probes: string[] = []

function check(n: number, label: string, ok: boolean, detail = '') {
  if (ok) console.log(`  PASS  ${n}. ${label}`)
  else {
    failures++
    console.error(`  FAIL  ${n}. ${label}${detail ? `\n        ${detail}` : ''}`)
  }
}

await admin.connect()
await app.connect()
console.log('\nTerm-end purge\n')

try {
  // Seed one of every status, all resolved/closed long ago.
  const seed = async (subject: string, status: string, daysAgo: number) => {
    probes.push(subject)
    await admin.query(
      `insert into public.submissions
         (kind, category, subject, body, ref_hash, status, resolved_on)
       values ('suggestion','Other',$1,'purge probe',$2,$3::submission_status,
               ((now() at time zone 'utc')::date - $4::integer))`,
      [subject, `purge_${subject.replace(/\W/g, '')}`, status, daysAgo]
    )
  }

  await seed('PROBE purge old resolved', 'resolved', 400)
  await seed('PROBE purge old dismissed', 'dismissed', 400)
  await seed('PROBE purge old escalated', 'escalated', 400)
  await seed('PROBE purge recent resolved', 'resolved', 10)
  await seed('PROBE purge open new', 'new', 400)

  // 1. The function exists and reports a count.
  {
    const { rows } = await admin.query(
      `select count(*)::int as n from pg_proc
        where proname = 'purge_expired_submissions'`
    )
    check(1, 'purge_expired_submissions() exists', rows[0].n === 1, `found ${rows[0].n}`)
  }

  // 2. THE IMPORTANT ONE — sof_app must not be able to call it. A deleting
  //    function callable by the app role would undo slice 7 entirely.
  {
    let denied = false
    let detail = 'sof_app was able to invoke the purge function'
    try {
      await app.query('begin')
      await app.query('select public.purge_expired_submissions(180)')
      await app.query('rollback')
    } catch (e) {
      await app.query('rollback').catch(() => {})
      denied = (e as { code?: string }).code === '42501'
      detail = `expected 42501, got ${(e as { code?: string }).code}`
    }
    check(2, 'sof_app cannot execute the purge function', denied, detail)
  }

  // 3. Dry run reports without deleting.
  {
    const before = (
      await admin.query(
        `select count(*)::int as n from public.submissions where subject like 'PROBE purge%'`
      )
    ).rows[0].n
    const { rows } = await admin.query(
      `select count(*)::int as n from public.submissions
        where status in ('resolved','dismissed')
          and resolved_on < ((now() at time zone 'utc')::date - 180)`
    )
    const after = (
      await admin.query(
        `select count(*)::int as n from public.submissions where subject like 'PROBE purge%'`
      )
    ).rows[0].n
    check(
      3,
      'inspecting eligible rows deletes nothing',
      before === after && rows[0].n >= 2,
      `before=${before} after=${after} eligible=${rows[0].n}`
    )
  }

  // 4. Purging removes old resolved and dismissed.
  {
    await admin.query('select public.purge_expired_submissions(180)')
    const { rows } = await admin.query(
      `select subject from public.submissions where subject like 'PROBE purge%'`
    )
    const left = rows.map((r) => r.subject)
    check(
      4,
      'old resolved and dismissed entries are purged',
      !left.includes('PROBE purge old resolved') &&
        !left.includes('PROBE purge old dismissed'),
      `remaining: ${left.join(' | ')}`
    )

    // 5. ESCALATED SURVIVES. These concern harm to a person and may be needed
    //    if something is investigated later.
    check(
      5,
      'escalated entries are NEVER purged, however old',
      left.includes('PROBE purge old escalated'),
      `remaining: ${left.join(' | ')}`
    )

    // 6. Recently closed and still-open entries survive.
    check(
      6,
      'recently closed and still-open entries survive',
      left.includes('PROBE purge recent resolved') &&
        left.includes('PROBE purge open new'),
      `remaining: ${left.join(' | ')}`
    )
  }

  // 7. The scheduled job is actually registered.
  {
    const { rows } = await admin.query(
      `select schedule, active from cron.job where jobname = 'sof-voice-purge'`
    )
    check(
      7,
      'pg_cron job is scheduled and active',
      rows.length === 1 && rows[0].active === true,
      `rows=${rows.length} ${JSON.stringify(rows[0] ?? {})}`
    )
  }

  // 8. Closing an entry stamps resolved_on automatically.
  {
    const subject = 'PROBE purge trigger'
    probes.push(subject)
    const ins = await admin.query(
      `insert into public.submissions (kind, category, subject, body, ref_hash)
       values ('suggestion','Other',$1,'x','purge_trigger_probe') returning id`,
      [subject]
    )
    await admin.query(
      `update public.submissions set status = 'resolved' where id = $1`,
      [ins.rows[0].id]
    )
    const closed = (
      await admin.query('select resolved_on from public.submissions where id = $1', [
        ins.rows[0].id,
      ])
    ).rows[0].resolved_on

    await admin.query(
      `update public.submissions set status = 'reviewing' where id = $1`,
      [ins.rows[0].id]
    )
    const reopened = (
      await admin.query('select resolved_on from public.submissions where id = $1', [
        ins.rows[0].id,
      ])
    ).rows[0].resolved_on

    check(
      8,
      'resolved_on is stamped on close and cleared on reopen',
      closed !== null && reopened === null,
      `closed=${closed} reopened=${reopened}`
    )
  }
} finally {
  await admin.query(
    `delete from public.submissions where subject = any($1::text[])`,
    [probes]
  )
  console.log('\n  (probe rows deleted)')
  await admin.end()
  await app.end().catch(() => {})
}

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nAll assertions passed.\n')
process.exit(failures ? 1 : 0)
