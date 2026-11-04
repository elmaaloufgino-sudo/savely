-- Restrict default privileges for future objects created by postgres in public.
-- New client-facing objects must receive explicit grants and RLS policies.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Reward data is not public. Remove anonymous access and narrow signed-in
-- access to the operations represented by existing RLS policies.
REVOKE ALL PRIVILEGES ON TABLE
  public.reward_admins,
  public.reward_catalog,
  public.reward_redemption_allocations,
  public.reward_redemption_events,
  public.reward_redemptions,
  public.reward_store_rates,
  public.reward_transactions
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.reward_admins,
  public.reward_catalog,
  public.reward_redemption_allocations,
  public.reward_store_rates
TO authenticated;

GRANT SELECT, INSERT ON TABLE public.reward_redemption_events TO authenticated;
GRANT SELECT, UPDATE ON TABLE
  public.reward_redemptions,
  public.reward_transactions
TO authenticated;

-- The personal summary endpoint is only useful to signed-in users.
REVOKE EXECUTE ON FUNCTION public.get_my_reward_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_reward_summary() TO authenticated, service_role;
