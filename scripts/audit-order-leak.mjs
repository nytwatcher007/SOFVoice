// Does removing created_at actually hide submission order?
// Tests ctid, xmin, and whether CLUSTER is a durable fix.
// Run: node --env-file=.env.local scripts/audit-order-leak.mjs
import pg from 'pg'

const c = new pg.Client({
  connectionString: process.env.DATABASE_ADMIN_URL,
  ssl: { rejectUnauthorized: false },
})
await c.connect()

const probe = async (label, n) => {
  // Separate transactions, so each row gets its own xmin.
  for (let i = 1; i <= n; i++) {
    await c.query(
      `insert into public.submissions (kind,category,subject,body,ref_hash)
       values ('complaint','A',$1,'x',$2)`,
      [`${label} ${i}`, `probe_${label}_${i}`]
    )
  }
}

const show = async (title) => {
  const byXmin = (
    await c.query(
      `select xmin::text as xmin, ctid::text as ctid, subject
         from public.submissions where ref_hash like 'probe_%'
        order by xmin::text::bigint`
    )
  ).rows
  console.log(`\n${title}  â€” ORDER BY xmin:`)
  for (const r of byXmin) console.log(`   xmin=${r.xmin} ctid=${r.ctid}  ${r.subject}`)
}

await c.query(`delete from public.submissions where ref_hash like 'probe_%'`)
await probe('first', 3)
await show('after 3 inserts')

// The proposed fix.
await c.query('cluster public.submissions using submissions_sort_idx')
console.log('\n>>> ran CLUSTER on submissions_sort_idx')
await show('after CLUSTER')

// Does order leak again for rows inserted AFTER the cluster?
await probe('second', 2)
await show('after 2 more inserts post-CLUSTER')

await c.query(`delete from public.submissions where ref_hash like 'probe_%'`)
console.log('\n(probe rows deleted)')
await c.end()
