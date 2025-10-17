// script.js
let map;
let beaconMarker;
let myMarker;
let myLocationCircle;
let watchId = null;

// Инициализация приложения
document.addEventListener("DOMContentLoaded", () => {
  initializeMap();
  setupEventListeners();
  loadSettings();
  checkGeolocationSupport();
});

function initializeMap() {
  map = L.map("map").setView([54.977449, 73.470961], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  // Маркер маяка
  beaconMarker = L.marker([54.977449, 73.470961], {
    icon: L.divIcon({
      html: '🔴',
      iconSize: [20, 20],
      className: 'beacon-marker'
    })
  }).addTo(map).bindPopup("Маяк");

  // Круг точности местоположения
  myLocationCircle = L.circle([0, 0], {
    color: 'blue',
    fillColor: '#00f',
    fillOpacity: 0.1,
    radius: 1
  }).addTo(map);
}

function setupEventListeners() {
  // Кнопки управления
  document.getElementById("connectBtn").addEventListener("click", connectBLE);
  document.getElementById("ledOnBtn").addEventListener("click", setLedOn);
  document.getElementById("ledOffBtn").addEventListener("click", setLedOff);
  document.getElementById("historyBtn").addEventListener("click", showHistory);
  document.getElementById("clearHistoryBtn").addEventListener("click", clearHistory);
  document.getElementById("openBtn").addEventListener("click", () => showModal("openModal"));
  document.getElementById("settingsBtn").addEventListener("click", () => showModal("settingsModal"));

  // Модальные окна
  document.getElementById("closeOpen").addEventListener("click", () => hideModal("openModal"));
  document.getElementById("closeHistory").addEventListener("click", () => hideModal("historyModal"));
  document.getElementById("closeSettings").addEventListener("click", () => hideModal("settingsModal"));
  document.getElementById("modalOverlay").addEventListener("click", hideAllModals);

  // Действия в модальных окнах
  document.getElementById("exportHistory").addEventListener("click", exportHistory);
  document.getElementById("openGoogle").addEventListener("click", () => openMap("google"));
  document.getElementById("openYandex").addEventListener("click", () => openMap("yandex"));
  document.getElementById("open2gis").addEventListener("click", () => openMap("2gis"));

  // Настройки
  document.getElementById("saveSettings").addEventListener("click", saveSettings);
  document.getElementById("resetSettings").addEventListener("click", resetSettings);
}

function checkGeolocationSupport() {
  if (!navigator.geolocation) {
    alert("Геолокация не поддерживается вашим браузером");
    return;
  }
  
  // Запрос разрешения на геолокацию
  navigator.geolocation.getCurrentPosition(
    (position) => {
      startTracking();
    },
    (error) => {
      console.error("Ошибка геолокации:", error);
      alert("Для работы приложения необходимо разрешить доступ к геолокации");
    }
  );
}

function startTracking() {
  const settings = loadSettings();
  
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      updateMyLocation(position);
    },
    (error) => {
      console.error("Ошибка отслеживания:", error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    }
  );
}

function updateMyLocation(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  const speed = position.coords.speed;
  const accuracy = position.coords.accuracy;

  // Обновление информации в UI
  document.getElementById("myCoords").textContent = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  
  // Обновление скорости
  const settings = loadSettings();
  let speedText = "N/A";
  if (speed !== null) {
    if (settings.units === 'ms') {
      speedText = `${speed.toFixed(2)} м/с`;
    } else {
      speedText = `${(speed * 3.6).toFixed(2)} км/ч`;
    }
  }
  document.getElementById("speed").textContent = speedText;

  // Обновление маркера на карте
  if (settings.showMyLocation) {
    if (!myMarker) {
      myMarker = L.marker([lat, lon], {
        icon: L.divIcon({
          html: '🔵',
          iconSize: [20, 20],
          className: 'my-marker'
        })
      }).addTo(map).bindPopup("Моё местоположение");
    } else {
      myMarker.setLatLng([lat, lon]);
    }

    // Обновление круга точности
    myLocationCircle.setLatLng([lat, lon]);
    myLocationCircle.setRadius(accuracy);

    // Автоматическое слежение
    if (settings.autoFollow) {
      map.setView([lat, lon], map.getZoom());
    }
  } else {
    if (myMarker) {
      map.removeLayer(myMarker);
      myMarker = null;
    }
  }

  // Расчет расстояния до маяка
  const beaconLatLng = beaconMarker.getLatLng();
  if (beaconLatLng.lat !== 54.977449 || beaconLatLng.lng !== 73.470961) { // Если не начальная позиция
    const distance = calculateDistance(lat, lon, beaconLatLng.lat, beaconLatLng.lng);
    document.getElementById("distance").textContent = `${distance.toFixed(2)} км`;
  }
}

