/** Parse a database URL into explicit fields so pg cannot discard verified TLS options. */
export function verifiedPostgresConnection(rawUrl: string | undefined, ca?: string) {
  if (!rawUrl) throw new Error('POSTGRES_URL_NON_POOLING is required for database access');
  let url: URL;
  try { url = new URL(rawUrl); }
  catch { throw new Error('Invalid database URL'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) {
    throw new Error('Invalid database URL');
  }
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca: ca.replace(/\\n/g, '\n') } : {}) },
  };
}
