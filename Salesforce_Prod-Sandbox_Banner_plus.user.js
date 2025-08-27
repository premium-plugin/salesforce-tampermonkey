// ==UserScript==
// @name         Salesforce Prod/Sandbox Banner + 2-Line Favicon (jQuery, normal weight, accent bottom)
// @namespace    https://example.com
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version      0.2
// @description  Favicon zweizeilig (oben 3, unten 3) + unterer Balken (normal/setup/console). Schrift normal (400). Text 1px höher, Zeilenabstand +1px, zweite Zeile grün akzentuiert. Kein Title-Prefix. Banner bleibt.
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
  if (window !== window.top) return;   // Top-Tab only (redundant, aber ok)
  if (window.__sfFavInit__) return;    // Singleton-Guard
  window.__sfFavInit__ = true;

  // ===== Anzeige-Config =====
  const CANVAS_SIZE       = 64; // wird sauber auf 16x16 skaliert
  const PAD_X             = 0;  // maximal breit
  const BAR_CSS_THICKNESS = 2;  // 2 CSS-Pixel im finalen 16px-Favicon
  const TEXT_UP_PX        = 2;  // beide Textzeilen zusätzlich 1px höher (vorher 1 → jetzt 2)
  const LINE_SPREAD_PX    = 1;  // Zeilenabstand um +1px vergrößern (untere Zeile 1px weiter weg)
  const BOTTOM_TEXT_ACCENT = '#ffff41'; // grelles, aber weiches Grün für 2. Zeile

  // Balkenfarben je Kontext
  const BAR_COLORS = {
    normal:  '#ffffff', // weiß
    setup:   '#000000', // schwarz
    console: '#00e5ff'  // cyan
  };
  let __lastSig = '';

  // ===== Erkennung =====
  function isSetupPage() {
    return (location.pathname || '').includes('/lightning/setup/');
  }
  function isConsolePage() {
    const p = (location.pathname || '').toLowerCase();
    return p.includes('/_ui/common/apex/debug/apexcsipage') || p.includes('/apex/debug/apexcsipage');
  }

  // ===== Helpers =====
  function detectEnv(host) { return host.includes('.sandbox.') ? 'sandbox' : 'prod'; }

  function extractLabel(host) {
    const first = host.split('.')[0];
    const base  = (first.split('--')[0] || '');
    const clean = base.replace(/[^a-z0-9]/gi, '');
    return (clean.slice(0, 3) || '·').toLowerCase(); // oben 3 (lowercase)
  }

  function autoTextColor(bgHex) {
    const hex = bgHex.replace('#','');
    const r = parseInt(hex.substring(0,2),16);
    const g = parseInt(hex.substring(2,4),16);
    const b = parseInt(hex.substring(4,6),16);
    const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return lum < 0.5 ? '#ffffff' : '#000000';
  }

  const OBJ3 = {
    Account:'acc', Contact:'con', Opportunity:'opp', Lead:'led', Case:'cas',
    User:'usr', Campaign:'cmp', Contract:'ctr', Quote:'qte', Order:'ord',
    Product2:'prd', Pricebook2:'pbk', Task:'tsk', Event:'evt',
    Report:'rpt', Dashboard:'dsh'
  };
  function obj3(name){
    if (!name) return 'obj';
    if (OBJ3[name]) return OBJ3[name];
    return (name.replace(/__c$/i,'').replace(/[^a-z0-9]/gi,'').slice(0,3).toLowerCase() || 'obj');
  }

  function setup3(key) {
    if (!key) return 'set';
    const k = key.toLowerCase();
    if (k.includes('role'))       return 'rol';
    if (k.includes('sharing'))    return 'shr';
    if (k.includes('profile'))    return 'prf';
    if (k.includes('permission')) return 'prm';
    if (k.includes('user'))       return 'usr';
    if (k.includes('queue'))      return 'que';
    if (k.includes('object'))     return 'obj';
    if (k.includes('field'))      return 'fld';
    if (k.includes('flow'))       return 'flw';
    if (k.includes('apex'))       return 'apx';
    if (k.includes('email'))      return 'eml';
    if (k.includes('debug'))      return 'dbg';
    return key.replace(/[^a-z0-9]/gi,'').slice(0,3).toLowerCase() || 'set';
  }

  function context3() {
    const p = location.pathname || '';
    if (isConsolePage()) return 'dev';
    if (p.includes('/lightning/setup/')) {
      const after = p.split('/lightning/setup/')[1] || '';
      const parts = after.split('/');

    // Neu: Setup → Object Manager → <ObjectApiName>/...
    if ((parts[0] || '').toLowerCase() === 'objectmanager' && parts[1]) {
      return obj3(parts[1]); // z.B. Account -> acc, Case -> cas, Custom__c -> cus
    }
      const key   = (after.split('/')[0] || '').trim();
      return setup3(key);
    }
    if (p.includes('/lightning/r/')) {
      const parts = (p.split('/lightning/r/')[1] || '').split('/');
      return obj3(parts[0]);
    }
    if (p.includes('/lightning/o/')) {
      const parts = (p.split('/lightning/o/')[1] || '').split('/');
      return obj3(parts[0]);
    }
    if (p.includes('/lightning/page/home')) return 'hme';
    if (location.hostname.includes('salesforce-experience.com')) return 'exp';
    const t = (document.title || '').split(/[\|\-–—]/)[0].trim();
    return (t.replace(/[^a-z0-9]/gi,'').slice(0,3) || 'sfd').toLowerCase();
  }

  // ===== Rendering =====
  function fitFont(ctx, text, weight, maxPx, minPx, maxWidth){
    for (let fs = maxPx; fs >= minPx; fs--){
      ctx.font = `${weight} ${fs}px system-ui, Arial, sans-serif`;
      if (ctx.measureText(text).width <= maxWidth) return fs;
    }
    return minPx;
  }

  function pngTwoLineWithBar(textTop3, textBot3, bg, fgTop, barColor, fgBottomAccent) {
    const size = CANVAS_SIZE;
    const maxW = size - PAD_X * 2;
    const barH = Math.max(1, Math.round(BAR_CSS_THICKNESS * size / 16)); // 2px@16 -> 8px@64

    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');

    // Hintergrund
    ctx.fillStyle = bg; ctx.fillRect(0,0,size,size);

    // Unterer Balken
    ctx.fillStyle = barColor;
    ctx.fillRect(0, size - barH, size, barH);

    // Baselines: um Balkenhöhe + TEXT_UP_PX nach oben; zusätzlich LINE_SPREAD_PX vergrößert Abstand (unten +1px)
    const baseTop = Math.round(size * 0.44) - Math.floor(barH / 2) - TEXT_UP_PX;
    const baseBot = Math.round(size * 0.80) - Math.floor(barH / 2) - TEXT_UP_PX + LINE_SPREAD_PX;

    // Schriftgrößen (oben größer, unten garantiert kleiner), normales Gewicht 400
    const fsTopMax = Math.round(size * 0.64);
    const fsBotMax = Math.round(size * 0.56); // kleiner als oben
    const fsTop = fitFont(ctx, textTop3, '400', fsTopMax, Math.max(10,Math.round(size*0.34)), maxW);
    let   fsBot = fitFont(ctx, textBot3, '400', fsBotMax, Math.max(10,Math.round(size*0.32)), maxW);
    fsBot = Math.min(fsBot, Math.max(10, fsTop - 1));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // TOP (automatische Kontrastfarbe)
    ctx.fillStyle = fgTop;
    ctx.font = `400 ${fsTop}px system-ui, Arial, sans-serif`;
    ctx.fillText(textTop3, (size/2)|0, baseTop);

    // BOTTOM (grüner Akzent)
    ctx.fillStyle = fgBottomAccent;
    ctx.font = `400 ${fsBot}px system-ui, Arial, sans-serif`;
    ctx.fillText(textBot3, (size/2)|0, baseBot);

    return c.toDataURL('image/png');
  }

  function setFavicon(href) {
    $('link[rel*="icon"]').remove();
    $('<link>', { id: 'tm-favicon',  rel: 'icon',          href: href + '#tm=' + Date.now(), sizes: '16x16 32x32 64x64' }).appendTo('head');
    $('<link>', { id: 'tm-favicon2', rel: 'shortcut icon', href: href + '#tm=' + Date.now(), sizes: '16x16 32x32 64x64' }).appendTo('head');
  }

  // ===== Banner (wie gehabt) =====
  function addEnvBanner(env, color) {
    if ($('#env-warning-banner').length) return;
    $('body').prepend('<div id="env-warning-banner" style="position:fixed;top:0;left:0;width:100%;height:4px;background:'+color+';z-index:9999;"></div>');
    const mt = parseInt($('body').css('margin-top') || 0, 10);
    if (mt < 5) $('body').css('margin-top', (mt + 5) + 'px');
  }

  // ===== Apply =====
  function applyAll() {
  try {
    const host  = location.hostname;
    const env   = detectEnv(host);
    const top3  = extractLabel(host);
    const bot3  = context3();
    const state = isConsolePage() ? 'console' : (isSetupPage() ? 'setup' : 'normal');

    // NEU: Signatur – wenn identisch, kein weiterer Lauf
    const sig = [host, env, top3, bot3, state].join('|');
    if (sig === __lastSig) return;
    __lastSig = sig;

    const colors = env === 'prod'
      ? { bg: '#d32f2f', banner: 'red'  }
      : { bg: '#1976d2', banner: 'blue' };

    const fgTop    = autoTextColor(colors.bg);
    const barColor = BAR_COLORS[state] || BAR_COLORS.normal;

    const href = pngTwoLineWithBar(top3, bot3, colors.bg, fgTop, barColor, BOTTOM_TEXT_ACCENT);
    setFavicon(href);
    addEnvBanner(env, colors.banner);
  } catch (e) {
    console.error('[sf-fav] ERROR', e);
  }
}

  // ===== Hooks =====
  function scheduleApplies() {
    applyAll();
    //setTimeout(applyAll, 800);
  }
  if (document.readyState === 'complete') scheduleApplies();
  else window.addEventListener('load', scheduleApplies);

  const mo = new MutationObserver(() => {
    if (!$('link[rel*="icon"]').length) applyAll();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Lightning ist eine SPA – bei URL-Wechsel neu zeichnen
  let lastHref = location.href;
  setInterval(() => {
    const now = location.href;
    if (now !== lastHref) { lastHref = now; applyAll(); }
  }, 1000);
})();