function updateBeacon(lat, lon, speed = null) {
  beaconMarker.setLatLng([lat, lon])
    .bindPopup(`Маяк: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
  
  document.getElementById("beaconCoords").textContent = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  
  // Добавление в историю
  HistoryManager.add(lat, lon, speed);
  
  // Обновление расстояния
  if (myMarker) {
    const myLatLng = myMarker.getLatLng();
    const distance = calculateDistance(myLatLng.lat, myLatLng.lng, lat, lon);
    document.getElementById("distance").textContent = `${distance.toFixed(2)} км`;
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Радиус Земли в км
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Функции истории
function showHistory() {
  const history = HistoryManager.load();
  const list = document.getElementById("historyList");
  list.innerHTML = "";

  if (history.length === 0) {
    list.innerHTML = "<li>История пуста</li>";
  } else {
    history.slice(-20).reverse().forEach(point => {
      const li = document.createElement("li");
      li.innerHTML = `
        <small>${new Date(point.time).toLocaleString()}</small><br>
        ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}
        ${point.speed ? ` | ${point.speed.toFixed(2)} м/с` : ''}
      `;
      li.style.marginBottom = "8px";
      li.style.padding = "5px";
      li.style.borderBottom = "1px solid #eee";
      list.appendChild(li);
    });
  }
  showModal("historyModal");
}

function exportHistory() {
  const csv = HistoryManager.exportCSV();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mayak_history_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clearHistory() {
  if (confirm("Вы уверены, что хотите очистить всю историю?")) {
    HistoryManager.clear();
    alert("История очищена");
    hideModal("historyModal");
  }
}

// Функции модальных окон
function showModal(id) {
  document.getElementById("modalOverlay").classList.remove("hidden");
  document.getElementById(id).classList.remove("hidden");
}

function hideModal(id) {
  document.getElementById("modalOverlay").classList.add("hidden");
  document.getElementById(id).classList.add("hidden");
}

function hideAllModals() {
  document.getElementById("modalOverlay").classList.add("hidden");
  document.querySelectorAll(".modal").forEach(modal => {
    modal.classList.add("hidden");
  });
}

function openMap(service) {
  const coords = document.getElementById("beaconCoords").textContent;
  if (coords === "N/A") {
    alert("Сначала установите координаты маяка");
    return;
  }

  const [lat, lon] = coords.split(",").map(x => parseFloat(x.trim()));
  let url = "";

  switch (service) {
    case "google":
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      break;
    case "yandex":
      url = `https://yandex.ru/maps/?text=${lat},${lon}&z=15`;
      break;
    case "2gis":
      url = `https://2gis.ru/geo/${lon},${lat}`;
      break;
  }

  window.open(url, "_blank");
}

// Функции настроек
function loadSettings() {
  try {
    const settings = localStorage.getItem('mayak_settings_v10');
    return settings ? JSON.parse(settings) : {
      theme: 'auto',
      units: 'kmh',
      showMyLocation: true,
      autoFollow: true
    };
  } catch(e) {
    console.error("Ошибка загрузки настроек:", e);
    return {
      theme: 'auto',
      units: 'kmh',
      showMyLocation: true,
      autoFollow: true
    };
  }
}

function saveSettings() {
  const newSettings = {
    theme: document.getElementById('themeSelect').value,
    units: document.getElementById('unitsSelect').value,
    showMyLocation: document.getElementById('showMyLocation').checked,
    autoFollow: document.getElementById('autoFollow').checked
  };
  
  try {
    localStorage.setItem('mayak_settings_v10', JSON.stringify(newSettings));
    applySettings(newSettings);
    hideModal('settingsModal');
    alert('Настройки сохранены!');
  } catch(e) {
    console.error("Ошибка сохранения настроек:", e);
    alert('Ошибка сохранения настроек');
  }
}

function resetSettings() {
  if (confirm("Сбросить все настройки к значениям по умолчанию?")) {
    try {
      localStorage.removeItem('mayak_settings_v10');
      applySettings({
        theme: 'auto',
        units: 'kmh',
        showMyLocation: true,
        autoFollow: true
      });
      updateSettingsForm();
      alert('Настройки сброшены!');
    } catch(e) {
      console.error("Ошибка сброса настроек:", e);
      alert('Ошибка сброса настроек');
    }
  }
}

function applySettings(settings = null) {
  if (!settings) {
    settings = loadSettings();
  }

  const root = document.documentElement;
  
  // Применение темы
  if (settings.theme === 'dark') {
    root.classList.add('dark');
  } else if (settings.theme === 'light') {
    root.classList.remove('dark');
  } else {
    // Автоопределение темы
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  // Перезапуск отслеживания местоположения
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    startTracking();
  }
}

function updateSettingsForm() {
  const settings = loadSettings();
  document.getElementById('themeSelect').value = settings.theme;
  document.getElementById('unitsSelect').value = settings.units;
  document.getElementById('showMyLocation').checked = settings.showMyLocation;
  document.getElementById('autoFollow').checked = settings.autoFollow;
}

// Инициализация настроек при загрузке
document.addEventListener('DOMContentLoaded', () => {
  const settings = loadSettings();
  applySettings(settings);
  updateSettingsForm();

  // Слушатель изменения системной темы
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      const settings = loadSettings();
      if (settings.theme === 'auto') {
        applySettings(settings);
      }
    });
  }
});

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker зарегистрирован');
      })
      .catch(registrationError => {
        console.log('❌ Ошибка регистрации Service Worker:', registrationError);
      });
  });
}
