/* Fyndaren: opt-in consent for optional device storage and external services. */
(() => {
  'use strict';
  const KEY = 'fyndaren-consent-v1', TTL = 180 * 24 * 60 * 60 * 1000;
  const categories = ['preferences','affiliate','newsletter','analytics','googleAnalytics'];
  const empty = () => ({preferences:false,affiliate:false,newsletter:false,analytics:false,googleAnalytics:false});
  let choice = null, memoryOnly = false;
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY));
      if (value && [1,2].includes(value.version) && Number.isFinite(value.at) &&
          Date.now() >= value.at && Date.now() - value.at < TTL &&
          (value.version===1 ? ['preferences','affiliate','newsletter'] : categories).every(key => typeof value[key] === 'boolean')) return {...empty(),...value,...(value.version===1?{analytics:false,googleAnalytics:false}:{})};
    } catch {}
    return null;
  }
  choice = read();
  function allowed(key) { return categories.includes(key) && choice?.[key] === true && Date.now() - choice.at < TTL; }
  function https(raw) { try { const u = new URL(raw); return u.protocol === 'https:' ? u : null; } catch { return null; } }
  function awin(u) { return u && /^(?:[a-z0-9-]+\.)*awin1\.com$/i.test(u.hostname); }
  function affiliateUrl(raw, fallback) {
    const u = https(raw), direct = https(fallback);
    if (awin(u)) {
      u.searchParams.set('cons', allowed('affiliate') ? '1' : '0');
      if (!allowed('affiliate')) for (const k of [...u.searchParams.keys()]) if (/^clickref\d*$/i.test(k)) u.searchParams.delete(k);
      return u.href;
    }
    if (allowed('affiliate') && u) return u.href;
    return direct && !awin(direct) ? direct.href : '#fynd-cookie-settings';
  }
  function sync() {
    document.querySelectorAll('[data-fynd-affiliate],a[href*="awin1.com"]').forEach(a => {
      const raw = a.dataset.fyndAffiliate || a.getAttribute('href');
      if (!a.dataset.fyndAffiliate && !awin(https(raw))) return;
      if (!a.dataset.fyndAffiliate) a.dataset.fyndAffiliate = raw;
      const next = affiliateUrl(a.dataset.fyndAffiliate, a.dataset.fyndDirect);
      if (a.getAttribute('href') !== next) a.setAttribute('href', next);
    });
    document.querySelectorAll('iframe[data-fynd-newsletter]').forEach(frame => {
      const enable = allowed('newsletter');
      frame.hidden = !enable;
      if (enable && !frame.hasAttribute('src')) frame.src = frame.dataset.fyndNewsletter;
      if (!enable && frame.hasAttribute('src')) frame.removeAttribute('src');
    });
    document.querySelectorAll('[data-fynd-newsletter-placeholder]').forEach(el => { el.hidden = allowed('newsletter'); });
  }
  function clearPreferences() {
    if (allowed('preferences')) return;
    try { localStorage.removeItem('fyndaren-active-tab'); localStorage.removeItem('fyndaren-deals-preview-v1'); } catch {}
  }
  let panel, custom, opener;
  function close() {
    if (panel) panel.hidden = true;
    if (opener?.isConnected) opener.focus({preventScroll:true});
    opener = null;
  }
  function save(values) {
    choice = {version:2,at:Date.now(),...empty(),...values};
    try { localStorage.setItem(KEY, JSON.stringify(choice)); memoryOnly = false; } catch { memoryOnly = true; }
    clearPreferences(); sync(); close();
    window.dispatchEvent(new Event('fyndaren-consent-change'));
  }
  function open(settings = false, trigger = null) {
    if (!panel) return;
    opener = trigger;
    for (const key of categories) panel.querySelector('[name="'+key+'"]').checked = allowed(key);
    custom.hidden = !settings;
    panel.querySelector('[data-choice="custom"]').setAttribute('aria-expanded',String(settings));
    panel.hidden = false;
    if (trigger) panel.querySelector(settings?'input[name="preferences"]':'button').focus({preventScroll:true});
  }
  window.FyndarenConsent = {allowed, affiliateUrl, open};
  clearPreferences();
  function init() {
    const style = document.createElement('style');
    style.textContent = `
    #fynd-cookie-panel{position:fixed;z-index:2147483000;bottom:max(12px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(600px,calc(100% - 24px));max-height:calc(100dvh - 28px);overflow:auto;box-sizing:border-box;background:#141416;color:#f4f1e8;border:1px solid #D4AF37;border-radius:18px;padding:20px;box-shadow:0 10px 45px #000a;font:15px/1.5 system-ui,sans-serif;text-align:left}
    #fynd-cookie-panel[hidden],#fynd-cookie-panel [hidden],iframe[data-fynd-newsletter][hidden],[data-fynd-newsletter-placeholder][hidden]{display:none!important}
    #fynd-cookie-panel h2{font:700 19px/1.3 system-ui,sans-serif;color:#E6CA65;margin:0 0 8px}
    #fynd-cookie-panel p{margin:0 0 12px;color:#e4e4e7}
    #fynd-cookie-panel a{color:#E6CA65;text-decoration:underline}
    #fynd-cookie-panel .fc-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 0}
    #fynd-cookie-panel button{font:700 14px/1.3 system-ui,sans-serif;border:1px solid #D4AF37;border-radius:10px;background:#D4AF37;color:#111;min-height:44px;padding:10px;cursor:pointer}
    #fynd-cookie-panel button.fc-secondary{grid-column:1/-1;background:transparent;color:#E6CA65}
    #fynd-cookie-panel label{display:flex;align-items:flex-start;gap:9px;margin:10px 0;color:#eee}
    #fynd-cookie-panel input{width:20px;height:20px;flex:none;accent-color:#D4AF37}
    #fynd-cookie-panel :focus-visible,[data-fynd-cookie-settings]:focus-visible{outline:2px solid #fff;outline-offset:3px}
    [data-fynd-cookie-settings]{font:inherit;color:#E6CA65;text-decoration:underline;background:transparent;border:0;padding:0;cursor:pointer}
    #fynd-cookie-panel .fc-custom{border-top:1px solid #666;padding-top:10px;margin-top:12px}
    @media(max-width:360px){#fynd-cookie-panel{padding:13px;font-size:14px}#fynd-cookie-panel .fc-actions{grid-template-columns:1fr}}
    `;
    document.head.append(style);
    panel = document.createElement('section');
    panel.id = 'fynd-cookie-panel'; panel.hidden = true;
    panel.setAttribute('role','region'); panel.setAttribute('aria-labelledby','fynd-cookie-title');
    panel.innerHTML = '<h2 id="fynd-cookie-title">Din integritet är viktig för oss</h2><p>Vi använder nödvändig lagring för att sidan och inloggningen ska fungera. Du kan välja om vi får spara dina inställningar, använda Awins köpspårning, ladda vårt externa nyhetsbrevsformulär och samla statistik. Vår egen statistik räknar sidvisningar, produktvisningar och butiksklick. Google Analytics är ett separat val och börjar först när tjänsten är ansluten. Du kan använda Fyndaren även om du tackar nej. Poängspårning kräver att affiliate-spårning är tillåten.</p><a href="/cookiepolicy.html">Läs vår cookiepolicy</a><div class="fc-actions"><button type="button" data-choice="all">Acceptera alla</button><button type="button" data-choice="none">Endast nödvändiga</button><button type="button" class="fc-secondary" data-choice="custom" aria-expanded="false">Anpassa inställningar</button></div><div class="fc-custom" hidden><p>Nödvändig lagring är alltid aktiv.</p><label><input type="checkbox" name="preferences"> Funktionell lagring – kom ihåg flik och tillfällig produktlista.</label><label><input type="checkbox" name="affiliate"> Affiliate-spårning – Awin kan registrera köp för provision och eventuell poängspårning.</label><label><input type="checkbox" name="analytics"> Fyndarens statistik – räkna sidvisningar och klick utan besökar-ID.</label><label><input type="checkbox" name="googleAnalytics"> Google Analytics – besöksanalys hos Google när tjänsten är ansluten.</label><label><input type="checkbox" name="newsletter"> Externt formulär – Brevo och Google reCAPTCHA får laddas här.</label><div class="fc-actions"><button type="button" class="fc-secondary" data-choice="save">Spara mina val</button><button type="button" class="fc-secondary" data-choice="close">Stäng utan att ändra</button></div></div>';
    document.body.append(panel);
    custom = panel.querySelector('.fc-custom');
    panel.addEventListener('click', event => {
      const action = event.target.closest('[data-choice]')?.dataset.choice;
      if (action === 'all') save({preferences:true,affiliate:true,newsletter:true,analytics:true,googleAnalytics:true});
      if (action === 'none') save(empty());
      if (action === 'save') save(Object.fromEntries(categories.map(key=>[key,panel.querySelector('[name="'+key+'"]').checked])));
      if (action === 'custom') { custom.hidden = !custom.hidden; event.target.setAttribute('aria-expanded',String(!custom.hidden)); }
      if (action === 'close') close();
    });
    document.addEventListener('click', event => {
      const el = event.target.closest('[data-fynd-cookie-settings],a[href="#fynd-cookie-settings"]');
      if (el) { event.preventDefault(); open(true,el); return; }
      const a = event.target.closest('a[data-fynd-affiliate],a[href*="awin1.com"]');
      if (a) {
        const url = affiliateUrl(a.dataset.fyndAffiliate || a.href,a.dataset.fyndDirect);
        a.setAttribute('href',url);
        if (url.startsWith('#')) {event.preventDefault();open(true,a);}
      }
    },true);
    document.addEventListener('auxclick', event => {
      const a = event.target.closest('a[data-fynd-affiliate],a[href*="awin1.com"]');
      if (a) { const url = affiliateUrl(a.dataset.fyndAffiliate || a.href,a.dataset.fyndDirect); a.setAttribute('href',url); if(url.startsWith('#'))event.preventDefault(); }
    },true);
    window.addEventListener('storage', event => { if(event.key === KEY || event.key === null) {memoryOnly=false;choice=read();clearPreferences();sync();if(!choice || choice.version!==2)open();else close();window.dispatchEvent(new Event('fyndaren-consent-change'));} });
    window.addEventListener('pageshow', () => { choice=memoryOnly && choice && Date.now()-choice.at<TTL ? choice : read(); clearPreferences();sync();if(!choice || choice.version!==2)open();window.dispatchEvent(new Event('fyndaren-consent-change')); });
    sync();
    new MutationObserver(records => { if (records.some(r => r.addedNodes.length)) sync(); }).observe(document.body,{childList:true,subtree:true});
    if (!choice || choice.version!==2) open();
    const analyticsScript=document.createElement('script');analyticsScript.src='/fyndaren-analytics.js';document.head.append(analyticsScript);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();