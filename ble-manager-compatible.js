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
            
            // ПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ ФИЛЬТРОВ
            this.device = await navigator.bluetooth.requestDevice({
                // Вариант 1: По имени (строгий)
                filters: [{ name: 'ESP32-Receiver' }],
                
                // Вариант 2: По префиксу имени
                // filters: [{ namePrefix: 'ESP32' }],
                
                // Вариант 3: По сервисам (самый надёжный)
                // filters: [{ services: ['12345678-1234-1234-1234-123456789abc'] }],
                
                // Вариант 4: Без фильтров + сервисы
                acceptAllDevices: true,
                optionalServices: [
                    '12345678-1234-1234-1234-123456789abc',
                    '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
                    '0000ffe0-0000-1000-8000-00805f9b34fb' // Часто используемый сервис
                ]
            });

            console.log('📱 Устройство найдено:', this.device.name);
            console.log('🔗 ID устройства:', this.device.id);
            
            this.device.addEventListener('gattserverdisconnected', () => {
                console.log('🔌 BLE устройство отключено');
                this.onDisconnected();
            });

            console.log('🔄 Подключение к GATT серверу...');
            this.server = await this.device.gatt.connect();
            console.log('✅ Подключено к GATT серверу');

            // ПРОБУЕМ РАЗНЫЕ UUID СЕРВИСОВ
            let service;
            const serviceUUIDs = [
                '12345678-1234-1234-1234-123456789abc',
                '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
                '0000ffe0-0000-1000-8000-00805f9b34fb'
            ];

            for (let uuid of serviceUUIDs) {
                try {
                    console.log(`🔄 Пробуем сервис: ${uuid}`);
                    service = await this.server.getPrimaryService(uuid);
                    console.log(`✅ Сервис найден: ${uuid}`);
                    break;
                } catch (e) {
                    console.log(`❌ Сервис не найден: ${uuid}`);
                }
            }

            if (!service) {
                throw new Error('Не удалось найти подходящий сервис');
            }

            // Получаем все характеристики для отладки
            const characteristics = await service.getCharacteristics();
            console.log('📋 Доступные характеристики:', characteristics.length);
            
            characteristics.forEach(char => {
                console.log(`🔸 Характеристика: ${char.uuid}, свойства: ${char.properties}`);
            });

            // Пробуем найти характеристику координат
            const coordUUIDs = [
                '12345678-1234-1234-1234-123456789abd',
                'beb5483e-36e1-4688-b7f5-ea07361b26a8',
                '0000ffe1-0000-1000-8000-00805f9b34fb'
            ];

            for (let uuid of coordUUIDs) {
                try {
                    this.coordCharacteristic = await service.getCharacteristic(uuid);
                    await this.coordCharacteristic.startNotifications();
                    this.coordCharacteristic.addEventListener('characteristicvaluechanged', 
                        (event) => this.handleCoordData(event));
                    console.log(`✅ Подписка на координаты: ${uuid}`);
                    break;
                } catch (e) {
                    console.log(`❌ Характеристика координат не найдена: ${uuid}`);
                }
            }

            // Пробуем найти характеристику LED
            const ledUUIDs = [
                '12345678-1234-1234-1234-123456789abe',
                '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
                '0000ffe2-0000-1000-8000-00805f9b34fb'
            ];

            for (let uuid of ledUUIDs) {
                try {
                    this.ledCharacteristic = await service.getCharacteristic(uuid);
                    console.log(`✅ LED характеристика найдена: ${uuid}`);
                    break;
                } catch (e) {
                    console.log(`❌ LED характеристика не найдена: ${uuid}`);
                }
            }

            this.isConnected = true;
            this.updateUI();
            
            console.log('🎉 BLE подключение установлено!');
            this.showConnectionInfo();
            
            return true;

        } catch (error) {
            console.error('❌ Ошибка BLE:', error);
            this.handleBLEError(error);
            return false;
        }
    }

    showConnectionInfo() {
        const info = `
✅ Успешно подключено к устройству!

📱 Устройство: ${this.device.name}
🔗 ID: ${this.device.id}
📡 Сервисы: найдены
📍 Координаты: ${this.coordCharacteristic ? '✅' : '❌'}
💡 LED управление: ${this.ledCharacteristic ? '✅' : '❌'}

Теперь можно управлять маяком!
        `;
        alert(info);
    }

    handleBLEError(error) {
        let message = 'Ошибка подключения: ';
        
        switch(error.name) {
            case 'NotFoundError':
                message += 'Устройства BLE не найдены.\n\nВозможные причины:\n• ESP32 не в режиме BLE\n• Неправильное имя устройства\n• Устройство уже подключено к другому телефону';
                break;
            case 'SecurityError':
                message += 'Ошибка безопасности.\n\nТребуется:\n• HTTPS соединение\n• Разрешение в настройках браузера';
                break;
            case 'NetworkError':
                message += 'Ошибка сети.\n\nПроверьте:\n• Близость к устройству\n• Включен ли Bluetooth';
                break;
            case 'InvalidStateError':
                message += 'Устройство уже подключено.';
                break;
            default:
                message += error.message;
        }
        
        alert(message);
        
        // Дополнительная отладка
        console.log('🔧 Детали ошибки:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
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
            alert('Сначала подключитесь к устройству');
            return;
        }

        try {
            const command = state ? 1 : 0;
            const value = new Uint8Array([command]);
            await this.ledCharacteristic.writeValue(value);
            console.log('💡 Команда LED отправлена:', command);
            
            // Временно обновляем индикатор
            this.updateLedIndicator(command);
            
            alert(`✅ Команда отправлена: LED ${state ? 'ВКЛ' : 'ВЫКЛ'}`);
            
        } catch (error) {
            console.error('Ошибка управления LED:', error);
            alert('❌ Ошибка отправки команды LED');
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
    }

    updateUI() {
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            if (this.isConnected) {
                connectBtn.textContent = '✅ Подключено';
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
