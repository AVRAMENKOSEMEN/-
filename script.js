// Main app logic v10

let device = null, server = null, ledCharacteristic = null;
let beaconLat = null, beaconLon = null, beaconSpd = null;
let map = null, marker = null, phoneMarker = null, trackLine = null;
let testInterval = null;

// Default BLE UUID placeholders — заменяй на свои
const SERVICE_UUID = '00001523-1212-efde-1523-785feabcd123'; // example nRF service
const CHAR_UUID = '00001525-1212-efde-1523-785feabcd123';    // example nRF LED char

// Initialize after DOM
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  wireUI();
  restoreHistoryToMap();
  startPhoneWatchIfNeeded();
  registerSW();
});

// ---------- Map ----------
function initMap(){
  map = L.map('map', { zoomControl: true }).setView([55.75, 37.61], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

// Add or update beacon point and track
function addBeaconPoint(lat, lon){
  if (!marker){
    marker = L.marker([lat, lon]).addTo(map);
    trackLine = L.polyline([[lat, lon]], { color: 'red' }).addTo(map);
  } else {
    marker.setLatLng([lat, lon]);
    trackLine.addLatLng([lat, lon]);
  }
  // optionally auto-follow
  const settings = loadSettings();
  if (settings.autoFollow) map.setView([lat, lon], 16);
}

// ---------- UI wiring ----------
function wireUI(){
  // menu & panels
  document.getElementById('menuBtn').addEventListener('click', ()=> document.getElementById('sideMenu').classList.toggle('open'));
  document.getElementById('closeMenu').addEventListener('click', ()=> document.getElementById('sideMenu').classList.remove('open'));

  // core buttons
  document.getElementById('connectBtn').addEventListener('click', connectBLE);
  document.getElementById('ledOnBtn').addEventListener('click', ledOn);
  document.getElementById('ledOffBtn').addEventListener('click', ledOff);
  document.getElementById('testBtn').addEventListener('click', toggleTest);
  document.getElementById('historyBtn').addEventListener('click', ()=> document.getElementById('modalHistory').setAttribute('open',''));
  document.getElementById('closeHistory').addEventListener('click', ()=> document.getElementById('modalHistory').removeAttribute('open'));
  document.getElementById('openBtn').addEventListener('click', ()=> document.getElementById('modalOpen').setAttribute('open',''));
  document.getElementById('closeOpen').addEventListener('click', ()=> document.getElementById('modalOpen').removeAttribute('open'));
  document.getElementById('copyBtn').addEventListener('click', copyCoords);
  document.getElementById('exportBtn').addEventListener('click', ()=> downloadText('track.csv', HistoryManager.exportCSV()));
  document.getElementById('clearHistoryBtn').addEventListener('click', ()=> { HistoryManager.clear(); restoreHistoryToMap(); alert('История очищена'); });
  document.getElementById('exportCsv').addEventListener('click', ()=> downloadText('history.csv', HistoryManager.exportCSV()));

  // open-in buttons
  document.getElementById('openGoogle').addEventListener('click', ()=> openInApp('google'));
  document.getElementById('openYandex').addEventListener('click', ()=> openInApp('yandex'));
  document.getElementById('openDgis').addEventListener('click', ()=> openInApp('dgis'));
  document.getElementById('openOSM').addEventListener('click', ()=> openInApp('osm'));

  // settings modal control
  document.getElementById('settingsBtn').addEventListener('click', ()=> document.getElementById('settingsModal').setAttribute('open',''));
  document.getElementById('closeSettings').addEventListener('click', ()=> document.getElementById('settingsModal').removeAttribute('open'));
}

// ---------- BLE ----------
async function connectBLE(){
  if (!navigator.bluetooth) { alert('Web Bluetooth не поддерживается в этом браузере'); return; }
  try {
    const deviceChoice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID] // can include many services
    });
    device = deviceChoice;
    document.getElementById('deviceName').textContent = device.name || device.id;
    server = await device.gatt.connect();

    // try to get LED characteristic if available
    try {
      const service = await server.getPrimaryService(SERVICE_UUID);
      ledCharacteristic = await service.getCharacteristic(CHAR_UUID);
    } catch (e) {
      // characteristic not found — LED buttons remain disabled
      ledCharacteristic = null;
    }

    document.getElementById('ledOnBtn').disabled = !ledCharacteristic;
    document.getElementById('ledOffBtn').disabled = !ledCharacteristic;

    // subscribe to notify characteristics (if any) to receive position strings
    try {
      const services = await server.getPrimaryServices();
      for (const s of services) {
        const chars = await s.getCharacteristics();
        for (const c of chars) {
          if (c.properties.notify) {
            try {
              await c.startNotifications();
              c.addEventListener('characteristicvaluechanged', handleChar);
            } catch (err) { /* ignore per-characteristic failure */ }
          }
        }
      }
    } catch (e) {
      console.warn('Notification subscription failed', e);
    }

  } catch (err) {
    console.error(err);
    alert('Ошибка BLE: ' + err);
  }
}

function handleChar(ev){
  try {
    const text = new TextDecoder().decode(ev.target.value);
    parseIncoming(text);
  } catch(e) {
    console.warn('handleChar decode', e);
  }
}

