const HistoryManager = {
  key: "gpsHistory",

  load() {
    let data = localStorage.getItem(this.key);
    return data ? JSON.parse(data) : [];
  },

  save(history) {
    localStorage.setItem(this.key, JSON.stringify(history));
  },

  add(lat, lon) {
    let history = this.load();
    history.push({ lat, lon, ts: Date.now() });
    this.save(history);
  },

  clear() {
    localStorage.removeItem(this.key);
  },

  export() {
    let history = this.load();
    return history.map(h => `${h.lat},${h.lon},${new Date(h.ts).toISOString()}`).join("\n");
  }
};
