let device=null, server=null, ledCharacteristic=null;
let beaconLat=null, beaconLon=null, beaconSpd=null;
let map, marker, phoneMarker, polyline=null;
let testMode=false, testInterval=null;
let beaconHistory=[];
const SERVICE_UUID='00001523-1212-efde-1523-785feabcd123';
const CHAR_UUID='00001525-1212-efde-1523-785feabcd123';

window.addEventListener('load', ()=>{
  initMap();
  setupUI();
  applySettings();
});

// UI setup
function setupUI(){
  document.getElementById('connectBtn').addEventListener('click', connectBluetooth);
  document.getElementById('disconnectBtn').addEventListener('click', disconnectBluetooth);
  document.getElementById('testBtn').addEventListener('click', toggleTestMode);
  document.getElementById('copyBtn').addEventListener('click', copyCoords);
  document.getElementById('moreBtn').addEventListener('click', openModal);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('openGoogle').addEventListener('click', ()=>openInApp('google'));
  document.getElementById('openYandex').addEventListener('click', ()=>openInApp('yandex'));
  document.getElementById('openDgis').addEventListener('click', ()=>openInApp('dgis'));
  document.getElementById('openOSM').addEventListener('click', ()=>openInApp('osm'));
  document.getElementById('ledOnBtn').addEventListener('click', turnOnLED);
  document.getElementById('ledOffBtn').addEventListener('click', turnOffLED);
  document.getElementById('historyBtn').addEventListener('click', showHistory);
  document.getElementById('settingsBtn').addEventListener('click', ()=>{ document.getElementById('settingsModal').setAttribute('open',''); });
  document.getElementById('closeSettings').addEventListener('click', ()=>{ document.getElementById('settingsModal').removeAttribute('open'); });
  document.getElementById('cancelSettings').addEventListener('click', ()=>{ document.getElementById('settingsModal').removeAttribute('open'); });
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
}

// BLE
async function connectBluetooth(){
  if(!navigator.bluetooth){ alert('Web Bluetooth не поддерживается'); return; }
  try{
    device = await navigator.bluetooth.requestDevice({acceptAllDevices:true, optionalServices:[SERVICE_UUID]});
    server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    ledCharacteristic = await service.getCharacteristic(CHAR_UUID);
    document.getElementById('ledOnBtn').disabled=false;
    document.getElementById('ledOffBtn').disabled=false;
    document.getElementById('deviceName').innerText=device.name||device.id;
    document.getElementById('connectBtn').style.display='none';
    document.getElementById('disconnectBtn').style.display='inline-block';
  }catch(e){ alert('Ошибка подключения: '+e); }
}

function disconnectBluetooth(){
  if(device && device.gatt.connected) device.gatt.disconnect();
  document.getElementById('ledOnBtn').disabled=true;
  document.getElementById('ledOffBtn').disabled=true;
  document.getElementById('deviceName').innerText='Не подключено';
  document.getElementById('connectBtn').style.display='inline-block';
  document.getElementById('disconnectBtn').style.display='none';
}

// LED
async function turnOnLED(){ if(ledCharacteristic) await ledCharacteristic.writeValue(Uint8Array.of(0x01)); }
async function turnOffLED(){ if(ledCharacteristic) await ledCharacteristic.writeValue(Uint8Array.of(0x00)); }

// Карта
function initMap(){
  map = L.map('map').setView([55.7558,37.6173],12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
}

// Модалки
function openModal(){ document.getElementById('modal').setAttribute('open',''); }
function closeModal(){ document.getElementById('modal').removeAttribute('open'); }

// История
function showHistory(){
  if(beaconHistory.length===0){ alert('История пуста'); return; }
  let csv="lat,lon,speed,timestamp\n";
  beaconHistory.forEach(p=>csv+=`${p.lat},${p.lon},${p.speed||''},${new Date(p.timestamp).toISOString()}\n`);
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  window.open(url,'_blank');
}

// Настройки
function saveSettings(){
  const theme=document.querySelector('input[name="theme"]:checked').value;
  const units=document.querySelector('input[name="units"]:checked').value;
  const showLocation=document.getElementById('showMyLocation').checked;
  const autoTrack=document.getElementById('autoTracking').checked;
  localStorage.setItem('settings',JSON.stringify({theme,units,showLocation,autoTrack}));
  applySettings();
  document.getElementById('settingsModal').removeAttribute('open');
}
function resetSettings(){ localStorage.removeItem('settings'); applySettings(); document.getElementById('settingsModal').removeAttribute('open'); }
function applySettings(){
  const s=JSON.parse(localStorage.getItem('settings')||'{}');
  document.body.classList.remove('dark-theme');
  if(s.theme==='dark') document.body.classList.add('dark-theme');
}
