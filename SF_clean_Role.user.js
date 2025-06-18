// ==UserScript==
// @name         Make SF Role clean (without actions)
// @namespace    http://tampermonkey.net/
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version      0.1
// @description  Make SF Role clean (without actions)
// @author       AAV
// @match        *://*.my.salesforce-setup.com/lightning/setup/Roles*
// @match        https://*.lightning.force.com/*
// @match        https://*.my.salesforce-setup.com/*
// @match        https://*.my.salesforce.com/*

// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAVFBMVEX////7//+a1fE+s+chrOVkvurW7vqV1PKp3PTu+f1zw+wAneEAn+EAoeIAouLB5ff0/P7N6/kapuN8x+0AnuFEtei64vZVuenn9vwbq+WAyu5eveqtqun9AAAAi0lEQVR4AdXQBQ7EIBRFUazG41P3/a9zfNB0Ab0JsYOze8b5NQmpipKVVd3kqGHIkAZgW950kfWw7+g9BknDGHI1WReRJUjusYaNg/AopgRpdrbAJhnlcDUZaocqRULpcEQkE4aFubYdhr5AhFXE39SJY6e37WrQHctaJvOq76JFrvaURcku4+zWPQF2BwuNVVQY9AAAAABJRU5ErkJggg==
// @grant        none
// ==/UserScript==

(() => {
  /* 1) Prüfen, ob die eigene URL eine Rollen-Seite ist
        (Schutz, falls @match mal zu weit fasst) */
  const rolePattern = /lightning\/setup\/Roles|\/ui\/setup\/user\/RoleViewPage|\/00E/;
  if (!rolePattern.test(location.href)) return;

  /* 2) Zu versteckende Klassen */
  const HIDDEN = ['actions', 'emptyBlockSpacer'];

  /* 3) CSS bauen & anhängen */
  const css = HIDDEN.map(c => `.${c}`).join(',') +
              `{display:none !important;visibility:hidden !important}`;

  const style = document.createElement('style');
  style.id = 'sf-role-cleaner';
  style.textContent = css;

  (document.head || document.documentElement).appendChild(style);
})();
