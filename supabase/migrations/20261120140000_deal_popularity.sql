-- Snapshot of an observed position on PriceRunner's filtered Swedish Black Friday list.
alter table public.deals add column if not exists pricerunner_rank integer check (pricerunner_rank > 0),
  add column if not exists pricerunner_rank_on date,
  add column if not exists pricerunner_rank_url text;
