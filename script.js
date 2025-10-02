let map;
let beaconMarker;
let myMarker;
let history = [];

// инициализация карты
document.addEventListener("DOMContentLoaded", () => {
  map = L.map("map").setView([55.75, 37.61], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  beaconMarker = L.marker([55.75, 37.61]).addTo(map)
    .bindPopup("Маяк");

  // кнопки
  document.getElementById("testBtn").addEventListener("click", () => {
    let lat = 55.751 + Math.random() * 0.01;
    let lon = 37.617 + Math.random() * 0.01;
    updateBeacon(lat, lon);
  });

  document.getElementById("openBtn").addEventListener("click", () => showModal("openModal"));
  document.getElementById("historyBtn").addEventListener("click", () => showModal("historyModal"));
  document.getElementById("settingsBtn").addEventListener("click", () => showModal("settingsModal"));

  document.getElementById("closeOpen").addEventListener("click", () => hideModal("openModal"));
  document.getElementById("closeHistory").addEventListener("click", () => hideModal("historyModal"));
  document.getElementById("closeSettings").addEventListener("click", () => hideModal("settingsModal"));

  document.getElementById("exportHistory").addEventListener("click", exportHistory);

  document.getElementById("openGoogle").addEventListener("click", () => openMap("google"));
  document.getElementById("openYandex").addEventListener("click", () => openMap("yandex"));
  document.getElementById("open2gis").addEventListener("click", () => openMap("2gis"));
});

function updateBeacon(lat, lon) {
  beaconMarker.setLatLng([lat, lon]).bindPopup(`Маяк: ${lat.toFixed(5)}, ${lon.toFixed(5)}`);
  document.getElementById("beaconCoords").innerText = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  history.push({lat, lon, time: new Date().toLocaleTimeString()});
  updateHistoryList();
}

function updateHistoryList() {
  let list = document.getElementById("historyList");
  list.innerHTML = "";
  history.forEach(h => {
    let li = document.createElement("li");
    li.textContent = `${h.time}: ${h.lat.toFixed(5)}, ${h.lon.toFixed(5)}`;
    list.appendChild(li);
  });
}

function exportHistory() {
  let content = history.map(h => `${h.time},${h.lat},${h.lon}`).join("\n");
  let blob = new Blob([content], {type: "text/plain"});
  let url = URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.href = url;
  a.download = "history.txt";
  a.click();
}

function showModal(id) {
  document.getElementById("modalOverlay").classList.remove("hidden");
  document.getElementById(id).classList.remove("hidden");
}

function hideModal(id) {
  document.getElementById("modalOverlay").classList.add("hidden");
  document.getElementById(id).classList.add("hidden");
}

function openMap(service) {
  let coords = document.getElementById("beaconCoords").innerText;
  if(coords === "N/A") return;
  let [lat, lon] = coords.split(",").map(x => x.trim());
  let url = "";
  if(service === "google") url = `https://maps.google.com/?q=${lat},${lon}`;
  if(service === "yandex") url = `https://yandex.ru/maps/?ll=${lon},${lat}&z=16`;
  if(service === "2gis") url = `https://2gis.ru/?query=${lat},${lon}`;
  window.open(url, "_blank");
}
