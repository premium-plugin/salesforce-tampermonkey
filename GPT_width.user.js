// ==UserScript==
// @name         GPT width
// @namespace    http://tampermonkey.net/
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version      2024-12-12
// @description  Adjust GPT chat layout width
// @author       AAV
// @match        *://chat.openai.com/*
// @match        *://chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        none
// ==/UserScript==

(function() {
    console.log('Script start "GPT width"');
    // Warten, bis jQuery geladen ist
    const $ = jQuery.noConflict(true);
    $(document).ready(function() {
        var cssBlock = `
                .md\\:max-w-3xl {
                    max-width: 150rem !important;
                    padding: 0 40px;
                }
                #composer-background {
                    border: 1px solid #ccc;
                }
            `;
        // Style-Tag dynamisch hinzufügen
        $('head').append('<style>' + cssBlock + '</style>');
    });
    console.log('Script end "GPT width"');
})();
