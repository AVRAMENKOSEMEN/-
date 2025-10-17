// history-manager.js
const HISTORY_KEY = 'mayak_history_v10';
const MAX_POINTS = 1000;

const HistoryManager = {
  load() {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch(e) {
      console.error("Ошибка загрузки истории:", e);
      return [];
    }
  },

  save(arr) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    } catch(e) {
      console.error("Ошибка сохранения истории:", e);
    }
  },

  add(lat, lon, speed) {
    const arr = this.load();
    arr.push({
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      speed: speed ? parseFloat(speed) : null,
      time: Date.now()
    });
    
    // Ограничение размера истории
    while (arr.length > MAX_POINTS) {
      arr.shift();
    }
    
    this.save(arr);
  },

  clear() {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch(e) {
      console.error("Ошибка очистки истории:", e);
    }
  },

  exportCSV() {
    const arr = this.load();
    let csv = 'lat,lon,speed,timestamp,datetime\n';
    arr.forEach(point => {
      const date = new Date(point.time);
      csv += `${point.lat},${point.lon},${point.speed || ''},${point.time},"${date.toISOString()}"\n`;
    });
    return csv;
  },

  getLastPoints(count = 10) {
    const arr = this.load();
    return arr.slice(-count);
  },
  
  getPointsByDate(startDate, endDate) {
    const arr = this.load();
    return arr.filter(point => {
      const pointDate = new Date(point.time);
      return pointDate >= startDate && pointDate <= endDate;
    });
  },
  
  getStats() {
    const arr = this.load();
    if (arr.length === 0) return null;
    
    return {
      totalPoints: arr.length,
      firstPoint: arr[0],
      lastPoint: arr[arr.length - 1],
      dateRange: {
        start: new Date(arr[0].time),
        end: new Date(arr[arr.length - 1].time)
      }
    };
  }
};
