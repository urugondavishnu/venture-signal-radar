import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// ---------- Users ----------

export const users = pgTable('users', {
  user_id: uuid('user_id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  email_frequency: text('email_frequency').default('daily'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ---------- Companies ----------

export const companies = pgTable(
  'companies',
  {
    company_id: uuid('company_id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.user_id, { onDelete: 'cascade' }),
    company_name: text('company_name').notNull(),
    website_url: text('website_url').notNull(),
    domain: text('domain').notNull(),
    description: text('description'),
    industry: text('industry'),
    founding_year: integer('founding_year'),
    headquarters: text('headquarters'),
    company_size: text('company_size'),
    detected_products: text('detected_products').array(),
    careers_url: text('careers_url'),
    blog_url: text('blog_url'),
    pricing_url: text('pricing_url'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    last_agent_run: timestamp('last_agent_run', { withTimezone: true }),
    tracking_status: text('tracking_status').default('active'),
  },
  (t) => [
    index('idx_companies_user_id').on(t.user_id),
    index('idx_companies_domain').on(t.domain),
    index('idx_companies_tracking').on(t.tracking_status),
  ],
);

// ---------- Signals ----------

export const signals = pgTable(
  'signals',
  {
    signal_id: uuid('signal_id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').references(() => companies.company_id, { onDelete: 'cascade' }),
    signal_type: text('signal_type').notNull(),
    source: text('source').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    url: text('url'),
    detected_at: timestamp('detected_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_signals_company_id').on(t.company_id),
    index('idx_signals_type').on(t.signal_type),
    index('idx_signals_detected_at').on(t.detected_at),
  ],
);

// ---------- Reports ----------

export const reports = pgTable(
  'reports',
  {
    report_id: uuid('report_id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').references(() => companies.company_id, { onDelete: 'cascade' }),
    user_id: uuid('user_id').references(() => users.user_id, { onDelete: 'cascade' }),
    generated_at: timestamp('generated_at', { withTimezone: true }).defaultNow(),
    report_data: jsonb('report_data').notNull(),
  },
  (t) => [
    index('idx_reports_company_id').on(t.company_id),
    index('idx_reports_generated_at').on(t.generated_at),
  ],
);
