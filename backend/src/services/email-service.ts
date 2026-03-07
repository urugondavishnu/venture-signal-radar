import nodemailer from 'nodemailer';
import { ReportData, Company } from '../types';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const user = process.env.BREVO_USER;
    const pass = process.env.BREVO_SMTP_KEY;
    if (!user || !pass) throw new Error('BREVO_USER and BREVO_SMTP_KEY must be configured');
    transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: { user, pass },
    });
  }
  return transporter;
}

/**
 * Escape a value for CSV (handles commas, quotes, newlines)
 */
function csvEscape(value: string): string {
  // Prevent CSV formula injection
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Build a CSV string from report data
 */
function buildReportCSV(report: ReportData): string {
  const rows: string[] = [];

  // Header row
  rows.push('Section,Title,Summary,Source,URL,Detected At');

  const sections: Array<{ name: string; items: Array<{ title: string; summary: string; source: string; url?: string; detected_at?: string }> }> = [
    { name: 'Product Launches', items: report.product_launches },
    { name: 'Financings', items: report.financings },
    { name: 'Leadership Changes', items: report.leadership_changes },
    { name: 'Revenue Milestones', items: report.revenue_milestones },
    { name: 'Customer Wins', items: report.customer_wins },
    { name: 'Pricing Updates', items: report.pricing_updates },
    { name: 'Hiring Trends', items: report.hiring_trends },
    { name: 'General News', items: report.general_news },
    { name: 'Founder Contacts', items: report.founder_contacts || [] },
    { name: 'Leading Indicators', items: report.leading_indicators || [] },
    { name: 'Competitive Landscape', items: report.competitive_landscape || [] },
    { name: 'Fundraising Signals', items: report.fundraising_signals || [] },
  ];

  for (const section of sections) {
    for (const item of section.items) {
      rows.push([
        csvEscape(section.name),
        csvEscape(item.title),
        csvEscape(item.summary),
        csvEscape(item.source),
        csvEscape(item.url || ''),
        csvEscape(item.detected_at || new Date().toISOString()),
      ].join(','));
    }
  }

  // If no signals at all, add a row indicating that
  if (rows.length === 1) {
    rows.push('No signals detected,,,,');
  }

  return rows.join('\n');
}

/**
 * Build HTML email from report data
 */
function buildReportEmail(company: Company, report: ReportData): string {
  const renderSection = (title: string, items: Array<{ title: string; summary: string; source: string; url?: string }>): string => {
    if (items.length === 0) return '';
    const bullets = items
      .map((item) => {
        const link = item.url ? ` <a href="${item.url}" style="color:#3b82f6;">[source]</a>` : '';
        return `<li style="margin-bottom:8px;">
          <strong>${item.title}</strong>${link}<br/>
          <span style="color:#6b7280;">${item.summary}</span><br/>
          <small style="color:#9ca3af;">via ${item.source}</small>
        </li>`;
      })
      .join('');

    return `
      <div style="margin-bottom:24px;">
        <h2 style="color:#1f2937;font-size:18px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin-bottom:12px;">${title}</h2>
        <ul style="list-style:none;padding:0;">${bullets}</ul>
      </div>
    `;
  };

  const sections = [
    renderSection('Product Launches', report.product_launches),
    renderSection('Financings', report.financings),
    renderSection('Leadership Changes', report.leadership_changes),
    renderSection('Revenue Milestones', report.revenue_milestones),
    renderSection('Major Customer Wins', report.customer_wins),
    renderSection('Pricing Updates', report.pricing_updates),
    renderSection('Hiring Trends', report.hiring_trends),
    renderSection('General News', report.general_news),
    renderSection('Founder Contacts & Warm Intros', report.founder_contacts || []),
    renderSection('Leading Indicators', report.leading_indicators || []),
    renderSection('Competitive Landscape', report.competitive_landscape || []),
    renderSection('Fundraising Signals', report.fundraising_signals || []),
  ]
    .filter(Boolean)
    .join('');

  const noSignals = sections.length === 0
    ? '<p style="color:#6b7280;">No new signals detected.</p>'
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:24px;border-radius:12px;margin-bottom:24px;">
        <h1 style="margin:0;font-size:22px;">Signal Intelligence Report</h1>
        <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">${company.company_name} — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="background:#f9fafb;padding:16px;border-radius:8px;margin-bottom:24px;">
        <h3 style="margin:0 0 8px;color:#374151;">Company Overview</h3>
        <p style="margin:0;color:#6b7280;font-size:14px;">${report.company_overview}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">
          <a href="${company.website_url}" style="color:#3b82f6;">${company.website_url}</a>
          ${company.industry ? ` · ${company.industry}` : ''}
        </p>
      </div>

      ${sections}
      ${noSignals}

      <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:32px;text-align:center;color:#9ca3af;font-size:12px;">
        <p>Venture Signal Tracker — Automated Intelligence Report</p>
        <p style="font-size:11px;">A CSV file with structured data is attached to this email.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send intelligence report via email with CSV attachment
 */
export async function sendReportEmail(
  toEmail: string,
  company: Company,
  report: ReportData,
): Promise<boolean> {
  try {
    const transport = getTransporter();
    const fromEmail = process.env.BREVO_FROM_EMAIL || 'signals@venture-signal-radar.com';
    const html = buildReportEmail(company, report);
    const csv = buildReportCSV(report);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = `Report of ${company.company_name}, ${dateStr} ${timeStr}`;

    // Sanitize company name for filename
    const safeCompanyName = company.company_name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileDate = now.toISOString().slice(0, 10);

    const result = await transport.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      html,
      attachments: [
        {
          filename: `${safeCompanyName}_report_${fileDate}.csv`,
          content: csv,
        },
      ],
    });

    console.log(`[Email] Report sent to ${toEmail} for ${company.company_name} (messageId: ${result.messageId})`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send report:`, err);
    return false;
  }
}
