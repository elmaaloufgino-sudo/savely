/* Consent-gated first-party event counts and optional Google Analytics 4.
 * Set GA_ID only after configuring the GA4 property and reviewing its settings. */
(() => {
  'use strict';
  const GA_ID = ''; // G-XXXXXXXXXX; intentionally disabled until provided
  const API = 'https://ebmqzrejrpijitxeggsl.supabase.co/rest/v1/rpc/record_fyndaren_stat';
  const KEY = 'sb_publishable_ep-vKQBf3tjvDC2h03BlYQ_hwUqrvY5';
  const consent = key => window.FyndarenConsent?.allowed(key) === true;
  const matchId = location.pathname.match(/^\/fynd\/[^/]+-(\d+)\/?$/);
  const numberId = v => Number.isSafeInteger(Number(v)) && Number(v)>0 && Number(v)<=2147483647 ? Number(v) : 0;
  const pageDeal = numberId(matchId?.[1]);
  const path = location.pathname;
  const page = pageDeal ? 'deal' : path==='/'||path==='/index.html'?'home':path==='/app.html'?'app':path==='/fynd/'||path==='/fynd/index.html'?'catalog':path==='/nyhetsbrev.html'?'newsletter':'other';
  function source() {
    const classify = value => {
      const s = String(value||'').toLowerCase();
      if (/^(www\.)?google(?:\.[a-z.]+)?$/.test(s)) return 'google';
      if (/^(?:(?:www|l|m|lm)\.)?(?:facebook(?:\.com)?|fb|fb\.com)$/.test(s)) return 'facebook';
      if (/^(?:www\.|l\.)?(?:instagram(?:\.com)?|ig)$/.test(s)) return 'instagram';
      if (/^(?:www\.)?(?:bing(?:\.com)?|duckduckgo(?:\.com)?)$/.test(s)) return 'other_search';
      return null;
    };
    const campaign = classify(new URLSearchParams(location.search).get('utm_source'));
    if(campaign)return campaign;
    try { const ref = new URL(document.referrer); if(ref.origin===location.origin)return 'internal'; return classify(ref.hostname)||'other'; } catch { return 'direct'; }
  }
  const traffic = source();
  const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(navigator.userAgent)?'tablet':/Mobi|iPhone|Android/i.test(navigator.userAgent)?'mobile':'desktop';
  let localPageSent=false, googlePageSent=false, tagLoaded=false;
  const gaConfigured = /^G-[A-Z0-9]+$/.test(GA_ID);
  function googleAllowed(){return gaConfigured && consent('googleAnalytics');}
  function loadGoogle() {
    if(!googleAllowed()||tagLoaded)return;
    tagLoaded=true;
    window['ga-disable-'+GA_ID]=false;
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
    window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    window.gtag('consent','update',{analytics_storage:'granted'});
    window.gtag('js',new Date());
    window.gtag('config',GA_ID,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
    const tag=document.createElement('script');
    tag.async=true;tag.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA_ID);
    document.head.append(tag);
  }
  function clearGoogleCookies(){
    for(const part of document.cookie.split(';')){
      const name=part.split('=')[0].trim();
      if(!/^_ga(?:_|$)/.test(name))continue;
      for(const domain of ['',location.hostname,'.'+location.hostname]){
        document.cookie=name+'=; Max-Age=0; path=/'+(domain?'; domain='+domain:'')+'; Secure; SameSite=Lax';
      }
    }
  }
  function googleEvent(name,id) {
    if(!googleAllowed()||!tagLoaded)return;
    const safePage = location.origin+(page==='deal'?'/fynd/deal-'+pageDeal+'/':path);
    window.gtag('event',name,{send_to:GA_ID,page_location:safePage,page_referrer:'',page_title:page,deal_id:id||undefined,traffic_source:traffic,device_class:device});
  }
  function localEvent(name,id) {
    if(!consent('analytics'))return;
    fetch(API,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_event:name,p_page:page,p_deal:id||0,p_source:traffic,p_device:device}),keepalive:true,credentials:'omit',referrerPolicy:'no-referrer'}).catch(()=>{});
  }
  function track(name,id=0){
    if(!['product_view','shop_click'].includes(name))return;
    localEvent(name,numberId(id));googleEvent(name,numberId(id));
  }
  function sync(){
    if(consent('analytics')&&!localPageSent){localPageSent=true;localEvent('page_view',pageDeal);if(pageDeal)localEvent('product_view',pageDeal);}
    if(!googleAllowed()){
      if(tagLoaded){window['ga-disable-'+GA_ID]=true;clearGoogleCookies();}
      return;
    }
    loadGoogle();window['ga-disable-'+GA_ID]=false;
    if(!googlePageSent){googlePageSent=true;googleEvent('page_view',pageDeal);if(pageDeal)googleEvent('product_view',pageDeal);}
  }
  window.FyndarenAnalytics={track};
  window.addEventListener('fyndaren-consent-change',sync);
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('click',e=>{
    const a=e.target.closest?.('a.product-cta,.card .go a,a.golink,a.primary[data-fynd-shop]');
    if(!a||e.defaultPrevented||!/^https:\/\//i.test(a.href)||a.getAttribute('href')?.startsWith('#'))return;
    track('shop_click',numberId(a.dataset.fyndDeal||a.closest('[data-product]')?.dataset.product||pageDeal));
  });
  // Stop Google collection if consent expires while a page remains open.
  if(gaConfigured)setInterval(sync,30000);
  sync();
})();
