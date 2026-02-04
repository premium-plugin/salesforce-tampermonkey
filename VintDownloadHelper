// ==UserScript==
// @name         NativeVideo - Download before Trim (iframe-src videoURL + logs + safe fallback)
// @namespace    http://tampermonkey.net/
// @version      2026-02-04
// @description  Adds "Download" before "Trim" inside NativeVideo menu. Finds MP4 via iframe src param (videoURL=...), logs detection, tries fetch->blob download, falls back to opening tab if blocked (CORS/403/etc).
// @author       AAV
// @match        https://mycom--nativevideo.vf.force.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // =========================================================
  // CONFIG
  // =========================================================
  const DEBUG = true; // <- auf false wenn’s nervt

  const LOG_PREFIX = '[NV-DL]';
  const log  = (...a) => { if (DEBUG) console.log(LOG_PREFIX, ...a); };
  const warn = (...a) => { console.warn(LOG_PREFIX, ...a); };

  // =========================================================
  // CONTEXT
  // =========================================================
  const host = location.host;
  const isVF = host.includes('.vf.force.com');

  // Dein Use-Case ist: VF-Seite zeigt Menü, darin iframe auf lightning apex
  // Wenn du es trotzdem auch auf lightning laufen lassen willst, entferne das return.
  if (!isVF) {
    log('Not VF context, exit. host=', host);
    return;
  }

  log('Boot. host=', host, 'href=', location.href);

  // =========================================================
  // URL DETECTION
  // =========================================================
  let lastUrl = null;

  function setUrl(u, source) {
    if (!u || typeof u !== 'string') return;
    if (u === lastUrl) return;
    lastUrl = u;
    log('URL set from', source, '=>', u);
    updateAllDownloadButtons();
  }

  function guessFilename(urlStr) {
    try {
      const u = new URL(urlStr);
      const name = u.pathname.split('/').pop() || 'video.mp4';
      return name.includes('.') ? name : 'video.mp4';
    } catch {
      return 'video.mp4';
    }
  }

  // 1) Primär: iframe src contains videoURL=...
  function getUrlFromIframeSrc() {
    try {
      const frames = [...document.querySelectorAll('iframe.nvPlayerFrame[src*="videoURL="]')];
      if (!frames.length) {
        log('No nvPlayerFrame iframe with videoURL= found yet');
        return null;
      }

      // nimm den letzten (oft der aktuelle Player)
      const iframe = frames.at(-1);
      const src = iframe.getAttribute('src');
      if (!src) {
        warn('Iframe found but src missing');
        return null;
      }

      // src ist same-origin lesbar, Inhalte nicht – reicht aber.
      const u = new URL(src, location.href);

      // Wichtig: URLSearchParams gibt decoded string zurück (meistens), wir versuchen trotzdem safe zu decoden.
      let v = u.searchParams.get('videoURL');
      if (!v) {
        warn('Iframe src found, but videoURL param missing');
        return null;
      }

      // Defensive decode (falls doppelt encodiert)
      try { v = decodeURIComponent(v); } catch {}

      // sanity: mp4 check
      if (!v.includes('transcoded.mp4')) {
        warn('videoURL found but does not look like transcoded.mp4:', v);
        // trotzdem zurückgeben, kann auch andere streams geben
      } else {
        log('videoURL looks like mp4:', v.slice(0, 120) + '...');
      }

      return v;
    } catch (e) {
      warn('getUrlFromIframeSrc failed:', e);
      return null;
    }
  }

  // 2) Optional: falls mal direkt auf apex-Seite (oder wenn VF mal ohne iframe lädt)
  function getUrlFromOwnQuery() {
    try {
      const qs = new URLSearchParams(location.search);
      let v = qs.get('videoURL');
      if (!v) return null;
      try { v = decodeURIComponent(v); } catch {}
      return v;
    } catch {
      return null;
    }
  }

  // 3) Optional: PerformanceObserver (nur wenn MP4 im selben Frame geladen wird – meistens NICHT bei dir)
  const PICK = (u) =>
    typeof u === 'string' &&
    u.includes('transcoded.mp4'); // absichtlich kein Host-Filter

  try {
    const existing = performance.getEntriesByType('resource').map(e => e.name).filter(PICK);
    if (existing.length) setUrl(existing.at(-1), 'performance-existing');

    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        if (PICK(e.name)) setUrl(e.name, 'performance-observer');
      }
    });
    po.observe({ type: 'resource', buffered: true });
  } catch (e) {
    log('PerformanceObserver not available:', e);
  }

  // =========================================================
  // DOWNLOAD LOGIC
  // =========================================================
  async function directDownload(urlStr) {
    // Hinweis: wird sehr oft an CORS scheitern (Browser-Security).
    // Dann gehen wir automatisch auf Fallback (Tab auf URL).
    log('directDownload: fetching…');
    const r = await fetch(urlStr, { mode: 'cors', credentials: 'omit' });
    log('directDownload: response', r.status, r.type);

    if (!r.ok) throw new Error('HTTP ' + r.status);

    const blob = await r.blob();
    log('directDownload: blob size=', blob.size);

    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = guessFilename(urlStr);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
  }

  function showWorkingMessage(w) {
    if (!w) return;
    try {
      w.document.open();
      w.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Downloading…</title>
            <style>
              body{font:14px system-ui;margin:24px}
              .box{max-width:520px}
              .muted{opacity:.7}
            </style>
          </head>
          <body>
            <div class="box">
              <h3>Download läuft…</h3>
              <div class="muted">Bitte Tab nicht schließen. Wenn der Browser Fetch blockt, öffnet dieser Tab direkt die MP4.</div>
            </div>
          </body>
        </html>
      `);
      w.document.close();
    } catch {}
  }

  function openBlankTab() {
    try {
      const w = window.open('about:blank', '_blank'); // user gesture
      if (w) {
        try { w.opener = null; } catch {}
        showWorkingMessage(w);
      }
      return w;
    } catch (e) {
      warn('openBlankTab failed (popup blocker?):', e);
      return null;
    }
  }

  function markBroken(btn, reason) {
    if (!btn) return;
    btn.textContent = 'Download (broken)';
    btn.style.opacity = '0.75';
    warn('not ok:', reason || 'unknown');
  }

  // =========================================================
  // UI INJECTION
  // =========================================================
  function ensureUrlFresh() {
    // wichtigste Quelle: iframe src
    const u1 = getUrlFromIframeSrc();
    if (u1) setUrl(u1, 'iframe-src');

    // sekundär: eigener Query
    if (!lastUrl) {
      const u2 = getUrlFromOwnQuery();
      if (u2) setUrl(u2, 'self-query');
    }
  }

  function updateAllDownloadButtons() {
    // falls Buttons schon existieren: "broken" zurücknehmen, sobald URL da ist
    const btns = document.querySelectorAll('button.nv-tm-download');
    btns.forEach(btn => {
      if (lastUrl) {
        if (btn.textContent.includes('(broken)')) btn.textContent = 'Download';
        btn.style.opacity = '';
      }
    });
  }

  function inject() {
    ensureUrlFresh();

    const menus = document.querySelectorAll('.nv-trimmer-menu-popup');
    if (!menus.length) return;

    menus.forEach(menu => {
      if (menu.querySelector('.nv-tm-download')) return;

      const items = [...menu.querySelectorAll('button.nv-trimmer-menu-item')];
      const trimBtn = items.find(b => (b.textContent || '').trim().toLowerCase() === 'trim');

      const dl = document.createElement('button');
      dl.type = 'button';
      dl.className = 'nv-trimmer-menu-item nv-tm-download';
      dl.textContent = 'Download';

      dl.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // frisch ziehen (weil iframe/src oft später kommt)
        ensureUrlFresh();

        const url = lastUrl || getUrlFromIframeSrc() || getUrlFromOwnQuery();

        if (!url) {
          markBroken(dl, 'No video URL detected (iframe not found / videoURL param missing)');
          return;
        }

        const oldText = dl.textContent;
        dl.textContent = 'Download…';

        // Tab sofort öffnen (user gesture), damit Fallback nicht blockiert wird
        const w = openBlankTab();

        try {
          await directDownload(url);
          log('ok: direct download triggered');

          try { if (w && !w.closed) w.close(); } catch {}
        } catch (err) {
          // typisch: TypeError: Failed to fetch (CORS) oder HTTP 403 wenn URL abgelaufen
          warn('directDownload failed -> fallback to tab navigation:', err);

          // Fallback: Tab auf direkte MP4 navigieren (Browser kann dann selbst downloaden)
          try {
            if (w && !w.closed) w.location.href = url;
            else window.open(url, '_blank');
          } catch (e2) {
            warn('fallback window.open failed:', e2);
            try { window.open(url, '_blank'); } catch {}
          }
        } finally {
          dl.textContent = oldText;
        }
      }, true);

      if (trimBtn) menu.insertBefore(dl, trimBtn);
      else menu.insertBefore(dl, menu.firstChild);

      // NICHT mehr "broken" beim Inject – weil URL oft erst später kommt.
      updateAllDownloadButtons();
    });
  }

  // =========================================================
  // OBSERVE DOM
  // =========================================================
  const mo = new MutationObserver(inject);
  mo.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', inject);

})();
