// ==UserScript==
// @name         Make SF Role clean (without actions)
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Make SF Role clean (without actions)
// @author       AAV
// @match        *://*.my.salesforce-setup.com/lightning/setup/Roles/home*
// @match        *://*.my.salesforce-setup.com/ui/setup/user/RoleViewPage*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @grant        none
// ==/UserScript==

(() => {
  /* ------------------------------------------------------------
     Nur aktiv, wenn das OBERSTE Fenster tatsächlich eine Rollen-Seite ist
     (damit das Skript zwar in allen Frames lädt, aber nur greift,
     wenn die Seite “Roles” anzeigt – keine Nebenwirkungen mehr)
  ------------------------------------------------------------- */

  let topHref = location.href;
  try { topHref = window.top.location.href; } catch (e) { /* cross-origin – ignore */ }

  const ROLE_URL = /\/lightning\/setup\/Roles|\/ui\/setup\/user\/RoleViewPage|\/00E/;
  if (!ROLE_URL.test(topHref)) return;

  /* ------------------------------------------------------------
     Klassen, die verschwinden sollen
     (actionsContainer = Lightning-Setup)
  ------------------------------------------------------------- */
  const HIDDEN_CSS = `
    .actions,
    .actionsContainer,
    .emptyBlockSpacer {
      display:none !important;
      visibility:hidden !important;
    }
  `;

  const style = document.createElement('style');
  style.id = 'sf-role-cleaner';
  style.textContent = HIDDEN_CSS;
  (document.head || document.documentElement).appendChild(style);
})();
