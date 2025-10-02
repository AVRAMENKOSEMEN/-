// History manager: stores up to MAX_POINTS points in localStorage
const HISTORY_KEY = 'mayak_history_v10';
const MAX_POINTS = 1000;

const HistoryManager = {
  load() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch(e) { return []; }
  },
  save(arr) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
  },
  add(lat, lon, speed) {
    const arr = this.load();
    arr.push({ lat, lon, speed: speed || null, time: Date.now() });
    while (arr.length > MAX_POINTS) arr.shift();
    this.save(arr);
  },
  clear() {
    localStorage.removeItem(HISTORY_KEY);
  },
  exportCSV() {
    const arr = this.load();
    let csv = 'lat,lon,speed,timestamp\n';
    arr.forEach(a => csv += `${a.lat},${a.lon},${a.speed||''},${new Date(a.time).toISOString()}\n`);
    return csv;
  }
};
