// ==UserScript==
// @name         Salesforce Prod/Sandbox Banner + Favicon (jQuery)
// @namespace    https://example.com
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version      1.5.1
// @description  Favicon mit 3-Buchstaben + unterer Balken (normal/setup/console). Text vertikal kompakter (Balkenhöhe abgezogen). Kein Title-Prefix.
// @match        *://*.lightning.force.com/*
// @match        *://*.my.salesforce.com/*
// @match        *://*.salesforce-setup.com/*
// @match        *://*.salesforce-experience.com/*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFmAKv1b7d+QAAAABJRU5ErkJggg==
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  if (window !== window.top) return; // nur Top-Tab

  const $ = jQuery.noConflict(true);

  // ===== Konfiguration =====
  const BAR_COLORS = {
    normal:  '#ffffff', // weiß
    setup:   '#000000', // *** schwarz für Setup ***
    console: '#00e5ff'  // cyan für Console (anpassbar)
  };
  const BAR_CSS_THICKNESS = 2; // 2 CSS-Pixel im finalen 16px-Favicon

  // ===== Erkennung =====
  function isSetupPage() {
    return (location.pathname || '').includes('/lightning/setup/');
  }

  // Developer Console exakt unterscheiden
  function isConsolePage() {
    const p = (location.pathname || '');
    return p.includes('/_ui/common/apex/debug/ApexCSIPage') || p.includes('/apex/debug/ApexCSIPage');
  }

  // ===== Helpers =====
  function detectEnv(host) {
    return host.includes('.sandbox.') ? 'sandbox' : 'prod';
  }

  function extractLabel(host) {
    const first = host.split('.')[0];
    const base  = (first.split('--')[0] || '');
    const clean = base.replace(/[^a-z0-9]/gi, '');
    return (clean.slice(0, 3) || '·').toLowerCase();
  }

  // automatische Textfarbe (schwarz/weiß) anhand Grundfarbe
  function autoTextColor(hex) {
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2), 16);
    const g = parseInt(h.substring(2,4), 16);
    const b = parseInt(h.substring(4,6), 16);
    const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    return lum < 0.5 ? '#ffffff' : '#000000';
  }

  // Favicon mit NUR unterem Balken; Text vertikal so, als gäbe es den Balken nicht (kompakter)
  function pngDataUrl(text, bg, fgAuto, state) {
    const size = 64; // skaliert sauber auf 16x16
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');

    // Hintergrund
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Unterer Balken
    const barH = Math.max(1, Math.round((BAR_CSS_THICKNESS * size) / 16)); // 2px@16 -> 8px@64
    ctx.fillStyle = BAR_COLORS[state] || BAR_COLORS.normal;
    ctx.fillRect(0, size - barH, size, barH);

    // Text (3 Buchstaben), zentriert in der Resthöhe (size - barH)
    ctx.fillStyle = fgAuto;
    const fontSize = text.length <= 2 ? 40 : 34;
    ctx.font = '700 ' + fontSize + 'px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Vertikale Mitte OHNE Balken → wirkt kompakter
    const midY = Math.round((size - barH) / 2) + 1; // +1 für minimalen optischen Ausgleich

    // feiner Outline-Rand für Kontrast auf Rot/Blau
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 2;
    ctx.strokeText(text, size/2, midY);
    ctx.fillText(text,   size/2, midY);

    return c.toDataURL('image/png');
  }

  function setFavicon(href) {
    $('link[rel*="icon"]').remove();
    $('<link>', { id: 'tm-favicon',  rel: 'icon',          href: href + '#tm=' + Date.now(), sizes: '16x16 32x32 64x64' }).appendTo('head');
    $('<link>', { id: 'tm-favicon2', rel: 'shortcut icon', href: href + '#tm=' + Date.now(), sizes: '16x16 32x32 64x64' }).appendTo('head');
  }

  function addEnvBanner(env, color) {
    if ($('#env-warning-banner').length) return;
    $('body').prepend('<div id="env-warning-banner" style="position:fixed;top:0;left:0;width:100%;height:4px;background:'+color+';z-index:9999;"></div>');
    const mt = parseInt($('body').css('margin-top') || 0, 10);
    if (mt < 5) $('body').css('margin-top', (mt + 5) + 'px');
    console.log('[sf-fav] banner', env);
  }

  function applyAll() {
    const host  = location.hostname;
    const env   = detectEnv(host);
    const lab   = extractLabel(host);
    const state = isConsolePage() ? 'console' : (isSetupPage() ? 'setup' : 'normal');

    const colors = env === 'prod'
      ? { bg: '#d32f2f', fg: '#ffffff', banner: 'red' }   // PROD = Rot
      : { bg: '#1976d2', fg: '#ffffff', banner: 'blue' }; // SBX  = Blau

    const fgAuto = autoTextColor(colors.bg);

    const href = pngDataUrl(lab, colors.bg, fgAuto, state);
    setFavicon(href);

    addEnvBanner(env, colors.banner);

    console.info('[sf-fav] applied', { env, lab, host, state });
  }

  // nach vollständigem Laden + Nachversuche
  function scheduleApplies() {
    applyAll();
    setTimeout(applyAll, 300);
    setTimeout(applyAll, 1000);
    setTimeout(applyAll, 2500);
  }

  if (document.readyState === 'complete') {
    scheduleApplies();
  } else {
    window.addEventListener('load', scheduleApplies);
  }

  const mo = new MutationObserver(() => {
    if (!$('link[rel*="icon"]').length) applyAll();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
