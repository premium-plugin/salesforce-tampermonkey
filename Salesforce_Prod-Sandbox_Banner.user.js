// ==UserScript==
// @name         Salesforce Prod/Sandbox Banner + Favicon (jQuery)
// @namespace    https://example.com
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version      1.5
// @description  Banner + Favicon (3 Buchstaben aus MyDomain) farbig nach Umgebung (PROD=Rot, Sandbox=Blau)
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

  // konfliktfreie jQuery-Instanz
  const $ = jQuery.noConflict(true);

  // --------- Helpers ----------
  function detectEnv(host) {
    // Sandbox in Lightning/MyDomain-Hosts hat ".sandbox."
    return host.includes('.sandbox.') ? 'sandbox' : 'prod';
  }

  function extractLabel(host) {
    // z.B. mycom.lightning.force.com  |  agn--fullcopy.sandbox.lightning.force.com
    const first = host.split('.')[0];           // "mycom" | "agn--fullcopy"
    const base  = (first.split('--')[0] || ''); // "mycom" | "agn"
    const clean = base.replace(/[^a-z0-9]/gi, '');
    return (clean.slice(0, 3) || '·').toLowerCase(); // "myc" | "agn"
  }

  function pngDataUrl(text, bg, fg) {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = fg;
    const fontSize = text.length <= 2 ? 40 : 32;
    ctx.font = '700 ' + fontSize + 'px system-ui, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size/2, size/2 + 2);
    return c.toDataURL('image/png');
  }

  function setFavicon(href) {
    $('link[rel*="icon"]').remove(); // entfernt auch "shortcut icon"
    // beide rel-Varianten setzen
    $('<link>', { id: 'tm-favicon', rel: 'icon', href: href + '#tm=' + Date.now(), sizes: '16x16 32x32 64x64' }).appendTo('head');
    $('<link>', { id: 'tm-favicon', rel: 'shortcut icon', href: href + '#tm=' + Date.now(), sizes: '16x16 32x32 64x64' }).appendTo('head');
  }

  function addEnvBanner(env, color) {
    if ($('#env-warning-banner').length) return;
    $('body').prepend(
      '<div id="env-warning-banner" style="position:fixed;top:0;left:0;width:100%;height:4px;background:'+color+';z-index:9999;"></div>'
    );
    // kleinen Margin, damit nix überlappt
    const mt = parseInt($('body').css('margin-top') || 0, 10);
    if (mt < 5) $('body').css('margin-top', (mt + 5) + 'px');
    console.log('[sf-fav] banner', env);
  }

  function applyAll() {
    const host = location.hostname;
    const env  = detectEnv(host);                // 'prod' | 'sandbox'
    const lab  = extractLabel(host);             // 'myc' | 'agn'
    const colors = env === 'prod'
      ? { bg: '#d32f2f', fg: '#ffffff', banner: 'red', tag: 'PROD' }
      : { bg: '#1976d2', fg: '#ffffff', banner: 'blue', tag: 'SBX' };

    // (1) Favicon setzen
    const href = pngDataUrl(lab, colors.bg, colors.fg);
    setFavicon(href);

    // (2) Banner wie in deinem Beispiel
    addEnvBanner(env, colors.banner);

    console.info('[sf-fav] applied', { env, lab, host });
  }

  // nach vollständigem Laden + ein paar Nachversuche (Lightning baut <head> oft später um)
  function scheduleApplies() {
    applyAll();
    setTimeout(applyAll, 300);
    setTimeout(applyAll, 1000);
    setTimeout(applyAll, 2500);
  }

  if (document.readyState === 'complete') {
    scheduleApplies();
  } else {
    // wie in deinem Script: nach load
    window.addEventListener('load', scheduleApplies);
  }

  // Wenn Salesforce später wieder Icons setzt -> erneut anwenden
  const mo = new MutationObserver(() => {
    if (!$('link#tm-favicon[rel*="icon"]').length) applyAll();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
