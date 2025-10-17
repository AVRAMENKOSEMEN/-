// ble-manager-compatible.js
class BLEManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.coordCharacteristic = null;
        this.ledCharacteristic = null;
        this.isConnected = false;
        this.lastLedState = null;
    }

    async connect() {
        try {
            console.log('🔍 Поиск BLE устройств...');
            
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ name: 'ESP32-Tracker' }],
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
            this.showNotification('✅ Успешно подключено к устройству!');
            
            return true;

        } catch (error) {
            console.error('❌ Ошибка BLE:', error);
            this.handleBLEError(error);
            return false;
        }
    }

    handleCoordData(event) {
        const value = event.target.value;
        const decoder = new TextDecoder('utf-8');
        const dataString = decoder.decode(value);
        
        console.log('📊 Получены данные:', dataString);
        
        const parts = dataString.split(',');
        if (parts.length >= 4) {
            const lat = parseFloat(parts[0]);
            const lon = parseFloat(parts[1]);
            const speed = parseFloat(parts[2]);
            const ledState = parseInt(parts[3]);
            
            // Сохраняем состояние LED
            this.lastLedState = ledState;
            
            if (typeof updateBeacon === 'function') {
                updateBeacon(lat, lon, speed);
            }
            
            // Обновляем UI
            document.getElementById("beaconCoords").textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            document.getElementById("speed").textContent = `${speed.toFixed(2)} км/ч`;
            
            // Обновляем индикатор LED
            this.updateLedIndicator(ledState);
        }
    }

    updateLedIndicator(ledState) {
        const ledStatusElement = document.getElementById("ledStatus");
        if (!ledStatusElement) return;
        
        // Убираем все классы
        ledStatusElement.className = 'led-status';
        
        switch(ledState) {
            case 0:
                ledStatusElement.innerHTML = '<span class="led-indicator"></span> 🔴 ВЫКЛ (0)';
                ledStatusElement.classList.add('led-off');
                break;
            case 1:
                ledStatusElement.innerHTML = '<span class="led-indicator"></span> 🟢 ВКЛ (1)';
                ledStatusElement.classList.add('led-on');
                break;
            case 2:
                ledStatusElement.innerHTML = '<span class="led-indicator"></span> 🟡 МИГАНИЕ (2)';
                ledStatusElement.classList.add('led-blink');
                break;
            default:
                ledStatusElement.innerHTML = '<span class="led-indicator"></span> ❓ НЕТ ДАННЫХ';
                ledStatusElement.classList.add('led-unknown');
        }
    }

    async setLed(state) {
        if (!this.ledCharacteristic || !this.isConnected) {
            this.showNotification('Сначала подключитесь к устройству');
            return;
        }

        try {
            const command = state ? 1 : 0;
            const value = new Uint8Array([command]);
            await this.ledCharacteristic.writeValue(value);
            console.log('💡 Команда LED отправлена:', command);
            
            // Временно обновляем индикатор
            this.updateLedIndicator(command);
            
            this.showNotification(`LED ${state ? 'включен' : 'выключен'}`);
            
        } catch (error) {
            console.error('Ошибка управления LED:', error);
            this.showNotification('❌ Ошибка отправки команды');
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
        this.lastLedState = null;
        this.updateUI();
        
        // Сбрасываем индикатор LED
        const ledStatusElement = document.getElementById("ledStatus");
        if (ledStatusElement) {
            ledStatusElement.innerHTML = '<span class="led-indicator"></span> ❓ ОТКЛЮЧЕНО';
            ledStatusElement.className = 'led-status led-unknown';
        }
        
        console.log('🔌 BLE отключен');
        this.showNotification('🔌 BLE отключено');
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

    handleBLEError(error) {
        let message = 'Ошибка подключения: ';
        
        switch(error.name) {
            case 'NotFoundError':
                message = 'Устройство "ESP32-Tracker" не найдено.\n\nУбедитесь что:\n• ESP32 включен\n• Устройство находится рядом\n• BLE реклама активна';
                break;
            case 'SecurityError':
                message = 'Ошибка безопасности.\n\nРазрешите доступ к Bluetooth в настройках браузера.';
                break;
            case 'NetworkError':
                message = 'Ошибка сети BLE.\n\nПроверьте подключение Bluetooth.';
                break;
            default:
                message += error.message;
        }
        
        this.showNotification(message);
    }

    showNotification(message) {
        // Простое уведомление
        if (typeof alert === 'function') {
            alert(message);
        } else {
            console.log('📢', message);
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
