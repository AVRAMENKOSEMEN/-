// script.js — версия с рабочими модалками, меню и тестом

(function(){
  'use strict';

  function $id(id){ return document.getElementById(id); }
  function safeAdd(id, ev, fn){ const el=$id(id); if(el) el.addEventListener(ev,fn); }

  function openModal(id){ const m=$id(id); if(!m) return; m.setAttribute('open',''); m.style.display='flex'; }
  function closeModal(id){ const m=$id(id); if(!m) return; m.removeAttribute('open'); m.style.display='none'; }

  document.addEventListener('DOMContentLoaded', ()=>{
    // меню
    safeAdd('menuBtn','click',()=>{ const sm=$id('sideMenu'); sm.classList.add('open'); sm.setAttribute('aria-hidden','false'); });
    safeAdd('closeMenu','click',()=>{ const sm=$id('sideMenu'); sm.classList.remove('open'); sm.setAttribute('aria-hidden','true'); });

    // модалки
    safeAdd('openBtn','click',()=>openModal('modalOpen'));
    safeAdd('closeOpen','click',()=>closeModal('modalOpen'));
    safeAdd('historyBtn','click',()=>openModal('modalHistory'));
    safeAdd('closeHistory','click',()=>closeModal('modalHistory'));
    safeAdd('settingsBtn','click',()=>openModal('settingsModal'));
    safeAdd('closeSettings','click',()=>closeModal('settingsModal'));

    // карта
    initMap();
  });

  let map=null, marker=null;
  function initMap(){
    map=L.map('map').setView([55.75,37.61],12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  }

  // Тест: имитация координат
  safeAdd('testBtn','click',()=>{
    let lat=55.75, lon=37.61;
    if(marker) map.removeLayer(marker);
    marker=L.marker([lat,lon]).addTo(map);
    setInterval(()=>{
      lat+=(Math.random()-0.5)*0.01;
      lon+=(Math.random()-0.5)*0.01;
      marker.setLatLng([lat,lon]);
      $id('coordsVal').textContent=lat.toFixed(5)+", "+lon.toFixed(5);
    },2000);
  });

})();
