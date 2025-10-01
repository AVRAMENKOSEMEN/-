// Improved script v5
let device=null, server=null;
let beaconLat=null, beaconLon=null, beaconSpd=null;
let map, marker, phoneMarker;
let testMode=false, testInterval=null;
let phoneLat=null, phoneLon=null;

// init map after Leaflet loaded
window.addEventListener('load', ()=>{
  initMap();
  setupUI();
  registerServiceWorker();
  startPhoneWatch();
});

function setupUI(){
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  connectBtn.addEventListener('click', connectBluetooth);
  disconnectBtn.addEventListener('click', disconnectBluetooth);
  document.getElementById('testBtn').addEventListener('click', toggleTestMode);
  document.getElementById('copyBtn').addEventListener('click', copyCoords);
  document.getElementById('moreBtn').addEventListener('click', openModal);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  // external app buttons
  document.getElementById('openGoogle').addEventListener('click', ()=> openInApp('google'));
  document.getElementById('openYandex').addEventListener('click', ()=> openInApp('yandex'));
  document.getElementById('openDgis').addEventListener('click', ()=> openInApp('dgis'));
  document.getElementById('openOSM').addEventListener('click', ()=> openInApp('osm'));
  // status button
  document.getElementById('statusBtn').addEventListener('click', checkBluetoothAvailability);
}

function initMap(){
  try {
    map = L.map('map').setView([55.7558,37.6173],6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    marker = L.marker([55.7558,37.6173]).addTo(map);
    phoneMarker = L.marker([55.7558,37.6173],{opacity:0.9}).addTo(map);
  } catch(e){
    console.error('Leaflet init error:', e);
  }
}

async function connectBluetooth(){
  if (!navigator.bluetooth){ alert('Ваш браузер не поддерживает Web Bluetooth. Используйте Chrome/Edge на Android.'); return; }
  try{
    // request device; acceptAllDevices shows chooser. You can filter by services or namePrefix if desired.
    const options = { acceptAllDevices: true, optionalServices: [] };
    device = await navigator.bluetooth.requestDevice(options);
    document.getElementById('deviceName').innerText = device.name || device.id;
    document.getElementById('disconnectBtn').style.display = 'inline-block';
    document.getElementById('connectBtn').style.display = 'none';
    server = await device.gatt.connect();
    console.log('Connected to', device.name || device.id);
    // enumerate services and subscribe to notify if available
    const services = await server.getPrimaryServices();
    for (const s of services){
      const chars = await s.getCharacteristics();
      for (const c of chars){
        if (c.properties.notify){
          try{ await c.startNotifications();
            c.addEventListener('characteristicvaluechanged', ev=>{
              try{
                const text = new TextDecoder().decode(ev.target.value);
                handleData(text);
              }catch(e){ console.log('decode error', e); }
            });
          }catch(e){ console.warn('startNotifications failed', e); }
        }
      }
    }
  } catch(err){
    console.error('connectBluetooth error', err);
    alert('Ошибка подключения: ' + err);
  }
}

function disconnectBluetooth(){
  if (device && device.gatt && device.gatt.connected){
    device.gatt.disconnect();
    alert('Отключено');
  }
  device = null;
  server = null;
  document.getElementById('deviceName').innerText = 'Не подключено';
  document.getElementById('disconnectBtn').style.display = 'none';
  document.getElementById('connectBtn').style.display = 'inline-block';
}

function checkBluetoothAvailability(){
  if (!navigator.bluetooth){ alert('Web Bluetooth не поддерживается в этом браузере'); return; }
  // cannot directly check if BT is enabled; attempt a harmless request to prompt OS if needed
  navigator.bluetooth.getAvailability().then(avail => {
    alert('Bluetooth доступен: ' + avail);
  }).catch(err => alert('Ошибка проверки Bluetooth: ' + err));
}

function handleData(text){
  if (!text) return;
  text = text.replace(/\r/g,'').replace(/\n/g,'').trim();
  const parts = text.split(';');
  for (const p of parts){
    if (p.startsWith('LAT:')) beaconLat = parseFloat(p.substring(4));
    if (p.startsWith('LON:')) beaconLon = parseFloat(p.substring(4));
    if (p.startsWith('SPD:') || p.startsWith('SPEED:')) beaconSpd = parseFloat(p.split(':')[1]);
  }
  updateUI();
}

function updateUI(){
  const coordsVal = document.getElementById('coordsVal');
  const speedVal = document.getElementById('speedVal');
  if (beaconLat!=null && beaconLon!=null){
    coordsVal.innerText = beaconLat.toFixed(6) + ', ' + beaconLon.toFixed(6);
    speedVal.innerText = beaconSpd!=null ? beaconSpd : 'N/A';
    marker.setLatLng([beaconLat, beaconLon]);
    map.setView([beaconLat, beaconLon], 15);
    updateDistanceDisplay();
  }
}

function copyCoords(){
  if (beaconLat!=null && beaconLon!=null){
    navigator.clipboard.writeText(`${beaconLat},${beaconLon}`).then(()=>alert('Координаты скопированы'));
  } else alert('Координаты недоступны');
}

function toggleTestMode(){ 
  testMode = !testMode;
  const testBtn = document.getElementById('testBtn');
  testBtn.setAttribute('aria-pressed', String(testMode));
  if (testMode){
    testInterval = setInterval(()=>{
      const lat = 55.75 + Math.random()*0.02;
      const lon = 37.61 + Math.random()*0.02;
      const spd = (Math.random()*50).toFixed(1);
      handleData(`LAT:${lat.toFixed(6)};LON:${lon.toFixed(6)};SPD:${spd}`);
    },2000);
  } else {
    clearInterval(testInterval);
  }
}

function openModal(){
  const modal = document.getElementById('modal');
  modal.setAttribute('open','');
  modal.style.zIndex = 2147483647; // ensure topmost
  // prevent map from stealing focus/scroll
  document.getElementById('map').style.pointerEvents = 'none';
}

function closeModal(){
  const modal = document.getElementById('modal');
  modal.removeAttribute('open');
  document.getElementById('map').style.pointerEvents = '';
}

function startPhoneWatch(){
  if (!navigator.geolocation) return;
  navigator.geolocation.watchPosition(pos=>{
    phoneLat = pos.coords.latitude;
    phoneLon = pos.coords.longitude;
    if (!phoneMarker) return;
    phoneMarker.setLatLng([phoneLat, phoneLon]);
    updateDistanceDisplay();
  }, err=>console.warn('GPS error', err), { enableHighAccuracy:true, maximumAge:3000, timeout:5000 });
}

function calcDistanceMeters(lat1, lon1, lat2, lon2){
  const R = 6371e3;
  const φ1 = lat1*Math.PI/180; const φ2 = lat2*Math.PI/180;
  const Δφ = (lat2-lat1)*Math.PI/180; const Δλ = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2);
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}

