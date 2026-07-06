require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initSchema } = require('./db');
const employeesRouter = require('./routes/employees');
const attendanceRouter = require('./routes/attendance');
const { startScheduler, runReportJob } = require('./services/scheduler');
const { syncFromDevice } = require('./services/deviceSync');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/employees', employeesRouter);
app.use('/api/attendance', attendanceRouter);

// نقطة فحص سريعة للتأكد أن الخادم يعمل (تُستخدم أيضاً مع UptimeRobot لمنع نوم الخادم على Render)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// تشغيل يدوي فوري لأي تقرير (مفيد للاختبار بدون انتظار الجدولة)
app.post('/api/reports/send-now', async (req, res) => {
  const period = req.body.period || 'daily';
  try {
    await runReportJob(period);
    res.json({ message: `تم تشغيل إرسال التقرير (${period}) — تحقق من بريدك` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// مزامنة يدوية فورية مع الجهاز (مفيد للاختبار)
app.post('/api/device/sync-now', async (req, res) => {
  const result = await syncFromDevice();
  res.json(result);
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await initSchema();
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة بيانات Supabase — تحقق من DATABASE_URL في .env:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n✅ AMOS Backend يعمل الآن على المنفذ ${PORT}`);
    console.log(`   فحص الحالة: /api/health\n`);
    startScheduler();
  });
}

start();
