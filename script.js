(function(){
  'use strict';

  function $id(id){ return document.getElementById(id); }
  function safeAdd(id, ev, fn){ const el=$id(id); if(el) el.addEventListener(ev,fn); }
  function openModal(id){ const m=$id(id); if(m){ m.setAttribute('open',''); m.style.display='flex'; } }
  function closeModal(id){ const m=$id(id); if(m){ m.removeAttribute('open'); m.style.display='none'; } }

  let map, marker, myMarker;
  let history = JSON.parse(localStorage.getItem("gpsHistory") || "[]");

  document.addEventListener('DOMContentLoaded', ()=>{
    // меню
    safeAdd('menuBtn','click',()=>{ $id('sideMenu').classList.add('open'); });
    safeAdd('closeMenu','click',()=>{ $id('sideMenu').classList.remove('open'); });

    // модалки
    safeAdd('openBtn','click',()=>openModal('modalOpen'));
    safeAdd('closeOpen','click',()=>closeModal('modalOpen'));
    safeAdd('historyBtn','click',()=>{ renderHistory(); openModal('modalHistory'); });
    safeAdd('closeHistory','click',()=>closeModal('modalHistory'));
    safeAdd('settingsBtn','click',()=>openModal('settingsModal'));
    safeAdd('closeSettings','click',()=>closeModal('settingsModal'));

    // карта
    initMap();

    // кнопки
    safeAdd('testBtn','click', addTestCoords);
    safeAdd('copyBtn','click', copyCoords);
    safeAdd('exportCsv','click', exportHistory);
    safeAdd('clearHistory','click',()=>{ history=[]; saveHistory(); renderHistory(); });

    // "открыть в"
    safeAdd('openGoogle','click',()=>openInMaps("google"));
    safeAdd('openYandex','click',()=>openInMaps("yandex"));
    safeAdd('openDgis','click',()=>openInMaps("2gis"));
    safeAdd('openOSM','click',()=>openInMaps("osm"));
  });

  function initMap(){
    map=L.map('map').setView([55.75,37.61],12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  }

  function addTestCoords(){
    let lat=55.75+(Math.random()-0.5)*0.1;
    let lon=37.61+(Math.random()-0.5)*0.1;
    if(marker) map.removeLayer(marker);
    marker=L.marker([lat,lon]).addTo(map);
    map.setView([lat,lon],14);
    $id('coordsVal').textContent=`${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    history.push({lat,lon,ts:Date.now()});
    saveHistory();
  }

  function copyCoords(){
    navigator.clipboard.writeText($id('coordsVal').textContent);
    alert("Координаты скопированы!");
  }

  function saveHistory(){ localStorage.setItem("gpsHistory", JSON.stringify(history)); }

  function renderHistory(){
    const list=$id('historyList');
    list.innerHTML="";
    history.forEach(h=>{
      let row=document.createElement("div");
      row.className="history-row";
      row.textContent=`${h.lat.toFixed(5)}, ${h.lon.toFixed(5)} (${new Date(h.ts).toLocaleTimeString()})`;
      list.appendChild(row);
    });
  }

  function exportHistory(){
    let csv="lat,lon,time\n";
    history.forEach(h=>{
      csv+=`${h.lat},${h.lon},${new Date(h.ts).toISOString()}\n`;
    });
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download="history.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function openInMaps(type){
    if(!marker){ alert("Нет координат!"); return; }
    const lat=marker.getLatLng().lat, lon=marker.getLatLng().lng;
    let url="";
    if(type==="google") url=`https://maps.google.com/?q=${lat},${lon}`;
    if(type==="yandex") url=`https://yandex.ru/maps/?pt=${lon},${lat}&z=15&l=map`;
    if(type==="2gis") url=`https://2gis.ru/?query=${lat},${lon}`;
    if(type==="osm") url=`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`;
    window.open(url,"_blank");
  }

})();
