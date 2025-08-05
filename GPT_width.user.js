// ==UserScript==
// @name         ChatGPT Wide Layout (resilient)
// @namespace    https://aav.tools/userscripts
// @version      1.0
// @description  Macht den Chat-Bereich breiter – robust gegen Klassen-Änderungen & SPA-Reloads.
// @match        *://chat.openai.com/*
// @match        *://chatgpt.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const MAX = '150rem';       // Zielbreite
  const PAD = '40px';         // seitliches Padding

  // 1) Globales CSS (früh laden)
  const css = `
    /* generische Container verbreitern */
    main [class*="max-w-"],
    main .mx-auto,
    main .prose { max-width: ${MAX} !important; }
    /* bequemes Padding hinzufügen */
    main [class*="max-w-"],
    main .mx-auto { padding-left: ${PAD} !important; padding-right: ${PAD} !important; }
    /* Composer-Hintergrund notfalls auf volle Breite */
    #composer-background { max-width: ${MAX} !important; width: 100% !important; }
  `;
  function injectCSS() {
    if (document.getElementById('tm-gpt-wide-css')) return;
    const s = document.createElement('style');
    s.id = 'tm-gpt-wide-css';
    s.textContent = css;
    document.documentElement.appendChild(s);
  }

  // 2) Direkt an Elementen nachziehen (falls Klassen wechseln)
  function widen(el) {
    if (!el || el.dataset._gptWide) return;
    el.style.maxWidth = MAX;
    el.style.paddingLeft = PAD;
    el.style.paddingRight = PAD;
    el.dataset._gptWide = '1';
  }
  function scan(root = document) {
    root.querySelectorAll('main [class*="max-w-"], main .mx-auto').forEach(widen);
  }

  // 3) Aktivieren + beobachten
  injectCSS();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scan());
  } else {
    scan();
  }

  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          if (n.matches?.('main [class*="max-w-"], main .mx-auto')) widen(n);
          n.querySelectorAll?.('main [class*="max-w-"], main .mx-auto').forEach(widen);
        });
      } else if (m.type === 'attributes' && m.attributeName === 'class') {
        const t = m.target;
        if ((t.className || '').includes('max-w-') || t.classList?.contains('mx-auto')) widen(t);
      }
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
})();
