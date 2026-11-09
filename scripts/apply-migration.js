const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_PASSWORD = process.env.DB_PASSWORD || 'SolidSsProdDB_2026_!x7Kq9mP2nR4v';
const HOST = 'aogtvkfhehaztdurvunf.supabase.co';
const USER = 'postgres';

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/0001_initial_schema.sql'),
    'utf8'
  );

  const client = new Client({
    host: HOST,
    port: 5432,
    database: 'postgres',
    user: USER,
    password: DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('Connected to Supabase postgres.');

    const statements = splitSql(sql);
    let executed = 0;
    for (const stmt of statements) {
      const s = stmt.trim();
      if (!s) continue;
      try {
        await client.query(s);
        executed++;
      } catch (err) {
        if (err.code === '42710' || err.code === '42P07' || err.code === '00000') {
          console.log('[skip/idempotent] %s: %s', err.code, s.slice(0, 80).replace(/\n/g, ' '));
          continue;
        }
        throw err;
      }
    }
    console.log('Applied %d statements successfully.', executed);

    const res = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
    );
    console.log('Public tables:', res.rows.map(r => r.tablename).join(', '));

    const rls = await client.query(
      `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
    );
    console.log('RLS enabled:');
    for (const r of rls.rows) {
      console.log('  %s -> %s', r.tablename, r.rowsecurity ? 'YES' : 'NO');
    }
  } finally {
    await client.end();
  }
}

function splitSql(sql) {
  const out = [];
  let buf = '';
  let inDollar = false;
  let dollarTag = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (!inDollar) {
      if (ch === '$') {
        const rest = sql.slice(i);
        const m = rest.match(/^\$([^$]*)\$/);
        if (m) {
          inDollar = true;
          dollarTag = m[1] || 'DOLLAR';
          buf += sql.slice(i, i + m[0].length);
          i += m[0].length - 1;
          continue;
        }
      }
      buf += ch;
      if (ch === ';') {
        out.push(buf);
        buf = '';
      }
    } else {
      buf += ch;
      if (dollarTag) {
        const close = '$' + dollarTag + '$';
        if (buf.endsWith(close)) {
          inDollar = false;
          dollarTag = '';
        }
      } else {
        if (buf.endsWith('$$')) {
          inDollar = false;
        }
      }
    }
  }
  if (buf.trim()) out.push(buf);
  return out;
}

main().catch(err => {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
