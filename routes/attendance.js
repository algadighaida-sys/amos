const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { getPeriodRange } = require('../services/periods');

// POST /api/attendance/checkin — تسجيل حضور يدوي
router.post('/checkin', async (req, res) => {
  const { emp_id } = req.body;
  try {
    const empRes = await pool.query('SELECT * FROM employees WHERE id = $1', [emp_id]);
    const emp = empRes.rows[0];
    if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(7, 30, 0, 0);
    const status = now <= cutoff ? 'ok' : 'late';
    const timestamp = now.toISOString();

    await pool.query(
      'INSERT INTO attendance_log (emp_id, name, role, status, timestamp, source) VALUES ($1, $2, $3, $4, $5, $6)',
      [emp.id, emp.name, emp.role, status, timestamp, 'manual']
    );
    await pool.query('UPDATE employees SET status = $1, last_timestamp = $2 WHERE id = $3', [status, timestamp, emp.id]);

    res.json({ message: 'تم تسجيل الحضور', status, timestamp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/checkout — تسجيل انصراف يدوي
router.post('/checkout', async (req, res) => {
  const { emp_id } = req.body;
  try {
    const empRes = await pool.query('SELECT * FROM employees WHERE id = $1', [emp_id]);
    const emp = empRes.rows[0];
    if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

    const timestamp = new Date().toISOString();
    await pool.query('UPDATE employees SET checkout_timestamp = $1 WHERE id = $2', [timestamp, emp.id]);

    res.json({ message: 'تم تسجيل الانصراف', timestamp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance?period=daily|weekly|monthly — سجلات الفترة المحددة
router.get('/', async (req, res) => {
  const period = req.query.period || 'daily';
  const { from, to } = getPeriodRange(period);
  try {
    const { rows } = await pool.query(
      'SELECT * FROM attendance_log WHERE timestamp >= $1 AND timestamp <= $2 ORDER BY timestamp DESC',
      [from, to]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/attendance?period=daily|weekly|monthly — حذف سجلات فترة محددة
router.delete('/', async (req, res) => {
  const period = req.query.period || 'daily';
  const { from, to } = getPeriodRange(period);
  try {
    const result = await pool.query(
      'DELETE FROM attendance_log WHERE timestamp >= $1 AND timestamp <= $2',
      [from, to]
    );
    res.json({ message: 'تم حذف السجلات بنجاح', deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
