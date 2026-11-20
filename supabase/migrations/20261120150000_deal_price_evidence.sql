alter table public.deals
  add column if not exists verified_30d_price numeric,
  add column if not exists price_source_url text,
  add column if not exists plan_monthly numeric(12,2),
  add column if not exists plan_months integer,
  add column if not exists plan_fees numeric(12,2),
  add column if not exists plan_source_url text,
  add column if not exists minimum_total numeric generated always as
    (price::numeric + plan_monthly * plan_months + plan_fees) stored,
  drop constraint if exists deal_plan_complete,
  add constraint deal_plan_complete check (
    num_nonnulls(plan_monthly, plan_months, plan_fees, plan_source_url) = 0 or
    (num_nonnulls(plan_monthly, plan_months, plan_fees, plan_source_url) = 4
     and plan_monthly >= 0 and plan_months >= 1 and plan_fees >= 0 and plan_source_url like 'https://%')
  );
