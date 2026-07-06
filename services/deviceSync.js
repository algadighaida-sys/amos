const ZKLib = require('node-zklib');
const { pool } = require('../db');
require('dotenv').config();

/**
 * يتصل بجهاز البصمة عبر بروتوكول الشبكة (TCP) ويسحب سجلات الحضور الجديدة.
 * يعتمد على مكتبة node-zklib التي تدعم بروتوكول ZKTeco القياسي، وهو نفس
 * البروتوكول المستخدم في أغلب الأجهزة المشابهة حتى غير الرسمية.
 */
async function syncFromDevice() {
  if (String(process.env.DEVICE_ENABLED) !== 'true') {
    console.log('[device] المزامنة مع الجهاز الحقيقي غير مفعّلة (DEVICE_ENABLED=false في .env)');
    return { skipped: true };
  }

  const ip = process.env.DEVICE_IP;
  const port = Number(process.env.DEVICE_PORT || 4370);
  const zk = new ZKLib(ip, port, 10000, 4000);

  try {
    await zk.createSocket();
    const logs = await zk.getAttendances();
    let inserted = 0;

    for (const entry of logs.data || []) {
      const deviceUid = String(entry.deviceUserId ?? entry.uid);
      const empRes = await pool.query('SELECT * FROM employees WHERE device_uid = $1', [deviceUid]);
      const emp = empRes.rows[0];
      if (!emp) continue;

      const timestamp = new Date(entry.recordTime ?? entry.timestamp).toISOString();

      const existsRes = await pool.query(
        'SELECT id FROM attendance_log WHERE emp_id = $1 AND timestamp = $2',
        [emp.id, timestamp]
      );
      if (existsRes.rows.length) continue;

      const cutoff = new Date(timestamp);
      cutoff.setHours(7, 30, 0, 0);
      const status = new Date(timestamp) <= cutoff ? 'ok' : 'late';

      await pool.query(
        'INSERT INTO attendance_log (emp_id, name, role, status, timestamp, source) VALUES ($1, $2, $3, $4, $5, $6)',
        [emp.id, emp.name, emp.role, status, timestamp, 'device']
      );
      await pool.query(
        'UPDATE employees SET status = $1, last_timestamp = $2 WHERE id = $3',
        [status, timestamp, emp.id]
      );

      inserted++;
    }

    await zk.disconnect();
    console.log(`[device] تمت المزامنة بنجاح — سجلات جديدة: ${inserted}`);
    return { success: true, inserted };
  } catch (err) {
    console.error('[device] فشل الاتصال بالجهاز:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { syncFromDevice };
