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
            console.log('🔍 Поиск BLE устройств "Маяк-Приемник"...');
            
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{
                    services: ['12345678-1234-1234-1234-123456789abc']
                }]
            });

            console.log('📱 Устройство найдено:', this.device.name);
            
            this.device.addEventListener('gattserverdisconnected', () => {
                this.onDisconnected();
            });

            this.server = await this.device.gatt.connect();
            
            const service = await this.server.getPrimaryService('12345678-1234-1234-1234-123456789abc');
            
            this.coordCharacteristic = await service.getCharacteristic('12345678-1234-1234-1234-123456789abd');
            await this.coordCharacteristic.startNotifications();
            this.coordCharacteristic.addEventListener('characteristicvaluechanged', 
                (event) => this.handleCoordData(event));
            
            this.ledCharacteristic = await service.getCharacteristic('12345678-1234-1234-1234-123456789abe');

            this.isConnected = true;
            this.updateUI();
            alert('✅ Подключено к приемнику!');
            
            return true;

        } catch (error) {
            console.error('❌ Ошибка BLE:', error);
            alert('Ошибка подключения: ' + error.message);
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
