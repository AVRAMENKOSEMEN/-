let device, server, ledCharacteristic;
let history = [];

document.getElementById("connectBtn").addEventListener("click", connectBLE);
document.getElementById("ledOnBtn").addEventListener("click", () => toggleLED(true));
document.getElementById("ledOffBtn").addEventListener("click", () => toggleLED(false));
document.getElementById("testCoordsBtn").addEventListener("click", setTestCoords);
document.getElementById("historyBtn").addEventListener("click", () => {
  document.getElementById("historyPanel").classList.remove("hidden");
  updateHistoryList();
});
document.getElementById("closeHistory").addEventListener("click", () => {
  document.getElementById("historyPanel").classList.add("hidden");
});
document.getElementById("exportHistory").addEventListener("click", exportHistory);

async function connectBLE() {
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ["battery_service"] }] // заменить на сервис маяка
    });
    server = await device.gatt.connect();
    document.getElementById("status").textContent = "Статус: Подключено";
  } catch (error) {
    alert("Ошибка подключения: " + error);
  }
}

async function toggleLED(state) {
  if (!server) return alert("Нет подключения");
  try {
    // тут нужно подставить UUID твоего LED сервиса и характеристики
    const service = await server.getPrimaryService("battery_service");
    ledCharacteristic = await service.getCharacteristic("battery_level");
    await ledCharacteristic.writeValue(new Uint8Array([state ? 1 : 0]));
  } catch (err) {
    alert("Ошибка LED: " + err);
  }
}

function setTestCoords() {
  const coords = { lat: 55.7558, lon: 37.6173, speed: 10 };
  updateCoords(coords);
}

function updateCoords({ lat, lon, speed }) {
  document.getElementById("coords").textContent = `Координаты: ${lat}, ${lon}`;
  document.getElementById("speed").textContent = `Скорость: ${speed}`;
  history.push({ lat, lon, time: new Date().toISOString() });
}

function updateHistoryList() {
  const list = document.getElementById("historyList");
  list.innerHTML = "";
  history.forEach(h => {
    const li = document.createElement("li");
    li.textContent = `${h.time} - ${h.lat}, ${h.lon}`;
    list.appendChild(li);
  });
}

function exportHistory() {
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "history.json";
  a.click();
  URL.revokeObjectURL(url);
}
