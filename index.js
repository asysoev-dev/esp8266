const SocketServer = require('./socket');
const { port } = require('./config');

// Глобальные переменные
global.currentSensorsData = null;
global.isSendWarningTemperatureMessage = false;
global.isSendWarningOpenGateMessage = false;
global.isSendDisconnectMessage = false;
global.disconnectTimeoutId = null;
global.isRestartModule = false;
global.bufferPinCode = {};
global.socketIo = null; // Добавьте это

// Инициализация сервера
const socketServer = new SocketServer();
const httpServer = socketServer.getHttpServer();

// Запуск сервера
httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});