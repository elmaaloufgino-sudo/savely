// Run server-side for one Awin transaction; repeat after approval, amendment or return.
// Optional second argument: the last return day verified for this order.
const [id, returnUntil] = process.argv.slice(2);
if (returnUntil !== undefined) {
  const date = new Date(returnUntil + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(returnUntil) ||
      !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== returnUntil) {
    throw new Error('Ange den verifierade sista returdagen som ÅÅÅÅ-MM-DD.');
  }
}
if (!/^\d+$/.test(id || '')) throw new Error('Ange ett transaktions-ID från Awin.');
const { AWIN_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!AWIN_API_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Serverns Awin- och Supabase-uppgifter krävs.');
const endpoint = new URL('https://api.awin.com/publishers/3149456/transactions/');
endpoint.searchParams.set('ids', id);
endpoint.searchParams.set('timezone','UTC');
const response = await fetch(endpoint, { headers: { Authorization: 'Bearer ' + AWIN_API_TOKEN } });
if (!response.ok) throw new Error('Awin svarade med HTTP ' + response.status);
const rows = await response.json();
const tx = rows.find(row => String(row.id) === id);
if (!tx || Number(tx.publisherId) !== 3149456 || Number(tx.advertiserId) !== 27159 ||
    !['Sale','Commission group transaction','Mobile Sale'].includes(tx.type) ||
    tx.commissionAmount?.currency !== 'SEK' || !Number.isFinite(tx.commissionAmount.amount) ||
    !tx.clickRefs?.clickRef) throw new Error('En matchande pilotförsäljning med provision i SEK krävs.');
const result = await fetch(new URL('/rest/v1/rpc/sync_spartoo_pilot',SUPABASE_URL), {
  method: 'POST',
  headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY, 'Content-Type':'application/json' },
  body: JSON.stringify({ p_tx:id, p_click:tx.clickRefs.clickRef, p_state:tx.commissionStatus, p_commission:tx.commissionAmount.amount, p_return_until:returnUntil ?? null })
});
if (!result.ok) throw new Error('Poängavstämningen misslyckades: ' + (await result.json()).message);
console.log(await result.json());
