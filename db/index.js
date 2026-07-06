const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.warn('[db] تحذير: DATABASE_URL غير معرّف في .env — لن يعمل الاتصال بقاعدة البيانات.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // مطلوب للاتصال بـ Supabase
});

// ---------- Schema (يُنشأ تلقائياً أول مرة يشتغل الخادم) ----------
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      device_uid TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'out',
      last_timestamp TIMESTAMPTZ,
      checkout_timestamp TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance_log (
      id SERIAL PRIMARY KEY,
      emp_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL,
      source TEXT DEFAULT 'manual'
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_log_timestamp ON attendance_log(timestamp);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_log_empid ON attendance_log(emp_id);`);

  console.log('[db] تم التأكد من جاهزية الجداول في Supabase ✓');
}

module.exports = { pool, initSchema };
