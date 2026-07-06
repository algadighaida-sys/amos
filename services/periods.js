/**
 * يحسب بداية ونهاية الفترة الزمنية (يومي / أسبوعي / شهري) كسلاسل ISO
 * تُستخدم في استعلامات قاعدة البيانات وفي تصدير/إرسال التقارير
 */
function getPeriodRange(period) {
  const now = new Date();
  let from, to;

  if (period === 'daily') {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
    to = new Date(now);
    to.setHours(23, 59, 59, 999);
  } else if (period === 'weekly') {
    from = new Date(now);
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    to = new Date(now);
    to.setHours(23, 59, 59, 999);
  } else if (period === 'monthly') {
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    from = new Date(0);
    to = now;
  }

  return { from: from.toISOString(), to: to.toISOString() };
}

const PERIOD_LABELS_AR = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري' };
const PERIOD_LABELS_EN = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

module.exports = { getPeriodRange, PERIOD_LABELS_AR, PERIOD_LABELS_EN };
