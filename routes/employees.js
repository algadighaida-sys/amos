const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/employees — كل الموظفين
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM employees ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/employees — إضافة موظف جديد
router.post('/', async (req, res) => {
  const { id, name, role, device_uid } = req.body;
  if (!id || !name || !role) {
    return res.status(400).json({ error: 'الرجاء تعبئة جميع الحقول المطلوبة (id, name, role)' });
  }
  try {
    const exists = await pool.query('SELECT id FROM employees WHERE id = $1', [id]);
    if (exists.rows.length) {
      return res.status(409).json({ error: 'رقم الملف مستخدم مسبقاً' });
    }
    await pool.query(
      'INSERT INTO employees (id, device_uid, name, role, status) VALUES ($1, $2, $3, $4, $5)',
      [id, device_uid || null, name, role, 'out']
    );
    res.status(201).json({ message: 'تمت إضافة الموظف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/employees/:id — تعديل بيانات موظف
router.put('/:id', async (req, res) => {
  const currentId = req.params.id;
  const { id: newId, name, role, device_uid } = req.body;
  try {
    const empRes = await pool.query('SELECT * FROM employees WHERE id = $1', [currentId]);
    const emp = empRes.rows[0];
    if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

    if (newId && newId !== currentId) {
      const conflict = await pool.query('SELECT id FROM employees WHERE id = $1', [newId]);
      if (conflict.rows.length) return res.status(409).json({ error: 'رقم الملف الجديد مستخدم مسبقاً' });
    }

    const finalId = newId || currentId;
    await pool.query(
      'UPDATE employees SET id = $1, name = $2, role = $3, device_uid = $4 WHERE id = $5',
      [finalId, name || emp.name, role || emp.role, device_uid ?? emp.device_uid, currentId]
    );

    res.json({ message: 'تم تحديث بيانات الموظف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/employees/:id/reset — إعادة تعيين حالة الموظف (لم يحضر)
router.patch('/:id/reset', async (req, res) => {
  try {
    const empRes = await pool.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    if (!empRes.rows.length) return res.status(404).json({ error: 'الموظف غير موجود' });

    await pool.query(
      "UPDATE employees SET status = 'out', last_timestamp = NULL, checkout_timestamp = NULL WHERE id = $1",
      [req.params.id]
    );
    res.json({ message: 'تمت إعادة تعيين حالة الموظف' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/employees/:id — حذف موظف
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'الموظف غير موجود' });
    res.json({ message: 'تم حذف الموظف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