function updateDistanceDisplay(){
  const el = document.getElementById('distanceVal');
  if (beaconLat!=null && beaconLon!=null && phoneLat!=null && phoneLon!=null){
    const meters = calcDistanceMeters(phoneLat, phoneLon, beaconLat, beaconLon);
    el.innerText = `${meters.toFixed(1)} м`;
  } else el.innerText = 'N/A';
}

function openInApp(app){
  if (beaconLat==null || beaconLon==null){ alert('Нет координат маяка'); return; }
  let url='';
  switch(app){
    case 'google': url = `https://maps.google.com/?q=${beaconLat},${beaconLon}`; break;
    case 'yandex': url = `yandexmaps://maps.yandex.ru/?pt=${beaconLon},${beaconLat}&z=15&l=map`; break;
    case 'dgis': url = `dgis://2gis.ru/geo/${beaconLat},${beaconLon}`; break;
    case 'osm': url = `https://www.openstreetmap.org/?mlat=${beaconLat}&mlon=${beaconLon}#map=15/${beaconLat}/${beaconLon}`; break;
  }
  // open in new tab/window - on mobile external app handlers may intercept
  window.open(url,'_blank');
}

// PWA SW registration and update flow (same as v4)
function registerServiceWorker(){
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('service-worker.js').then(reg=>{
    console.log('SW registered', reg);
    if (reg.waiting) promptUpdate(reg);
    reg.addEventListener('updatefound', ()=>{
      const installing = reg.installing;
      installing && installing.addEventListener('statechange', ()=>{
        if (installing.state === 'installed' && navigator.serviceWorker.controller) promptUpdate(reg);
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', ()=>{
      console.log('controllerchange - reloading'); window.location.reload();
    });
  }).catch(err=>console.error('SW register failed', err));
}

function promptUpdate(reg){
  const btn = document.getElementById('updateBtn');
  btn.style.display = 'inline-block';
  btn.onclick = ()=>{ if (reg.waiting) reg.waiting.postMessage({action:'skipWaiting'}); };
}

// listen for messages from SW
navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', event=>{
  if (event.data && event.data.type === 'NEW_VERSION') {
    document.getElementById('updateBtn').style.display = 'inline-block';
  }
});
