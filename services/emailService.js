const nodemailer = require('nodemailer');
require('dotenv').config();

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * يبني نص التقرير (HTML) من قائمة سجلات الحضور
 */
function buildReportHtml(periodLabelAr, rows) {
  const tableRows = rows.map(r => {
    const d = new Date(r.timestamp);
    const statusLabel = r.status === 'ok' ? 'حاضر' : (r.status === 'late' ? 'متأخر' : 'لم يحضر');
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd;">${r.name}</td>
      <td style="padding:8px;border:1px solid #ddd;">${r.emp_id}</td>
      <td style="padding:8px;border:1px solid #ddd;">${r.role}</td>
      <td style="padding:8px;border:1px solid #ddd;">${statusLabel}</td>
      <td style="padding:8px;border:1px solid #ddd;">${d.toLocaleString('ar-SA')}</td>
    </tr>`;
  }).join('');

  return `
    <div style="font-family: Tahoma, Arial, sans-serif; direction: rtl;">
      <h2 style="color:#3a5a1f;">تقرير الحضور ${periodLabelAr} — نظام AMOS</h2>
      <p style="color:#666; font-size:13px;">تاريخ الإنشاء: ${new Date().toLocaleString('ar-SA')}</p>
      ${rows.length ? `
        <table style="border-collapse:collapse; width:100%; font-size:13px;">
          <thead>
            <tr style="background:#f2f2f2;">
              <th style="padding:8px;border:1px solid #ddd;">الموظف</th>
              <th style="padding:8px;border:1px solid #ddd;">رقم الملف</th>
              <th style="padding:8px;border:1px solid #ddd;">المسمى الوظيفي</th>
              <th style="padding:8px;border:1px solid #ddd;">الحالة</th>
              <th style="padding:8px;border:1px solid #ddd;">التاريخ والوقت</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      ` : `<p>لا توجد سجلات حضور خلال هذه الفترة.</p>`}
    </div>
  `;
}

/**
 * يرسل تقرير الحضور بالإيميل لعنوان المستلم المحدد في .env
 */
async function sendReportEmail(periodKey, periodLabelAr, rows) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[email] SMTP غير مُهيأ في .env — تم تخطي إرسال التقرير.');
    return { skipped: true };
  }

  const transporter = buildTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'AMOS';

  const info = await transporter.sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to: process.env.REPORT_RECIPIENT,
    subject: `تقرير الحضور ${periodLabelAr} - نظام AMOS`,
    html: buildReportHtml(periodLabelAr, rows)
  });

  console.log(`[email] تم إرسال تقرير (${periodKey}) بنجاح — messageId: ${info.messageId}`);
  return { sent: true, messageId: info.messageId };
}

module.exports = { sendReportEmail };
