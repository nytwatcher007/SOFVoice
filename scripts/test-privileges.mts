/**
 * Least-privilege suite (slice 7).
 *
 * Asserts the application's database credential really is narrow, rather than
 * trusting that the setup script ran. Connects AS sof_app using DATABASE_URL —
 * the same string the running app uses — and tries the things it must not be
 * able to do.
 *
 * Assertion 5 matters as much as the denials: a least-privilege role that
 * breaks the product is not a win.
 */
import pg from 'pg'

let failures = 0
function check(n: number, label: string, ok: boolean, detail = '') {
  if (ok) console.log(`  PASS  ${n}. ${label}`)
  else {
    failures++
    console.error(`  FAIL  ${n}. ${label}${detail ? `\n        ${detail}` : ''}`)
  }
}

const appClient = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const adminClient = new pg.Client({
  connectionString: process.env.DATABASE_ADMIN_URL,
  ssl: { rejectUnauthorized: false },
})

/** Run a statement as sof_app and report the SQLSTATE if it is refused. */
async function refused(sql: string): Promise<string | null> {
  try {
    await appClient.query('begin')
    await appClient.query(sql)
    await appClient.query('rollback')
    return null // it succeeded — that is a failure for our purposes
  } catch (e) {
    await appClient.query('rollback').catch(() => {})
    return (e as { code?: string }).code ?? 'unknown'
  }
}

await appClient.connect()
await adminClient.connect()

console.log('\nLeast privilege\n')

try {
  // 0. Sanity: we really are connected as sof_app.
  const who = (await appClient.query('select current_user as u')).rows[0].u
  if (who !== 'sof_app') {
    console.error(
      `  ABORT — DATABASE_URL connects as "${who}", not sof_app.\n` +
        '  The app is still running privileged. Run: npm run db:app-role'
    )
    process.exit(1)
  }

  // 1. Role attributes.
  {
    const a = (
      await adminClient.query(
        `select rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
           from pg_roles where rolname = 'sof_app'`
      )
    ).rows[0]
    const privileged = Object.entries(a).filter(([, v]) => v === true)
    check(
      1,
      'sof_app has no superuser / bypassrls / createrole / createdb',
      privileged.length === 0,
      `privileged attributes: ${privileged.map(([k]) => k).join(', ')}`
    )
  }

  // 2. Cannot DELETE. A leaked app credential must not be able to erase
  //    every complaint in the school.
  {
    const code = await refused('delete from public.submissions')
    check(2, 'sof_app cannot DELETE from submissions', code === '42501', `got ${code}`)
  }

  // 3. Cannot TRUNCATE.
  {
    const code = await refused('truncate public.submissions')
    check(3, 'sof_app cannot TRUNCATE submissions', code === '42501', `got ${code}`)
  }

  // 4. No DDL — cannot reshape the schema, so it cannot add an identity column.
  {
    const code = await refused('create table public.sof_app_should_not_exist (x int)')
    check(4, 'sof_app cannot create tables', code === '42501', `got ${code}`)
  }

  // 5. The app still works. INSERT, SELECT and UPDATE must all succeed.
  {
    let ok = false
    let detail = ''
    try {
      await appClient.query('begin')
      const ins = await appClient.query(
        `insert into public.submissions (kind, category, subject, body, ref_hash)
         values ('complaint','Other','PRIV PROBE','probe body','priv_probe_hash')
         returning id`
      )
      const id = ins.rows[0].id
      await appClient.query(
        `update public.submissions set status = 'reviewing' where id = $1`,
        [id]
      )
      const sel = await appClient.query(
        'select status from public.submissions where id = $1',
        [id]
      )
      ok = sel.rows[0].status === 'reviewing'
      await appClient.query('rollback')
    } catch (e) {
      await appClient.query('rollback').catch(() => {})
      detail = (e as Error).message
    }
    check(5, 'sof_app can still INSERT, SELECT and UPDATE (app not broken)', ok, detail)
  }

  // 6. No escalation path to a privileged role.
  {
    const toPostgres = await refused('set role postgres')
    const toService = await refused('set role service_role')
    check(
      6,
      'sof_app cannot SET ROLE to postgres or service_role',
      toPostgres !== null && toService !== null,
      `postgres=${toPostgres} service_role=${toService}`
    )
  }

  // 7. admin_users is readable but not writable — only an administrator
  //    changes who is an admin.
  {
    let canRead = false
    try {
      await appClient.query('select 1 from public.admin_users limit 1')
      canRead = true
    } catch {
      canRead = false
    }
    const writeCode = await refused(
      `insert into public.admin_users (user_id, email)
       values ('00000000-0000-0000-0000-000000000000','x@example.com')`
    )
    check(
      7,
      'sof_app can read admin_users but cannot grant itself admin',
      canRead && writeCode === '42501',
      `canRead=${canRead} insert=${writeCode}`
    )
  }
} finally {
  await appClient.end().catch(() => {})
  await adminClient.end().catch(() => {})
}

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nAll assertions passed.\n')
process.exit(failures ? 1 : 0)
