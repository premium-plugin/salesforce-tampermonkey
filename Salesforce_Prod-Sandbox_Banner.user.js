// ==UserScript==
// @name         Salesforce Prod/Sandbox Banner
// @namespace    https://example.com
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version      1.4
// @description  Zeigt ein Banner an, um zwischen Produktions- und Sandbox-Umgebungen zu unterscheiden.
// @author       AAV
// @match        *://*.lightning.force.com/*
// @match        *://*.salesforce-setup.com/*
// @match        *://*.salesforce-experience.com/*
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAVFBMVEX////7//+a1fE+s+chrOVkvurW7vqV1PKp3PTu+f1zw+wAneEAn+EAoeIAouLB5ff0/P7N6/kapuN8x+0AnuFEtei64vZVuenn9vwbq+WAyu5eveqtqun9AAAAi0lEQVR4AdXQBQ7EIBRFUazG41P3/a9zfNB0Ab0JsYOze8b5NQmpipKVVd3kqGHIkAZgW950kfWw7+g9BknDGHI1WReRJUjusYaNg/AopgRpdrbAJhnlcDUZaocqRULpcEQkE4aFubYdhr5AhFXE39SJY6e37WrQHctaJvOq76JFrvaURcku4+zWPQF2BwuNVVQY9AAAAABJRU5ErkJggg==
// @grant        none
// ==/UserScript==

(function() {
    console.log('Script start "Salesforce Prod/Sandbox"');

    // Konfliktfreie jQuery-Instanz
    const $ = jQuery.noConflict(true);

    // Banner hinzufügen
    function addEnvBanner() {
        const hostname = window.location.hostname;
        const isProd = !hostname.includes('--sandbox') && !hostname.includes('sandbox');
        console.log('Environment is Production:', isProd);

        // Farbe und Text je nach Umgebung
        const bannerColor = isProd ? 'red' : 'blue';
        const backgroundColor = isProd ? 'rgba(255,0,0,0.5)' : 'rgba(0,0,255,0.5)';
        const bannerMessage = isProd ? 'Production Environment' : 'Sandbox Environment';

        // Warnleiste hinzufügen
        const snowflakeLeft = "❄"; // Symbol links
        const snowflakeRight = "❄"; // Symbol rechts
        $('body').prepend(`
            <div id="env-warning-banner" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background-color: ${bannerColor};
                z-index: 9999;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            "></div>
        `);
        $('.forceSearchAssistant').prepend('<span style="color: ' + bannerColor + '; font-size: 18px; z-index: 10000;"> ' + snowflakeLeft + ' </span>');
        $('.forceSearchAssistant').append('<span style="color: ' + bannerColor + '; font-size: 18px; z-index: 10000;"> ' + snowflakeRight + ' </span>');
        $('.forceSearchInputDesktop').prepend('<span style="color: ' + bannerColor + '; font-size: 18px; z-index: 10000;"> ' + snowflakeLeft + ' </span>');
        $('.forceSearchInputDesktop').append('<span style="color: ' + bannerColor + '; font-size: 18px; z-index: 10000;"> ' + snowflakeRight + ' </span>');
        console.log(bannerMessage);

        // Platz für die fixe Leiste schaffen
        $('body').css('margin-top', '5px');
        
        if (!document.getElementById('env-style')) {
            $('head').append(`
                <style id="env-style">
                    .slds-global-header {  }
                </style>
            `);
        }
    }

    // Skript erst nach vollständigem Seitenaufbau ausführen
    window.addEventListener('load', () => {
        console.log('Page fully loaded. Executing script...');
        addEnvBanner();
    });

    console.log('Script end "Salesforce Prod/Sandbox"');
})();
