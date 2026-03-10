import { Resend } from 'resend';
import { ReportData, Company } from '../types';

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
export function buildReportEmail(company: Company, report: ReportData): string {
  const mono = "'Courier New',Courier,monospace";
  const serif = "Georgia,'Times New Roman',serif";

  const sectionLabels: Array<{ key: string; title: string; items: Array<{ title: string; summary: string; source: string; url?: string }> }> = [
    { key: '01', title: 'Product Launches', items: report.product_launches },
    { key: '02', title: 'Financings', items: report.financings },
    { key: '03', title: 'Leadership Changes', items: report.leadership_changes },
    { key: '04', title: 'Revenue Milestones', items: report.revenue_milestones },
    { key: '05', title: 'Major Customer Wins', items: report.customer_wins },
    { key: '06', title: 'Pricing Updates', items: report.pricing_updates },
    { key: '07', title: 'Hiring Trends', items: report.hiring_trends },
    { key: '08', title: 'General News', items: report.general_news },
    { key: '09', title: 'Founder Contacts & Warm Intros', items: report.founder_contacts || [] },
    { key: '10', title: 'Leading Indicators', items: report.leading_indicators || [] },
    { key: '11', title: 'Competitive Landscape', items: report.competitive_landscape || [] },
    { key: '12', title: 'Fundraising Signals', items: report.fundraising_signals || [] },
  ];

  const sections = sectionLabels
    .filter((s) => s.items.length > 0)
    .map((section) => {
      const entries = section.items
        .map((item) => {
          const sourceLink = item.url
            ? `<a href="${item.url}" style="color:#1342FF;text-decoration:none;font-family:${mono};font-size:11px;">[${item.source}]</a>`
            : '';
          return `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #e8e8e8;vertical-align:top;">
                <p style="margin:0;font-family:${serif};font-size:14px;line-height:1.6;color:#1a1a1a;">
                  <strong>${item.title}</strong> ${sourceLink}
                </p>
                <p style="margin:6px 0 0;font-family:${serif};font-size:13px;line-height:1.55;color:#4a4a4a;">
                  ${item.summary}
                </p>
                <p style="margin:4px 0 0;font-family:${mono};font-size:10px;letter-spacing:0.5px;color:#999;text-transform:uppercase;">
                  via ${item.source}
                </p>
              </td>
            </tr>`;
        })
        .join('');

      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
          <tr>
            <td style="padding-bottom:10px;border-bottom:1px solid #1a1a1a;">
              <span style="font-family:${mono};font-size:10px;letter-spacing:1px;color:#999;text-transform:uppercase;">SEC_${section.key}</span>
              <h2 style="margin:4px 0 0;font-family:${serif};font-size:18px;font-weight:normal;color:#1a1a1a;letter-spacing:-0.3px;">
                ${section.title}
              </h2>
            </td>
          </tr>
          ${entries}
        </table>`;
    })
    .join('');

  const noSignals = sections.length === 0
    ? `<p style="font-family:${serif};font-size:14px;color:#999;text-align:center;padding:40px 0;">No new signals detected in this cycle.</p>`
    : '';

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:960px;background:#ffffff;border:1px solid #e0e0e0;">

              <!-- Header title block -->
              <tr>
                <td style="padding:48px 40px 0;">
                  <p style="margin:0;font-family:${mono};font-size:10px;letter-spacing:2px;color:#999;text-transform:uppercase;">
                    Daily Delta
                  </p>
                  <h1 style="margin:8px 0 0;font-family:${serif};font-size:28px;font-weight:normal;color:#1a1a1a;letter-spacing:-0.5px;line-height:1.2;">
                    Signal Intelligence Report
                  </h1>
                  <p style="margin:12px 0 0;font-family:${mono};font-size:11px;letter-spacing:0.5px;color:#666;text-transform:uppercase;">
                    ${company.company_name}
                  </p>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="padding:20px 40px 0;">
                  <p style="margin:0;font-family:${mono};font-size:10px;color:#ccc;letter-spacing:2px;">
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  </p>
                </td>
              </tr>

              <!-- Metadata block -->
              <tr>
                <td style="padding:20px 40px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="50%" style="vertical-align:top;">
                        <p style="margin:0;font-family:${mono};font-size:10px;letter-spacing:0.5px;color:#999;text-transform:uppercase;">Date</p>
                        <p style="margin:2px 0 0;font-family:${serif};font-size:13px;color:#1a1a1a;">${dateFormatted}</p>
                      </td>
                      <td width="50%" style="vertical-align:top;">
                        <p style="margin:0;font-family:${mono};font-size:10px;letter-spacing:0.5px;color:#999;text-transform:uppercase;">Time</p>
                        <p style="margin:2px 0 0;font-family:${serif};font-size:13px;color:#1a1a1a;">${timeFormatted}</p>
                      </td>
                    </tr>
                    <tr>
                      <td width="50%" style="vertical-align:top;padding-top:12px;">
                        <p style="margin:0;font-family:${mono};font-size:10px;letter-spacing:0.5px;color:#999;text-transform:uppercase;">Website</p>
                        <p style="margin:2px 0 0;font-family:${mono};font-size:12px;">
                          <a href="${company.website_url}" style="color:#1342FF;text-decoration:none;">${company.website_url}</a>
                        </p>
                      </td>
                      <td width="50%" style="vertical-align:top;padding-top:12px;">
                        ${company.industry ? `
                        <p style="margin:0;font-family:${mono};font-size:10px;letter-spacing:0.5px;color:#999;text-transform:uppercase;">Industry</p>
                        <p style="margin:2px 0 0;font-family:${serif};font-size:13px;color:#1a1a1a;">${company.industry}</p>
                        ` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Company overview -->
              <tr>
                <td style="padding:28px 40px 0;">
                  <p style="margin:0;font-family:${mono};font-size:10px;letter-spacing:0.5px;color:#999;text-transform:uppercase;">Company Overview</p>
                  <p style="margin:8px 0 0;font-family:${serif};font-size:14px;line-height:1.65;color:#333;">
                    ${report.company_overview}
                  </p>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="padding:28px 40px 0;">
                  <div style="border-top:1px solid #1a1a1a;"></div>
                </td>
              </tr>

              <!-- Sections -->
              <tr>
                <td style="padding:28px 40px 0;">
                  ${sections}
                  ${noSignals}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:12px 40px 48px;">
                  <p style="margin:0;font-family:${mono};font-size:10px;color:#ccc;letter-spacing:2px;">
                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                  </p>
                  <p style="margin:16px 0 0;font-family:${mono};font-size:10px;letter-spacing:0.5px;color:#999;text-transform:uppercase;text-align:center;">
                    Daily Delta &mdash; Automated Intelligence Report
                  </p>
                  <p style="margin:4px 0 0;font-family:${mono};font-size:10px;color:#bbb;text-align:center;">
                    A CSV file with structured data is attached to this email.
                  </p>
                  <p style="margin:16px 0 0;font-family:${mono};font-size:10px;text-align:center;color:#ccc;">
                    ╌╌ END ╌╌
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
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
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY must be configured');

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'signals@dailydelta.com';
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

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: `Daily Delta <${fromEmail}>`,
      to: [toEmail],
      subject,
      html,
      attachments: [
        {
          filename: `${safeCompanyName}_report_${fileDate}.csv`,
          content: Buffer.from(csv),
        },
      ],
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    console.log(`[Email] Report sent to ${toEmail} for ${company.company_name} (id: ${data?.id})`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send report:`, err);
    return false;
  }
}
