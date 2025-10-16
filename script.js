// Обновлённый BLE Manager
class PerfectBLEManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.coordCharacteristic = null;
        this.cmdCharacteristic = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ name: 'ESP32-Tracker' }],
                optionalServices: [SERVICE_UUID]
            });

            this.device.addEventListener('gattserverdisconnected', () => {
                this.onDisconnected();
            });

            this.server = await this.device.gatt.connect();
            const service = await this.server.getPrimaryService(SERVICE_UUID);
            
            // Характеристика координат
            this.coordCharacteristic = await service.getCharacteristic(COORD_CHAR_UUID);
            await this.coordCharacteristic.startNotifications();
            this.coordCharacteristic.addEventListener('characteristicvaluechanged', 
                (e) => this.handleCoordData(e));
            
            // Характеристика команд
            this.cmdCharacteristic = await service.getCharacteristic(CMD_CHAR_UUID);
            
            this.isConnected = true;
            this.updateUI();
            
            alert('✅ Подключено к трекеру!');
            return true;

        } catch (error) {
            console.error('Ошибка BLE:', error);
            alert('Ошибка подключения: ' + error.message);
            return false;
        }
    }

    handleCoordData(event) {
        const value = new TextDecoder().decode(event.target.value);
        const [lat, lon, speed, ledState] = value.split(',');
        
        if (window.updateBeacon) {
            updateBeacon(parseFloat(lat), parseFloat(lon), parseFloat(speed));
        }
        
        // Обновление интерфейса
        document.getElementById("beaconCoords").textContent = 
            `${parseFloat(lat).toFixed(6)}, ${parseFloat(lon).toFixed(6)}`;
        document.getElementById("speed").textContent = 
            `${parseFloat(speed).toFixed(1)} км/ч`;
        document.getElementById("ledStatus").textContent = 
            ledState === '1' ? '🟢 ВКЛ' : '🔴 ВЫКЛ';
    }

    async sendLedCommand(state) {
        if (!this.cmdCharacteristic || !this.isConnected) {
            alert('Сначала подключитесь к устройству');
            return;
        }

        try {
            const value = new Uint8Array([state]);
            await this.cmdCharacteristic.writeValue(value);
            console.log('Команда LED отправлена:', state);
        } catch (error) {
            console.error('Ошибка отправки команды:', error);
        }
    }

    disconnect() {
        if (this.device?.gatt.connected) {
            this.device.gatt.disconnect();
        }
        this.onDisconnected();
    }

    onDisconnected() {
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.updateUI();
    }

    updateUI() {
        const btn = document.getElementById('connectBtn');
        if (btn) {
            btn.textContent = this.isConnected ? '✅ Подключено' : '🔗 Подключить BLE';
            btn.style.background = this.isConnected ? '#28a745' : '#007bff';
        }
    }
}

const bleManager = new PerfectBLEManager();

// Функции для интерфейса
function connectBLE() {
    bleManager.connect();
}

function ledOn() {
    bleManager.sendLedCommand(1);
    document.getElementById("ledStatus").textContent = "🟢 ВКЛ";
}

function ledOff() {
    bleManager.sendLedCommand(0);
    document.getElementById("ledStatus").textContent = "🔴 ВЫКЛ";
}
