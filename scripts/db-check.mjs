// Connectivity probe. Run: node --env-file=.env.local scripts/db-check.mjs
import pg from 'pg'

const c = new pg.Client({
  connectionString: process.env.DATABASE_ADMIN_URL,
  ssl: { rejectUnauthorized: false },
})

try {
  await c.connect()
  const { rows } = await c.query(
    'select current_user as u, current_database() as d, version() as v'
  )
  console.log(`CONNECTED  user=${rows[0].u}  db=${rows[0].d}`)
  console.log(rows[0].v.split(' on ')[0])

  const t = await c.query(
    "select tablename from pg_tables where schemaname = 'public' order by 1"
  )
  console.log(
    'public tables:',
    t.rowCount ? t.rows.map((r) => r.tablename).join(', ') : '(none)'
  )
} catch (e) {
  console.error('FAIL:', e.message)
  process.exitCode = 1
} finally {
  await c.end().catch(() => {})
}
