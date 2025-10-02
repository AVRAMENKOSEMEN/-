// script.js — защищённая версия: модалки, кнопки, BLE-логика и отладка
// (замени весь предыдущий script.js этим кодом)

(function(){
  'use strict';

  // --- Утилиты ---
  function $id(id){ return document.getElementById(id); }
  function safeAdd(id, ev, fn){
    const el = $id(id);
    if(el) el.addEventListener(ev, fn);
    else console.warn('Элемент не найден:', id);
  }

  function openModal(modalId){
    const m = $id(modalId);
    if(!m){ console.warn('modal not found', modalId); return; }
    m.setAttribute('open','');
    m.setAttribute('aria-hidden','false');
    m.style.display = 'flex';
    // фокус внутрь
    const panel = m.querySelector('.modal-panel');
    if(panel){
      // небольшой таймаут чтобы фокус был над элементом
      setTimeout(()=> { try{ panel.focus && panel.focus(); }catch(e){} }, 50);
    }
  }
  function closeModal(modalId){
    const m = $id(modalId);
    if(!m) return;
    m.removeAttribute('open');
    m.setAttribute('aria-hidden','true');
    m.style.display = 'none';
  }

  // закрыть все модалки
  function closeAllModals(){
    document.querySelectorAll('.modal').forEach(m => {
      m.removeAttribute('open'); m.setAttribute('aria-hidden','true'); m.style.display='none';
    });
  }

  // Закрытие модалки при клике на оверлей (вне панели)
  function setupOverlayClose(){
    document.querySelectorAll('.modal').forEach(modal=>{
      modal.addEventListener('click', (e)=>{
        if(e.target === modal){ modal.removeAttribute('open'); modal.setAttribute('aria-hidden','true'); modal.style.display='none'; }
      });
    });
  }

  // Esc закрывает все
  function setupEscClose(){
    window.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape') closeAllModals();
    });
  }

  // --- Основной init ---
  document.addEventListener('DOMContentLoaded', ()=> {
    try {
      wireUI();
      setupOverlayClose();
      setupEscClose();
      console.log('UI wired');
    } catch(err){
      console.error('Ошибка инициализации UI', err);
    }
  });

  // --- Переменные приложения (не меняй имена элементов в index.html) ---
  let device = null, server = null, ledCharacteristic = null;
  let beaconLat = null, beaconLon = null, beaconSpd = null;
  let map = null, marker = null, phoneMarker = null, trackLine = null;
  let testInterval = null;

  // --- UI привязки и обработчики (без "crash" если элемент отсутствует) ---
  function wireUI(){
    // меню
    safeAdd('menuBtn', 'click', ()=> {
      const sm = $id('sideMenu');
      if(!sm) return;
      sm.classList.toggle('open');
      sm.setAttribute('aria-hidden', sm.classList.contains('open') ? 'false' : 'true');
    });
    safeAdd('closeMenu','click', ()=> {
      const sm = $id('sideMenu'); if(sm){ sm.classList.remove('open'); sm.setAttribute('aria-hidden','true'); }
    });

    // modals open/close
    safeAdd('openBtn','click', ()=> openModal('modalOpen'));
    safeAdd('closeOpen','click', ()=> closeModal('modalOpen'));

    safeAdd('historyBtn','click', ()=> { renderHistoryList(); openModal('modalHistory'); });
    safeAdd('closeHistory','click', ()=> closeModal('modalHistory'));

    safeAdd('settingsBtn','click', ()=> openModal('settingsModal'));
    safeAdd('closeSettings','click', ()=> closeModal('settingsModal'));

    // кнопки меню справа
    safeAdd('copyBtn','click', copyCoords);
    safeAdd('exportBtn','click', ()=> downloadText('track.csv', HistoryManager.exportCSV()));
    safeAdd('clearHistoryBtn','click', ()=> { HistoryManager.clear(); restoreHistoryToMap(); alert('История очищена'); });

    // open-in кнопки
    safeAdd('openGoogle','click', ()=> openInApp('google'));
    safeAdd('openYandex','click', ()=> openInApp('yandex'));
    safeAdd('openDgis','click', ()=> openInApp('dgis'));
    safeAdd('openOSM','click', ()=> openInApp('osm'));

    // core buttons
    safeAdd('connectBtn','click', connectBLE);
    safeAdd('ledOnBtn','click', ledOn);
    safeAdd('ledOffBtn','click', ledOff);
    safeAdd('testBtn','click', toggleTest);
    safeAdd('exportCsv','click', ()=> downloadText('history.csv', HistoryManager.exportCSV()) );

    // settings modal actions (save/reset)
    safeAdd('saveSettings','click', ()=> {
      const s = {
        theme: ($id('themeSelect') && $id('themeSelect').value) || 'auto',
        units: ($id('unitsSelect') && $id('unitsSelect').value) || 'kmh',
        showMyLocation: !!($id('showMyLocation') && $id('showMyLocation').checked),
        autoFollow: !!($id('autoFollow') && $id('autoFollow').checked)
      };
      saveSettingsLocal(s);
      applySettingsUI(s);
      closeModal('settingsModal');
    });
    safeAdd('resetSettings','click', ()=> {
      localStorage.removeItem('mayak_settings_v10');
      applySettingsUI(loadSettingsLocal());
      closeModal('settingsModal');
    });

    // init map if present
    initMapSafe();
    // restore history and settings if any
    restoreHistoryToMap();
    applySettingsUI(loadSettingsLocal());
  }

  // --- Settings helpers (small local wrappers) ---
  function loadSettingsLocal(){
    try { return JSON.parse(localStorage.getItem('mayak_settings_v10')) || { theme:'auto', units:'kmh', showMyLocation:true, autoFollow:true }; }
    catch(e){ return { theme:'auto', units:'kmh', showMyLocation:true, autoFollow:true }; }
  }
  function saveSettingsLocal(s){
    localStorage.setItem('mayak_settings_v10', JSON.stringify(s));
  }
  function applySettingsUI(s){
    if(!s) s = loadSettingsLocal();
    // theme
    const root = document.documentElement;
    if(s.theme === 'dark') root.classList.add('dark'); else if(s.theme === 'light') root.classList.remove('dark'); else {
      if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark'); else root.classList.remove('dark');
    }
    // populate selects/checkboxes if exist
    if($id('themeSelect')) $id('themeSelect').value = s.theme;
    if($id('unitsSelect')) $id('unitsSelect').value = s.units;
    if($id('showMyLocation')) $id('showMyLocation').checked = !!s.showMyLocation;
    if($id('autoFollow')) $id('autoFollow').checked = !!s.autoFollow;
  }

  // --- Map init (safe) ---
  function initMapSafe(){
    const mapEl = $id('map');
    if(!mapEl){ console.warn('map element missing'); return; }
    try {
      map = L.map('map', { zoomControl:true }).setView([55.75,37.61], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);
    } catch(e){ console.error('Leaflet init error', e); }
  }

  // --- History render/restore ---
  function renderHistoryList(){
    const arr = HistoryManager.load();
    const el = $id('historyList');
    if(!el) return;
    el.innerHTML = '';
    arr.slice().reverse().forEach(item=>{
      const d = new Date(item.time);
      const row = document.createElement('div');
      row.className = 'history-row';
      row.textContent = `${item.lat.toFixed(6)}, ${item.lon.toFixed(6)} — ${d.toLocaleString()}`;
      el.appendChild(row);
    });
  }

  function restoreHistoryToMap(){
    if(!map) return;
    const arr = HistoryManager.load();
    if(!arr || arr.length===0) return;
    const coords = arr.map(a => [a.lat, a.lon]);
    try {
      if(trackLine) map.removeLayer(trackLine);
    } catch(e){}
    trackLine = L.polyline(coords, { color:'red' }).addTo(map);
    // set view to last point
    const last = coords[coords.length-1];
    if(last && loadSettingsLocal().autoFollow) map.setView(last, 15);
    renderHistoryList();
  }

  // --- BLE functions (defensive) ---
  async function connectBLE(){
    if(!navigator.bluetooth){ alert('Web Bluetooth не поддерживается'); return; }
    try{
      const deviceChoice = await navigator.bluetooth.requestDevice({ acceptAllDevices:true, optionalServices:[ /* optionally add known services */ ] });
      device = deviceChoice;
      $id('deviceName') && ($id('deviceName').textContent = device.name || device.id);
      server = await device.gatt.connect();

      // try to find LED characteristic (if you know SERVICE/CHAR put them in optionalServices above)
      try {
        const service = await server.getPrimaryService(SERVICE_UUID);
        ledCharacteristic = await service.getCharacteristic(CHAR_UUID);
      } catch(e) {
        // not fatal
        console.log('LED characteristic not found by default UUIDs');
        ledCharacteristic = null;
      }

      if($id('ledOnBtn')) $id('ledOnBtn').disabled = !ledCharacteristic;
      if($id('ledOffBtn')) $id('ledOffBtn').disabled = !ledCharacteristic;

      // try subscribe to notify characteristics to receive position strings
      try {
        const services = await server.getPrimaryServices();
        for(const s of services){
          const chars = await s.getCharacteristics();
          for(const c of chars){
            if(c.properties.notify){
              try {
                await c.startNotifications();
                c.addEventListener('characteristicvaluechanged', handleChar);
              } catch(e){}
            }
          }
        }
      } catch(e){ console.warn('notify enumerate failed', e); }

    } catch(err){
      console.error('BLE connect error', err);
      alert('Ошибка подключения BLE: ' + (err && err.message ? err.message : err));
    }
  }

  function handleChar(ev){
    try {
      const text = new TextDecoder().decode(ev.target.value);
      parseIncoming(text);
    } catch(e){ console.warn('decode char error', e); }
  }

  function parseIncoming(text){
    if(!text) return;
    // ожидаем формат LAT:..;LON:..;SPD:..
    const parts = text.replace(/\r|\n/g,'').split(';');
    let lat=null, lon=null, spd=null;
    parts.forEach(p=>{
      if(p.startsWith('LAT:')) lat = parseFloat(p.substring(4));
      if(p.startsWith('LON:')) lon = parseFloat(p.substring(4));
      if(p.startsWith('SPD:')) spd = parseFloat(p.split(':')[1]);
    });
    if(lat && lon){
      beaconLat = lat; beaconLon = lon; beaconSpd = spd;
      onBeaconUpdate();
    }
  }

  async function ledOn(){ if(!ledCharacteristic) return alert('LED недоступен'); try{ await ledCharacteristic.writeValue(Uint8Array.of(1)); }catch(e){ alert('Ошибка LED ON: '+e); } }
  async function ledOff(){ if(!ledCharacteristic) return alert('LED недоступен'); try{ await ledCharacteristic.writeValue(Uint8Array.of(0)); }catch(e){ alert('Ошибка LED OFF: '+e); } }

  // --- Beacon update handling ---
  function onBeaconUpdate(){
    if($id('coordsVal')) $id('coordsVal').textContent = beaconLat && beaconLon ? beaconLat.toFixed(6)+', '+beaconLon.toFixed(6) : 'N/A';
    if($id('speedVal')) $id('speedVal').textContent = (beaconSpd!=null) ? beaconSpd : 'N/A';
    HistoryManager.add(beaconLat, beaconLon, beaconSpd);
    addBeaconToMap(beaconLat, beaconLon);
    renderHistoryList();
  }

  function addBeaconToMap(lat, lon){
    if(!map) return;
    try{
      if(!marker){ marker = L.marker([lat, lon]).addTo(map); trackLine = L.polyline([[lat, lon]], { color:'red' }).addTo(map); }
      else { marker.setLatLng([lat, lon]); trackLine.addLatLng([lat, lon]); }
      if(loadSettingsLocal().autoFollow) map.setView([lat, lon], 15);
    } catch(e){ console.warn('addBeaconToMap error', e); }
  }

  // --- Test generator ---
  function toggleTest(){
    if(testInterval){ clearInterval(testInterval); testInterval = null; $id('testBtn') && ($id('testBtn').textContent = '🛰 Тест'); return; }
    let lat = 55.75, lon = 37.61;
    testInterval = setInterval(()=> {
      lat += (Math.random()-0.5)*0.001;
      lon += (Math.random()-0.5)*0.001;
      beaconLat = lat; beaconLon = lon; beaconSpd = +(Math.random()*4).toFixed(1);
      onBeaconUpdate();
    }, 1500);
    $id('testBtn') && ($id('testBtn').textContent = '⛔ Стоп тест');
  }

  // --- Copy/export ---
  function copyCoords(){
    if(!beaconLat || !beaconLon) { alert('Нет координат'); return; }
    navigator.clipboard.writeText(`${beaconLat},${beaconLon}`).then(()=>{ alert('Скопировано'); }).catch(e=>{ alert('Ошибка копирования: '+e); });
  }
  function downloadText(filename, text){
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  // --- Open in external maps ---
  function openInApp(app){
    if(!beaconLat || !beaconLon){ alert('Нет координат'); return; }
    let url = '';
    switch(app){
      case 'google': url = `https://maps.google.com/?q=${beaconLat},${beaconLon}`; break;
      case 'yandex': url = `https://yandex.ru/maps/?whatshere[point]=${beaconLon},${beaconLat}`; break;
      case 'dgis': url = `https://2gis.ru/?queryState=center%2F${beaconLon}%2C${beaconLat}`; break;
      case 'osm': url = `https://www.openstreetmap.org/?mlat=${beaconLat}&mlon=${beaconLon}&zoom=18`; break;
    }
    window.open(url, '_blank');
  }

  // --- Phone GPS and distance calculation ---
  let phoneWatcher = null;
  function startPhoneWatchIfNeeded(){
    const s = loadSettingsLocal();
    if(s.showMyLocation && navigator.geolocation){
      phoneWatcher = navigator.geolocation.watchPosition(pos => {
        const pLat = pos.coords.latitude, pLon = pos.coords.longitude;
        if(!phoneMarker) phoneMarker = L.marker([pLat, pLon], { opacity: 0.9 }).addTo(map);
        else phoneMarker.setLatLng([pLat, pLon]);
        updateDistance();
      }, err => console.warn('GPS error', err), { enableHighAccuracy:true, maximumAge:3000, timeout:5000});
    }
  }
  function updateDistance(){
    if(!phoneMarker || !beaconLat || !beaconLon) return;
    const p = phoneMarker.getLatLng();
    const d = calcDistance(p.lat, p.lng, beaconLat, beaconLon);
    if($id('distanceVal')) $id('distanceVal').textContent = d.toFixed(1) + ' м';
  }
  function calcDistance(a,b,c,d){
    const R = 6371000, toRad = v => v*Math.PI/180;
    const dLat = toRad(c-a), dLon = toRad(d-b);
    const A = Math.sin(dLat/2)**2 + Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2;
    const C = 2*Math.atan2(Math.sqrt(A), Math.sqrt(1-A));
    return R*C;
  }

  // --- Service worker registration (best effort) ---
  function registerSW(){
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('service-worker.js').then(()=> console.log('sw registered')).catch(e=> console.warn('sw register failed', e));
    }
  }
  // run sw registration shortly after load
  window.addEventListener('load', ()=> { try { registerSW(); startPhoneWatchIfNeeded(); } catch(e){} });

  // expose some functions to global for debug
  window._mayak_debug = { openModal, closeModal, closeAllModals, HistoryManager };
})();
