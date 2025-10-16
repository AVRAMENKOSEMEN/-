// ble-manager-compatible.js
class BLEManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.coordCharacteristic = null;
        this.ledCharacteristic = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            console.log('🔍 Поиск BLE устройств...');
            
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ name: 'ESP32-Receiver' }],
                optionalServices: ['12345678-1234-1234-1234-123456789abc']
            });

            console.log('📱 Устройство найдено:', this.device.name);
            
            this.device.addEventListener('gattserverdisconnected', () => {
                console.log('🔌 BLE устройство отключено');
                this.onDisconnected();
            });

            console.log('🔄 Подключение к GATT серверу...');
            this.server = await this.device.gatt.connect();
            console.log('✅ Подключено к GATT серверу');

            console.log('🔄 Получение сервиса...');
            const service = await this.server.getPrimaryService('12345678-1234-1234-1234-123456789abc');
            console.log('✅ Сервис найден');

            // Характеристика координат
            console.log('🔄 Получение характеристики координат...');
            this.coordCharacteristic = await service.getCharacteristic('12345678-1234-1234-1234-123456789abd');
            await this.coordCharacteristic.startNotifications();
            this.coordCharacteristic.addEventListener('characteristicvaluechanged', 
                (event) => this.handleCoordData(event));
            console.log('✅ Подписка на координаты');

            // Характеристика LED
            console.log('🔄 Получение характеристики LED...');
            this.ledCharacteristic = await service.getCharacteristic('12345678-1234-1234-1234-123456789abe');
            console.log('✅ LED характеристика готова');

            this.isConnected = true;
            this.updateUI();
            
            console.log('🎉 BLE подключение установлено!');
            alert('✅ Успешно подключено к устройству!');
            
            return true;

        } catch (error) {
            console.error('❌ Ошибка BLE:', error);
            if (error.name === 'NotFoundError') {
                alert('Устройства BLE не найдены.\n\nУбедитесь что:\n• ESP32 включен\n• Устройство находится рядом\n• BLE реклама активна');
            } else if (error.name === 'SecurityError') {
                alert('Ошибка безопасности. Используйте HTTPS для Web Bluetooth.');
            } else {
                alert('Ошибка подключения: ' + error.message);
            }
            return false;
        }
    }

    handleCoordData(event) {
        const value = event.target.value;
        const decoder = new TextDecoder('utf-8');
        const dataString = decoder.decode(value);
        
        console.log('📊 Получены данные:', dataString);
        
        const parts = dataString.split(',');
        if (parts.length >= 3) {
            const lat = parseFloat(parts[0]);
            const lon = parseFloat(parts[1]);
            const speed = parseFloat(parts[2]);
            
            if (typeof updateBeacon === 'function') {
                updateBeacon(lat, lon, speed);
            }
            
            // Обновляем UI
            document.getElementById("beaconCoords").textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            document.getElementById("speed").textContent = `${speed.toFixed(2)} км/ч`;
        }
    }

    async setLed(state) {
        if (!this.ledCharacteristic || !this.isConnected) {
            alert('Сначала подключитесь к устройству');
            return;
        }

        try {
            const value = new Uint8Array([state ? 0x01 : 0x00]);
            await this.ledCharacteristic.writeValue(value);
            console.log('💡 LED:', state ? 'ВКЛ' : 'ВЫКЛ');
        } catch (error) {
            console.error('Ошибка управления LED:', error);
        }
    }

    disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        this.onDisconnected();
    }

    onDisconnected() {
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.coordCharacteristic = null;
        this.ledCharacteristic = null;
        this.updateUI();
        console.log('🔌 BLE отключен');
    }

    updateUI() {
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            if (this.isConnected) {
                connectBtn.textContent = '✅ BLE Подключен';
                connectBtn.style.background = '#28a745';
            } else {
                connectBtn.textContent = '🔗 Подключить BLE';
                connectBtn.style.background = '#1976d2';
            }
        }
    }
}

// Глобальный экземпляр
const bleManager = new BLEManager();

// Функции для приложения
function connectBLE() {
    bleManager.connect();
}

function setLedOn() {
    bleManager.setLed(true);
}

function setLedOff() {
    bleManager.setLed(false);
}
