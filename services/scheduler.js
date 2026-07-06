const cron = require('node-cron');
const { pool } = require('../db');
const { getPeriodRange, PERIOD_LABELS_AR } = require('./periods');
const { sendReportEmail } = require('./emailService');
const { syncFromDevice } = require('./deviceSync');
require('dotenv').config();

async function getRowsForPeriod(period) {
  const { from, to } = getPeriodRange(period);
  const { rows } = await pool.query(
    'SELECT * FROM attendance_log WHERE timestamp >= $1 AND timestamp <= $2 ORDER BY timestamp ASC',
    [from, to]
  );
  return rows;
}

async function runReportJob(period) {
  const rows = await getRowsForPeriod(period);
  await sendReportEmail(period, PERIOD_LABELS_AR[period], rows);
}

function startScheduler() {
  // مزامنة الجهاز كل عدة دقائق (حسب DEVICE_SYNC_INTERVAL_MINUTES في .env)
  const syncMinutes = Number(process.env.DEVICE_SYNC_INTERVAL_MINUTES || 5);
  cron.schedule(`*/${syncMinutes} * * * *`, () => {
    syncFromDevice();
  });

  // التقرير اليومي
  cron.schedule(process.env.DAILY_REPORT_CRON || '0 18 * * *', () => {
    console.log('[scheduler] تشغيل التقرير اليومي...');
    runReportJob('daily');
  });

  // التقرير الأسبوعي
  cron.schedule(process.env.WEEKLY_REPORT_CRON || '0 18 * * 0', () => {
    console.log('[scheduler] تشغيل التقرير الأسبوعي...');
    runReportJob('weekly');
  });

  // التقرير الشهري — يشتغل كل يوم بين 28-31 ويتحقق إذا اليوم هو آخر يوم بالشهر
  cron.schedule(process.env.MONTHLY_REPORT_CRON || '0 18 28-31 * *', () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isLastDayOfMonth = tomorrow.getMonth() !== now.getMonth();
    if (isLastDayOfMonth) {
      console.log('[scheduler] تشغيل التقرير الشهري...');
      runReportJob('monthly');
    }
  });

  console.log('[scheduler] تم تفعيل الجدولة التلقائية (مزامنة الجهاز + التقارير اليومية/الأسبوعية/الشهرية)');
}

module.exports = { startScheduler, runReportJob };