// Expected text: "LAT:55.75;LON:37.61;SPD:1.2" — adapt to your device
function parseIncoming(text){
  if (!text) return;
  const parts = text.replace(/\r|\n/g,'').split(';');
  let lat=null, lon=null, spd=null;
  parts.forEach(p=>{
    if (p.startsWith('LAT:')) lat = parseFloat(p.substring(4));
    if (p.startsWith('LON:')) lon = parseFloat(p.substring(4));
    if (p.startsWith('SPD:')) spd = parseFloat(p.split(':')[1]);
  });
  if (lat && lon) {
    beaconLat = lat; beaconLon = lon; beaconSpd = spd;
    onBeaconUpdate();
  }
}

function onBeaconUpdate(){
  document.getElementById('coordsVal').textContent = (beaconLat && beaconLon) ? beaconLat.toFixed(6)+', '+beaconLon.toFixed(6) : 'N/A';
  document.getElementById('speedVal').textContent = beaconSpd!=null ? beaconSpd : 'N/A';
  HistoryManager.add(beaconLat, beaconLon, beaconSpd);
  addBeaconPoint(beaconLat, beaconLon);
  renderHistoryList();
}

// LED functions
async function ledOn(){
  if (!ledCharacteristic) return alert('LED характеристика недоступна');
  try { await ledCharacteristic.writeValue(Uint8Array.of(1)); }
  catch(e){ alert('Ошибка отправки команды LED: ' + e); }
}
async function ledOff(){
  if (!ledCharacteristic) return alert('LED характеристика недоступна');
  try { await ledCharacteristic.writeValue(Uint8Array.of(0)); }
  catch(e){ alert('Ошибка отправки команды LED: ' + e); }
}

// ---------- Test mode ----------
function toggleTest(){
  if (testInterval) { clearInterval(testInterval); testInterval = null; document.getElementById('testBtn').textContent = '🛰 Тест'; return; }
  let lat = 55.75, lon = 37.61;
  testInterval = setInterval(()=> {
    lat += (Math.random()-0.5)*0.001;
    lon += (Math.random()-0.5)*0.001;
    beaconLat = lat; beaconLon = lon; beaconSpd = +(Math.random()*5).toFixed(1);
    onBeaconUpdate();
  }, 1800);
  document.getElementById('testBtn').textContent = '⛔ Стоп тест';
}

// ---------- History UI ----------
function renderHistoryList(){
  const arr = HistoryManager.load();
  const el = document.getElementById('historyList');
  el.innerHTML = '';
  arr.slice().reverse().forEach(item=>{
    const d = new Date(item.time);
    const row = document.createElement('div');
    row.className = 'history-row';
    row.textContent = `${item.lat.toFixed(6)}, ${item.lon.toFixed(6)} — ${d.toLocaleString()}`;
    el.appendChild(row);
  });
}

// restore track on load
function restoreHistoryToMap(){
  const arr = HistoryManager.load();
  if (!arr || arr.length === 0) return;
  const coords = arr.map(a => [a.lat, a.lon]);
  if (coords.length) trackLine = L.polyline(coords, { color: 'red' }).addTo(map);
  renderHistoryList();
}

// ---------- Phone geolocation ----------
let phoneWatcher = null;
function startPhoneWatchIfNeeded(){
  const s = loadSettings();
  if (s.showMyLocation && navigator.geolocation){
    phoneWatcher = navigator.geolocation.watchPosition(pos => {
      const pLat = pos.coords.latitude, pLon = pos.coords.longitude;
      if (!phoneMarker) phoneMarker = L.marker([pLat, pLon], { opacity: 0.9 }).addTo(map);
      else phoneMarker.setLatLng([pLat, pLon]);
      updateDistance();
    }, err => console.warn('gps err', err), { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 });
  }
}

function updateDistance(){
  if (!phoneMarker || !beaconLat || !beaconLon) return;
  const p = phoneMarker.getLatLng();
  const d = calcDistance(p.lat, p.lng, beaconLat, beaconLon);
  document.getElementById('distanceVal').textContent = d.toFixed(1) + ' м';
}

// ---------- Utilities ----------
function calcDistance(lat1, lon1, lat2, lon2){
  const R = 6371000;
  const toRad = v => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function copyCoords(){
  if (!beaconLat || !beaconLon) { alert('Нет координат'); return; }
  navigator.clipboard.writeText(`${beaconLat},${beaconLon}`).then(()=> alert('Скопировано'));
}

function downloadText(filename, text){
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function openInApp(app){
  if (!beaconLat || !beaconLon) { alert('Нет координат'); return; }
  let url = '';
  switch(app){
    case 'google': url = `https://maps.google.com/?q=${beaconLat},${beaconLon}`; break;
    case 'yandex': url = `yandexmaps://maps.yandex.ru/?pt=${beaconLon},${beaconLat}&z=18&l=map`; break;
    case 'dgis': url = `dgis://2gis.ru/geo/${beaconLat},${beaconLon}`; break;
    case 'osm': url = `https://www.openstreetmap.org/?mlat=${beaconLat}&mlon=${beaconLon}#map=18/${beaconLat}/${beaconLon}`; break;
  }
  window.open(url, '_blank');
}

// ---------- Service worker registration ----------
function registerSW(){
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').then(()=> console.log('SW registered'))
    .catch(e=> console.warn('SW failed', e));
  }
}
