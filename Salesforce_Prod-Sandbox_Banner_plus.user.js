// ==UserScript==
// @name         Salesforce Favicon 2-Line — Flow-stabil (delete-once, remember text, no observers)
// @namespace    https://example.com
// @require      https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version      0.3
// @description  Löscht Icons einmalig pro URL, merkt bot3 einmalig (Parent), setzt eigenes Icon ohne Observer/Loops.
// @match        *://*.lightning.force.com/*
// @match        *://*.my.salesforce.com/*
// @match        *://*.salesforce-setup.com/*
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

  // ===== Anzeige-Config =====
  const CANVAS_SIZE=64, PAD_X=0, BAR_CSS_THICKNESS=2, TEXT_UP_PX=2, LINE_SPREAD_PX=1;
  const ACCENT='#ffff41';
  const BAR_COLORS={normal:'#fff', setup:'#000', console:'#00e5ff'};

  // ===== Helpers =====
  const isSetup=()=> (location.pathname||'').includes('/lightning/setup/');
  const isConsole=()=> {
    const p=(location.pathname||'').toLowerCase();
    return p.includes('/_ui/common/apex/debug/apexcsipage')||p.includes('/apex/debug/apexcsipage');
  };
  const isFlow=()=> /\/builder_platform_interaction\/flowbuilder\.app/i.test((location.pathname||''));
  const envOf=(h)=> h.includes('.sandbox.')?'sandbox':'prod';
  const top3Of=(h)=>{ const f=h.split('.')[0], b=(f.split('--')[0]||''); const c=b.replace(/[^a-z0-9]/gi,''); return (c.slice(0,3)||'·').toLowerCase(); };
  const txtColor=(bg)=>{ const x=bg.replace('#',''); const r=parseInt(x.slice(0,2),16), g=parseInt(x.slice(2,4),16), b=parseInt(x.slice(4,6),16); return ((0.2126*r+0.7152*g+0.0722*b)/255)<0.5?'#fff':'#000'; };
  const OBJ3={Account:'acc',Contact:'con',Opportunity:'opp',Lead:'led',Case:'cas',User:'usr',Campaign:'cmp',Contract:'ctr',Quote:'qte',Order:'ord',Product2:'prd',Pricebook2:'pbk',Task:'tsk',Event:'evt',Report:'rpt',Dashboard:'dsh'};
  const obj3=(n)=> n? (OBJ3[n]|| (n.replace(/__c$/i,'').replace(/[^a-z0-9]/gi,'').slice(0,3).toLowerCase()||'obj')) : 'obj';
  const setup3=(k)=>{ if(!k) return 'set'; k=k.toLowerCase();
    if(k.includes('role'))return'rol'; if(k.includes('sharing'))return'shr'; if(k.includes('profile'))return'prf';
    if(k.includes('permission'))return'prm'; if(k.includes('user'))return'usr'; if(k.includes('queue'))return'que';
    if(k.includes('object'))return'obj'; if(k.includes('field'))return'fld'; if(k.includes('flow'))return'flw';
    if(k.includes('apex'))return'apx'; if(k.includes('email'))return'eml'; if(k.includes('debug'))return'dbg';
    return k.replace(/[^a-z0-9]/gi,'').slice(0,3).toLowerCase()||'set';
  };
  function context3() {
    const p=(location.pathname||'').toLowerCase();
    if (isConsole()) return 'dev';
    if (isFlow()) return 'flo'; // <<< wichtig
    if (p.includes('/lightning/setup/')){
      const after=p.split('/lightning/setup/')[1]||'', parts=after.split('/');
      if ((parts[0]||'')==='objectmanager' && parts[1]) return obj3(parts[1]);
      return setup3((after.split('/')[0]||'').trim());
    }
    if (p.includes('/lightning/r/')){ const a=(p.split('/lightning/r/')[1]||'').split('/'); return obj3(a[0]); }
    if (p.includes('/lightning/o/')){ const a=(p.split('/lightning/o/')[1]||'').split('/'); return obj3(a[0]); }
    if (p.includes('/lightning/page/home')) return 'hme';
    if (location.hostname.includes('salesforce-experience.com')) return 'exp';
    const t=(document.title||'').split(/[\|\-–—]/)[0].trim();
    return (t.replace(/[^a-z0-9]/gi,'').slice(0,3)||'sfd').toLowerCase();
  }

  function fitFont(ctx, text, weight, maxPx, minPx, maxW){
    for (let fs=maxPx; fs>=minPx; fs--){
      ctx.font=`${weight} ${fs}px system-ui, Arial, sans-serif`;
      if (ctx.measureText(text).width<=maxW) return fs;
    }
    return minPx;
  }
  function makeIconData(top3, bot3, bg, fgTop, bar, accent){
    const size=CANVAS_SIZE, maxW=size-PAD_X*2, barH=Math.max(1, Math.round(BAR_CSS_THICKNESS*size/16));
    const c=document.createElement('canvas'); c.width=c.height=size; const ctx=c.getContext('2d');
    ctx.fillStyle=bg; ctx.fillRect(0,0,size,size);
    ctx.fillStyle=bar; ctx.fillRect(0,size-barH,size,barH);
    const baseTop=Math.round(size*0.44)-Math.floor(barH/2)-TEXT_UP_PX;
    const baseBot=Math.round(size*0.80)-Math.floor(barH/2)-TEXT_UP_PX+LINE_SPREAD_PX;
    const fsTopMax=Math.round(size*0.64), fsBotMax=Math.round(size*0.56);
    const fsTop=fitFont(ctx, top3, '400', fsTopMax, Math.max(10,Math.round(size*0.34)), maxW);
    let fsBot=fitFont(ctx, bot3, '400', fsBotMax, Math.max(10,Math.round(size*0.32)), maxW);
    fsBot=Math.min(fsBot, Math.max(10, fsTop-1));
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=fgTop; ctx.font=`400 ${fsTop}px system-ui, Arial, sans-serif`; ctx.fillText(top3, (size/2)|0, baseTop);
    ctx.fillStyle=accent; ctx.font=`400 ${fsBot}px system-ui, Arial, sans-serif`; ctx.fillText(bot3, (size/2)|0, baseBot);
    return c.toDataURL('image/png'); // stabil; kein Timestamp!
  }

  // ===== State pro URL =====
  let lastUrl = '';
  let clearedThisUrl = false;
  let memo = null; // {env, top3, bot3, iconHref}

  function computeMemo(){
    const host=location.hostname;
    const env=envOf(host);
    const top3=top3Of(host);
    const bot3=context3(); // einmalig pro URL
    const colors = env==='prod' ? {bg:'#d32f2f', banner:'red'} : {bg:'#1976d2', banner:'blue'};
    const fgTop = txtColor(colors.bg);
    const bar   = BAR_COLORS[ isConsole()? 'console' : (isSetup()? 'setup' : 'normal') ] || BAR_COLORS.normal;
    const iconHref = makeIconData(top3, bot3, colors.bg, fgTop, bar, ACCENT);
    memo = { env, top3, bot3, colors, iconHref };
  }

  function deleteExistingIconsOnce(){
    if (clearedThisUrl) return;
    clearedThisUrl = true;
    // nur klassische Favicons löschen; Apple-Touch in Ruhe lassen
    document.querySelectorAll('link[rel*="icon"]').forEach(n => n.remove());
  }

  function ensureOurLinks(){
    const head=document.head; if (!head) return;
    let l1=document.getElementById('tm-favicon');
    let l2=document.getElementById('tm-favicon2');

    if (!l1){ l1=document.createElement('link'); l1.id='tm-favicon';  l1.rel='icon';          l1.type='image/png'; head.appendChild(l1); }
    if (!l2){ l2=document.createElement('link'); l2.id='tm-favicon2'; l2.rel='shortcut icon'; l2.type='image/png'; head.appendChild(l2); }

    // Nur setzen, wenn abweichend — kein Timestamp, kein Churn
    if (l1.href !== memo.iconHref) l1.href = memo.iconHref;
    if (l2.href !== memo.iconHref) l2.href = memo.iconHref;

    // unsere ans Ende hängen (last-wins), ohne andere zu löschen
    head.appendChild(l1);
    head.appendChild(l2);
  }

  function ensureBanner(){
    if (document.getElementById('env-warning-banner')) return;
    const div=document.createElement('div');
    div.id='env-warning-banner';
    div.style.cssText=`position:fixed;top:0;left:0;width:100%;height:4px;background:${memo.colors.banner};z-index:9999;`;
    document.body.prepend(div);
    const mt=parseInt((getComputedStyle(document.body).marginTop||'0'),10);
    if (mt<5) document.body.style.marginTop=(mt+5)+'px';
  }

  function applyOncePerUrl(){
    // URL-Wechsel?
    if (location.href !== lastUrl){
      lastUrl = location.href;
      clearedThisUrl = false;
      computeMemo();
      deleteExistingIconsOnce(); // genau einmal pro URL
    } else if (!memo){
      computeMemo();
    }
    ensureOurLinks();   // sanft: nur setzen/moven, keine Lösch-Loop
    ensureBanner();
  }

  function boot(){
    applyOncePerUrl();
    // kleiner zweiter Tick, falls Flow spät lädt
    setTimeout(applyOncePerUrl, 700);
  }

  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);

  // Leichter URL-Watcher (SPA). Kein Head-Observer!
  setInterval(applyOncePerUrl, 1200);
})();
