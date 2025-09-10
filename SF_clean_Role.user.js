// ==UserScript==
// @name         Make SF Role clean (without actions) — tiny
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Hide action UI on Salesforce Role pages
// @author       AAV
// @match        *://*.my.salesforce-setup.com/ui/setup/user/RoleViewPage*
// @match        *://*.my.salesforce.com/ui/setup/user/RoleViewPage*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  // Minimaler, globaler Style – wirkt auch bei nachgeladenem DOM
  const css = `
    .actions,
    .actionsContainer,
    .emptyBlockSpacer {
      display: none !important;
      visibility: hidden !important;
    }
  `;
  const style = document.createElement('style');
  style.id = 'sf-role-cleaner';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
})();
