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
function initMap(){
  map=L.map('map').setView([55.75,37.61],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
}

function updateMap(lat, lon){
  if(!marker){
    marker=L.marker([lat,lon]).addTo(map);
    polyline=L.polyline([[lat,lon]],{color:'red'}).addTo(map);
  } else {
    marker.setLatLng([lat,lon]);
    polyline.addLatLng([lat,lon]);
  }
  if(settings.autoTracking){
    map.setView([lat,lon],15);
  }
}
async function connectBluetooth(){
  try{
    device=await navigator.bluetooth.requestDevice({filters:[{services:[SERVICE_UUID]}]});
    server=await device.gatt.connect();
    const service=await server.getPrimaryService(SERVICE_UUID);
    ledCharacteristic=await service.getCharacteristic(CHAR_UUID);
    document.getElementById('deviceName').textContent=device.name||'Неизвестно';
    document.getElementById('connectBtn').style.display='none';
    document.getElementById('disconnectBtn').style.display='inline-block';
    document.getElementById('ledOnBtn').disabled=false;
    document.getElementById('ledOffBtn').disabled=false;
  }catch(e){
    alert('Ошибка подключения: '+e);
  }
}

function disconnectBluetooth(){
  if(device&&device.gatt.connected){
    device.gatt.disconnect();
  }
  document.getElementById('deviceName').textContent='Не подключено';
  document.getElementById('connectBtn').style.display='inline-block';
  document.getElementById('disconnectBtn').style.display='none';
  document.getElementById('ledOnBtn').disabled=true;
  document.getElementById('ledOffBtn').disabled=true;
}

async function turnOnLED(){
  if(ledCharacteristic){
    const data=new Uint8Array([1]);
    await ledCharacteristic.writeValue(data);
  }
}

async function turnOffLED(){
  if(ledCharacteristic){
    const data=new Uint8Array([0]);
    await ledCharacteristic.writeValue(data);
  }
}
function toggleTestMode(){
  testMode=!testMode;
  if(testMode){
    document.getElementById('testBtn').textContent='⛔ Выкл. тест';
    let lat=55.75, lon=37.61;
    testInterval=setInterval(()=>{
      lat+=(Math.random()-0.5)*0.001;
      lon+=(Math.random()-0.5)*0.001;
      beaconLat=lat; beaconLon=lon; beaconSpd=(Math.random()*20).toFixed(1);
      beaconHistory.push({lat,lon,speed:beaconSpd,time:new Date().toISOString()});
      updateUI();
      updateMap(lat,lon);
    },2000);
  } else {
    clearInterval(testInterval);
    document.getElementById('testBtn').textContent='🛰 Тестовые координаты';
  }
}

function showHistory(){
  if(beaconHistory.length===0){alert("История пустая");return;}
  let csv="lat,lon,speed,time\n";
  beaconHistory.forEach(h=>{csv+=`${h.lat},${h.lon},${h.speed},${h.time}\n`;});
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download="history.csv";a.click();
  URL.revokeObjectURL(url);
}
function updateUI(){
  document.getElementById('coordsVal').textContent=`${beaconLat?.toFixed(5)||'N/A'}, ${beaconLon?.toFixed(5)||'N/A'}`;
  document.getElementById('speedVal').textContent=`${beaconSpd||'N/A'} ${settings.units==='kmh'?'км/ч':'м/с'}`;
  if(beaconLat&&beaconLon&&phoneMarker){
    const d=calcDistance(phoneMarker.getLatLng().lat,phoneMarker.getLatLng().lng,beaconLat,beaconLon);
    document.getElementById('distanceVal').textContent=d.toFixed(1)+" м";
  }
}

function openModal(){document.getElementById('modal').setAttribute('open','');}
function closeModal(){document.getElementById('modal').removeAttribute('open');}

function openInApp(app){
  if(!beaconLat||!beaconLon){alert("Нет координат");return;}
  let url="";
  switch(app){
    case "google":url=`https://maps.google.com/?q=${beaconLat},${beaconLon}`;break;
    case "yandex":url=`yandexmaps://maps.yandex.ru/?pt=${beaconLon},${beaconLat}&z=18&l=map`;break;
    case "dgis":url=`dgis://2gis.ru/?query=${beaconLat},${beaconLon}`;break;
    case "osm":url=`https://www.openstreetmap.org/?mlat=${beaconLat}&mlon=${beaconLon}&zoom=18`;break;
  }
  window.open(url,"_blank");
}

function copyCoords(){
  if(!beaconLat||!beaconLon){alert("Нет координат");return;}
  navigator.clipboard.writeText(`${beaconLat},${beaconLon}`);
  alert("Скопировано!");
}

// Настройки
let settings={theme:"auto",units:"kmh",showMyLocation:true,autoTracking:true};

function applySettings(){
  const s=JSON.parse(localStorage.getItem("settings")||"null");
  if(s)settings=s;
  document.querySelectorAll('input[name="theme"]').forEach(el=>{el.checked=(el.value===settings.theme);});
  document.querySelectorAll('input[name="units"]').forEach(el=>{el.checked=(el.value===settings.units);});
  document.getElementById('showMyLocation').checked=settings.showMyLocation;
  document.getElementById('autoTracking').checked=settings.autoTracking;
  if(settings.theme==="dark")document.body.classList.add("dark-theme");else document.body.classList.remove("dark-theme");
}

function saveSettings(){
  settings.theme=document.querySelector('input[name="theme"]:checked').value;
  settings.units=document.querySelector('input[name="units"]:checked').value;
  settings.showMyLocation=document.getElementById('showMyLocation').checked;
  settings.autoTracking=document.getElementById('autoTracking').checked;
  localStorage.setItem("settings",JSON.stringify(settings));
  applySettings();
  document.getElementById('settingsModal').removeAttribute('open');
}

function resetSettings(){
  localStorage.removeItem("settings");
  settings={theme:"auto",units:"kmh",showMyLocation:true,autoTracking:true};
  applySettings();
  document.getElementById('settingsModal').removeAttribute('open');
}

// Расстояние
function calcDistance(lat1,lon1,lat2,lon2){
  function toRad(v){return v*Math.PI/180;}
  const R=6371000;
  const dLat=toRad(lat2-lat1);
  const dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  return R*c;
}
