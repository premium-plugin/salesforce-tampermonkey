// ==UserScript==
// @name         Salesforce Favicon + Env Marker — ULTRA LITE MAPPED
// @namespace    https://example.com
// @version      0.4
// @description  Salesforce Prod/Sandbox Favicon + Thin Top Line + Org Badge with mapping
// @match        *://*.lightning.force.com/*
// @match        *://*.my.salesforce.com/*
// @match        *://*.salesforce-setup.com/*
// @match        *://*.salesforce-experience.com/*
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

  // --------- config ----------
  const ORG_MAP = {
    agn: 'AXIANS'
  };

  const CANVAS = 64;
  const PAD_X = 0;
  const BAR_THICK = 2;
  const TEXT_UP = 2;
  const LINE_SPREAD = 1;
  const ACCENT = '#ffff41';

  const BAR = {
    normal: '#fff',
    setup: '#000',
    console: '#00e5ff'
  };

  const ENV_COLOR = {
    prod: '#d32f2f',
    sandbox: '#1976d2'
  };

  const ENV_LABEL = {
    prod: 'PROD',
    sandbox: 'SANDBOX'
  };

  // --------- helpers ----------
  const path = () => (location.pathname || '').toLowerCase();

  const isSetup = () => path().includes('/lightning/setup/');

  const isConsole = () =>
    path().includes('/_ui/common/apex/debug/apexcsipage') ||
    path().includes('/apex/debug/apexcsipage');

  const isFlow = () =>
    /\/builder_platform_interaction\/flowbuilder\.app/.test(path());

  const envOf = (host) =>
    host.includes('.sandbox.') ? 'sandbox' : 'prod';

  const orgKeyOf = (host) => {
    const first = host.split('.')[0] || '';
    const base = first.split('--')[0] || '';

    return base
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
  };

  const orgLabelOf = (host) => {
    const key = orgKeyOf(host);

    if (ORG_MAP[key]) {
      return ORG_MAP[key].toUpperCase();
    }

    for (const mapKey of Object.keys(ORG_MAP)) {
      if (key.startsWith(mapKey.toLowerCase())) {
        return ORG_MAP[mapKey].toUpperCase();
      }
    }

    return (key || 'ORG').toUpperCase();
  };

  const top3Of = (host) =>
    orgLabelOf(host)
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 3)
      .toUpperCase() || 'ORG';

  const obj3 = (name) =>
    ((name || '')
      .replace(/__c$/i, '')
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 3) || 'OBJ'
    ).toUpperCase();

  const setup3 = (key) => {
    const k = (key || '').toLowerCase();

    if (!k) return 'SET';
    if (k.includes('outboundchangeset')) return 'CHG';
    if (k.includes('inboundchangeset')) return 'CHG';
    if (k.includes('changeset')) return 'CHG';
    if (k.includes('role')) return 'ROL';
    if (k.includes('sharing')) return 'SHR';
    if (k.includes('profile')) return 'PRF';
    if (k.includes('permission')) return 'PRM';
    if (k.includes('user')) return 'USR';
    if (k.includes('queue')) return 'QUE';
    if (k.includes('object')) return 'OBJ';
    if (k.includes('field')) return 'FLD';
    if (k.includes('flow')) return 'FLW';
    if (k.includes('apex')) return 'APX';
    if (k.includes('email')) return 'EML';
    if (k.includes('debug')) return 'DBG';

    return (k.replace(/[^a-z0-9]/gi, '').slice(0, 3) || 'SET').toUpperCase();
  };

  function context3() {
    const p = path();

    if (isConsole()) return 'DEV';
    if (isFlow()) return 'FLO';

    if (p.includes('/lightning/setup/')) {
      const after = p.split('/lightning/setup/')[1] || '';
      const parts = after.split('/');

      if ((parts[0] || '') === 'objectmanager' && parts[1]) {
        return obj3(parts[1]);
      }

      return setup3((after.split('/')[0] || '').trim());
    }

    if (p.includes('/lightning/r/')) {
      const a = (p.split('/lightning/r/')[1] || '').split('/');
      return obj3(a[0]);
    }

    if (p.includes('/lightning/o/')) {
      const a = (p.split('/lightning/o/')[1] || '').split('/');
      return obj3(a[0]);
    }

    if (p.includes('/lightning/page/home')) return 'HME';
    if (location.hostname.includes('salesforce-experience.com')) return 'EXP';

    const t = (document.title || '').split(/[\|\-–—]/)[0].trim();

    return (
      t.replace(/[^a-z0-9]/gi, '').slice(0, 3) || 'SFD'
    ).toUpperCase();
  }

  const txtColor = (bg) => {
    const h = bg.slice(1);
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);

    return ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) < 0.5
      ? '#fff'
      : '#000';
  };

  function fitFont(ctx, text, weight, maxPx, minPx, maxW) {
    for (let fs = maxPx; fs >= minPx; fs--) {
      ctx.font = `${weight} ${fs}px system-ui, Arial, sans-serif`;

      if (ctx.measureText(text).width <= maxW) {
        return fs;
      }
    }

    return minPx;
  }

  function makeIcon(top3, bot3, bg, fgTop, barColor) {
    const size = CANVAS;
    const maxW = size - PAD_X * 2;
    const barH = Math.max(1, Math.round(BAR_THICK * size / 16));

    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;

    const ctx = c.getContext('2d');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = barColor;
    ctx.fillRect(0, size - barH, size, barH);

    const baseTop = Math.round(size * 0.44) - Math.floor(barH / 2) - TEXT_UP;
    const baseBot = Math.round(size * 0.80) - Math.floor(barH / 2) - TEXT_UP + LINE_SPREAD;

    const fsTop = fitFont(
      ctx,
      top3,
      '400',
      Math.round(size * 0.64),
      Math.max(10, Math.round(size * 0.34)),
      maxW
    );

    let fsBot = fitFont(
      ctx,
      bot3,
      '400',
      Math.round(size * 0.56),
      Math.max(10, Math.round(size * 0.32)),
      maxW
    );

    fsBot = Math.min(fsBot, Math.max(10, fsTop - 1));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = fgTop;
    ctx.font = `400 ${fsTop}px system-ui, Arial, sans-serif`;
    ctx.fillText(top3.toUpperCase(), (size / 2) | 0, baseTop);

    ctx.fillStyle = ACCENT;
    ctx.font = `400 ${fsBot}px system-ui, Arial, sans-serif`;
    ctx.fillText(bot3.toUpperCase(), (size / 2) | 0, baseBot);

    return c.toDataURL('image/png');
  }

  // --------- env marker ----------
  let memo = null;

  function ensureEnvMarker() {
    if (!document.head || !document.body || !memo) return;

    const env = memo.env;
    const org = memo.orgLabel;

    const color = ENV_COLOR[env] || '#666';
    const label = ENV_LABEL[env] || env.toUpperCase();

    let style = document.getElementById('tm-sf-env-marker-style');

    if (!style) {
      style = document.createElement('style');
      style.id = 'tm-sf-env-marker-style';
      document.head.appendChild(style);
    }

    style.textContent = `
      #tm-sf-env-marker {
        pointer-events: none;
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        font-family: system-ui, Arial, sans-serif;
      }

      #tm-sf-env-marker-line {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: ${color};
        box-shadow: 0 1px 4px rgba(0, 0, 0, .45);
      }

      #tm-sf-env-marker-badge {
        position: fixed;
        top: 11px;
        right: 270px;
        max-width: calc(100vw - 130px);
        overflow: hidden;
        text-overflow: ellipsis;
        background: ${color};
        color: #fff;
        font-size: 12px;
        line-height: 1;
        padding: 8px 13px;
        border-radius: 999px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, .45);
        letter-spacing: .4px;
        opacity: .97;
        white-space: nowrap;
      }

      @media (max-width: 700px) {
        #tm-sf-env-marker-badge {
          right: 10px;
          top: auto;
          bottom: 12px;
          max-width: calc(100vw - 20px);
          font-size: 14px;
          padding: 8px 12px;
        }
      }
    `;

    let marker = document.getElementById('tm-sf-env-marker');

    if (!marker) {
      marker = document.createElement('div');
      marker.id = 'tm-sf-env-marker';
      document.body.appendChild(marker);
    }

    marker.innerHTML = `
      <div id="tm-sf-env-marker-line"></div>
      <div id="tm-sf-env-marker-badge">${label} · ${org}</div>
    `;
  }

  // --------- favicon ----------
  function ensureOurIcon() {
    const head = document.head;
    if (!head || !memo) return;

    document.querySelectorAll('link[rel*="icon"]').forEach((n) => {
      if (n.id !== 'tm-favicon' && n.id !== 'tm-favicon2') {
        n.remove();
      }
    });

    let l1 = document.getElementById('tm-favicon');
    let l2 = document.getElementById('tm-favicon2');

    if (!l1) {
      l1 = document.createElement('link');
      l1.id = 'tm-favicon';
      l1.rel = 'icon';
      l1.type = 'image/png';
      head.appendChild(l1);
    }

    if (!l2) {
      l2 = document.createElement('link');
      l2.id = 'tm-favicon2';
      l2.rel = 'shortcut icon';
      l2.type = 'image/png';
      head.appendChild(l2);
    }

    l1.href = memo.iconHref;
    l2.href = memo.iconHref;

    head.appendChild(l1);
    head.appendChild(l2);
  }

  // --------- core ----------
  function computeMemo() {
    const env = envOf(location.hostname);
    const top3 = top3Of(location.hostname);
    const bot3 = context3();
    const orgLabel = orgLabelOf(location.hostname);

    const state = isConsole()
      ? 'console'
      : isSetup()
        ? 'setup'
        : 'normal';

    const bg = ENV_COLOR[env] || '#666';

    const href = makeIcon(
      top3,
      bot3,
      bg,
      txtColor(bg),
      BAR[state] || BAR.normal
    );

    memo = {
      env,
      top3,
      bot3,
      orgLabel,
      iconHref: href
    };
  }

  function apply() {
    computeMemo();
    ensureOurIcon();
    ensureEnvMarker();
  }

  function delayedApply() {
    setTimeout(apply, 0);
    setTimeout(apply, 300);
    setTimeout(apply, 1000);
    setTimeout(apply, 2500);
    setTimeout(apply, 5000);
  }

  // --------- boot ----------
  if (document.readyState === 'complete') {
    delayedApply();
  } else {
    window.addEventListener('load', delayedApply);
  }

  // --------- SPA navigation ----------
  const originalPushState = history.pushState;
  history.pushState = function () {
    const result = originalPushState.apply(this, arguments);
    delayedApply();
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function () {
    const result = originalReplaceState.apply(this, arguments);
    delayedApply();
    return result;
  };

  window.addEventListener('popstate', delayedApply, true);
  window.addEventListener('hashchange', delayedApply, true);

  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest && e.target.closest('a[href]');

      if (a && a.origin === location.origin) {
        delayedApply();
      }
    },
    true
  );

  setInterval(apply, 3000);
})();
