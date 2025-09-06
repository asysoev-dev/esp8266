const SocketServer = require('./socket');
const { port } = require('./config');

// Инициализация сервера
const socketServer = new SocketServer();
const httpServer = socketServer.getHttpServer();

// Запуск сервера
httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});