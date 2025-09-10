// ==UserScript==
// @name         Salesforce Banner + Favicon
// @namespace    https://example.com
// @version      0.3
// @description  Salesforce Prod/Sandbox Banner + Icon
// @match        *://*.lightning.force.com/*
// @match        *://*.my.salesforce.com/*
// @match        *://*.salesforce-setup.com/*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFmAKv1b7d+QAAAABJRU5ErkJggg==
// @run-at       document-end
// @grant        none
// @noframes
// ==/UserScript==

(function () {
  'use strict';
  if (window !== window.top) return;
  if (window.__sfFavInit__) return;
  window.__sfFavInit__ = true;

  // --------- config (minimal) ----------
  const CANVAS = 64;            // 64px canvas → skaliert sauber auf 16px
  const PAD_X = 0;              // horizontaler Innenabstand (0 = maximal breit)
  const BAR_THICK = 2;          // 2px bei 16px → 8px bei 64px
  const TEXT_UP = 2;            // Text etwas höher
  const LINE_SPREAD = 1;        // etwas mehr Abstand unten
  const ACCENT = '#ffff41';     // Akzentfarbe unten
  const BAR = { normal:'#fff', setup:'#000', console:'#00e5ff' };

  // --------- tiny helpers ----------
  const path = () => (location.pathname || '').toLowerCase();
  const isSetup = () => path().includes('/lightning/setup/');
  const isConsole = () => path().includes('/_ui/common/apex/debug/apexcsipage') || path().includes('/apex/debug/apexcsipage');
  const isFlow = () => /\/builder_platform_interaction\/flowbuilder\.app/.test(path());
  const envOf = (h) => h.includes('.sandbox.') ? 'sandbox' : 'prod';
  const top3Of = (h) => {
    const first = h.split('.')[0], base = (first.split('--')[0] || '');
    const clean = base.replace(/[^a-z0-9]/gi,'');
    return (clean.slice(0,3) || '·').toLowerCase();
  };
  const obj3 = (name) => (name||'').replace(/__c$/i,'').replace(/[^a-z0-9]/gi,'').slice(0,3).toLowerCase() || 'obj';
  const setup3 = (key) => {
    const k = (key||'').toLowerCase();
    if (!k) return 'set';
    if (k.includes('role')) return 'rol';
    if (k.includes('sharing')) return 'shr';
    if (k.includes('profile')) return 'prf';
    if (k.includes('permission')) return 'prm';
    if (k.includes('user')) return 'usr';
    if (k.includes('queue')) return 'que';
    if (k.includes('object')) return 'obj';
    if (k.includes('field')) return 'fld';
    if (k.includes('flow')) return 'flw';
    if (k.includes('apex')) return 'apx';
    if (k.includes('email')) return 'eml';
    if (k.includes('debug')) return 'dbg';
    return k.replace(/[^a-z0-9]/gi,'').slice(0,3) || 'set';
  };
  function context3() {
    const p = path();
    if (isConsole()) return 'dev';
    if (isFlow())    return 'flo'; // <<< Fix für Flow-Builder
    if (p.includes('/lightning/setup/')) {
      const after = p.split('/lightning/setup/')[1] || '';
      const parts = after.split('/');
      if ((parts[0]||'') === 'objectmanager' && parts[1]) return obj3(parts[1]);
      return setup3((after.split('/')[0] || '').trim());
    }
    if (p.includes('/lightning/r/')) { const a=(p.split('/lightning/r/')[1]||'').split('/'); return obj3(a[0]); }
    if (p.includes('/lightning/o/')) { const a=(p.split('/lightning/o/')[1]||'').split('/'); return obj3(a[0]); }
    if (p.includes('/lightning/page/home')) return 'hme';
    if (location.hostname.includes('salesforce-experience.com')) return 'exp';
    const t=(document.title||'').split(/[\|\-–—]/)[0].trim();
    return (t.replace(/[^a-z0-9]/gi,'').slice(0,3)||'sfd').toLowerCase();
  }
  const txtColor = (bg) => {
    const h = bg.slice(1), r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
    return ((0.2126*r+0.7152*g+0.0722*b)/255) < 0.5 ? '#fff' : '#000';
  };

  function fitFont(ctx, text, weight, maxPx, minPx, maxW){
    for (let fs=maxPx; fs>=minPx; fs--){
      ctx.font = `${weight} ${fs}px system-ui, Arial, sans-serif`;
      if (ctx.measureText(text).width <= maxW) return fs;
    }
    return minPx;
  }
  function makeIcon(top3, bot3, bg, fgTop, barColor){
    const size=CANVAS, maxW=size - PAD_X*2, barH=Math.max(1, Math.round(BAR_THICK*size/16));
    const c=document.createElement('canvas'); c.width=c.height=size;
    const ctx=c.getContext('2d');
    ctx.fillStyle=bg; ctx.fillRect(0,0,size,size);
    ctx.fillStyle=barColor; ctx.fillRect(0, size-barH, size, barH);
    const baseTop=Math.round(size*0.44)-Math.floor(barH/2)-TEXT_UP;
    const baseBot=Math.round(size*0.80)-Math.floor(barH/2)-TEXT_UP+LINE_SPREAD;
    const fsTop=fitFont(ctx, top3, '400', Math.round(size*0.64), Math.max(10,Math.round(size*0.34)), maxW);
    let fsBot=fitFont(ctx, bot3, '400', Math.round(size*0.56), Math.max(10,Math.round(size*0.32)), maxW);
    fsBot=Math.min(fsBot, Math.max(10, fsTop-1));
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=fgTop; ctx.font=`400 ${fsTop}px system-ui, Arial, sans-serif`; ctx.fillText(top3, (size/2)|0, baseTop);
    ctx.fillStyle=ACCENT; ctx.font=`400 ${fsBot}px system-ui, Arial, sans-serif`; ctx.fillText(bot3, (size/2)|0, baseBot);
    return c.toDataURL('image/png'); // stabil (ohne Timestamp)
  }

  // --------- core logic (kurz & loop-frei) ----------
  let lastUrl = '';
  let clearedForUrl = false;
  let memo = null; // {env, top3, bot3, colors, iconHref}

  function computeMemoOncePerUrl(){
    if (memo && lastUrl === location.href) return;
    lastUrl = location.href;
    clearedForUrl = false;        // beim URL-Wechsel genau EINmal löschen
    const env = envOf(location.hostname);
    const top3 = top3Of(location.hostname);
    const bot3 = context3();      // ← einmal pro URL „merken“
    const colors = env==='prod' ? { bg:'#d32f2f' } : { bg:'#1976d2' };
    // state-Farbe nur fürs Icon (Banner gestrichen)
    const state = isConsole() ? 'console' : (isSetup() ? 'setup' : 'normal');
    const href = makeIcon(top3, bot3, colors.bg, txtColor(colors.bg), BAR[state] || BAR.normal);
    memo = { env, top3, bot3, colors, iconHref: href };
  }

  function deleteExistingIconsOnce(){
    if (clearedForUrl) return;
    clearedForUrl = true;
    document.querySelectorAll('link[rel*="icon"]').forEach(n => n.remove());
  }

  function ensureOurIcon(){
    const head = document.head; if (!head) return;
    let l1 = document.getElementById('tm-favicon');
    let l2 = document.getElementById('tm-favicon2');
    if (!l1) { l1 = document.createElement('link'); l1.id='tm-favicon';  l1.rel='icon';          l1.type='image/png'; head.appendChild(l1); }
    if (!l2) { l2 = document.createElement('link'); l2.id='tm-favicon2'; l2.rel='shortcut icon'; l2.type='image/png'; head.appendChild(l2); }
    if (l1.href !== memo.iconHref) l1.href = memo.iconHref;
    if (l2.href !== memo.iconHref) l2.href = memo.iconHref;
    // last-wins: ans Ende hängen, ohne andere dauernd zu löschen
    head.appendChild(l1); head.appendChild(l2);
  }

  function apply(){
    computeMemoOncePerUrl();
    deleteExistingIconsOnce();
    ensureOurIcon();
    // einmal leicht verzögert, um späte Injektionen abzufangen – ohne Loop/Observer
    setTimeout(() => { ensureOurIcon(); }, 500);
  }

  // --------- boot + spa-navigation (ohne Intervalle/Observer) ----------
  const boot = () => apply();
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);

  // SPA: auf echte URL-Änderungen reagieren (history-Hook + popstate + hashchange)
  (function hookHistory(){
    const callApply = () => setTimeout(apply, 0);
    const _ps = history.pushState; history.pushState = function(){ const r=_ps.apply(this, arguments); callApply(); return r; };
    const _rs = history.replaceState; history.replaceState = function(){ const r=_rs.apply(this, arguments); callApply(); return r; };
    window.addEventListener('popstate', callApply, true);
    window.addEventListener('hashchange', callApply, true);
    // einige interne Router feuern auch auf clicks → Fallback
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (a && a.origin === location.origin) setTimeout(apply, 0);
    }, true);
  })();

})();
