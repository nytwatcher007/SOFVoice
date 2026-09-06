import 'server-only'
import pg from 'pg'

// 'server-only' above makes importing this from a client component a build
// error rather than a runtime credential leak (invariant 6).

// Lazy singleton. Not a Proxy wrapper — Proxies break libraries that introspect
// the client object, and fail in ways that present as a hang with no error.
let pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Copy .env.local.example to .env.local.')
    }
    pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      // Supabase's session pooler is the IPv4 path; the direct db.<ref> host is
      // IPv6-only and unreachable from many networks. Keep the pool small —
      // serverless instances multiply connections.
      max: 3,
    })
  }
  return pool
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, values)
}
