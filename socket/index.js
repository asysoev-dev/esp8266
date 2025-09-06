const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer, {});
const Bot = require('../bot');
const { createTemperatureReminder, createOpenGateReminder } = require('../utils');

class SocketServer {
    constructor() {
        this.botInstance = new Bot();
        this.bot = this.botInstance.getBot();
        this.activeUsersId = this.botInstance.getActiveUsers();
        this.currentSensorsData = null;
        this.isSendWarningTemperatureMessage = false;
        this.isSendWarningOpenGateMessage = false;
        this.isSendDisconnectMessage = false;
        this.disconnectTimeoutId = null;
        this.isRestartModule = false;
        
        this.setupSocketIO();
    }

    setupSocketIO() {
        this.socketIo = io.on("connection", (socket) => {
            this.handleConnection(socket);
            this.handleDisconnect(socket);
            this.handleSensorEvents(socket);
        });

        // Сохраняем в глобальной переменной для доступа из других модулей
        global.socketIo = this.socketIo;
        global.currentSensorsData = this.currentSensorsData;
    }

    handleConnection(socket) {
        if (!this.isSendDisconnectMessage && !this.isRestartModule) {
            this.activeUsersId.forEach((userId) => {
                this.bot.sendSticker(userId, "CAACAgIAAxkBAAIG7WcpVM7PlckHAVSETRPH3-NtOwQlAAISNQACx6ehSqkeK7OWc836NgQ").then(() => {
                    this.bot.sendMessage(userId, "Связь с модулем установлена!!!!!! ))))");
                });
            });
        } else {
            this.isSendDisconnectMessage = false;
            clearTimeout(this.disconnectTimeoutId);
        }

        if (this.isRestartModule) {
            this.activeUsersId.forEach((userId) => {
                this.bot.sendMessage(userId, "Перезагрузка завершена");
            });
        }
    }

    handleDisconnect(socket) {
        socket.on("disconnect", (data) => {
            if (!this.isRestartModule) {
                this.isSendDisconnectMessage = true;
                this.disconnectTimeoutId = setTimeout(() => {
                    this.activeUsersId.forEach((userId) => {
                        this.bot.sendSticker(userId, "CAACAgIAAxkBAAIGzGcpUvM89T8Qg5AwGhqWZ3Onaf9dAALzQQACb7NoSV-j4NDXxKN2NgQ").then(() => {
                            this.bot.sendMessage(userId, "Потеряна связь с модулем");
                        });
                    });
                    this.isSendDisconnectMessage = false;
                }, 30000);
            }
            this.isRestartModule = false;
        });
    }

    handleSensorEvents(socket) {
        socket.on('noData', () => {
            this.currentSensorsData = null;
            global.currentSensorsData = null;
        });

        socket.on('sensorsStates', (data) => this.handleSensorsStates(data));
        socket.on('restartModule', (data) => this.handleRestartModule(data));
        socket.on('startAPMode', (data) => this.handleStartAPMode(data));
        socket.on('openGate', () => this.handleOpenGate());
        socket.on('sensorsData', (data) => this.handleSensorsData(data));
    }

    handleSensorsStates(data) {
        function getStateName(entity, state) {
            const states = {
                "relay_one": state ? "включен" : "отключен",
                "relay_two": state ? "открыты" : "закрыты"
            };
            return states[entity];
        }

        this.activeUsersId.forEach((userId) => {
            this.bot.sendMessage(userId, `Свет ${getStateName("relay_one", data.relay_one)}, Ворота ${getStateName("relay_two", data.relay_two)}`);
        });
    }

    handleRestartModule(data) {
        this.activeUsersId.forEach((userId) => {
            this.bot.sendMessage(userId, "Перезагрузка модуля...");
        });
    }

    handleStartAPMode(data) {
        this.activeUsersId.forEach((userId) => {
            this.bot.sendMessage(userId, "Модуль переведен в режим точки доступа.");
        });
    }

    handleOpenGate() {
        if (!this.isSendWarningOpenGateMessage) {
            this.isSendWarningOpenGateMessage = true;
            this.activeUsersId.forEach((userId) => {
                this.bot.sendMessage(userId, "Не забудь закрыть ворота!\n\nНапомнить через:", {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: `5 мин`, callback_data: "remindOpenGate5"}, {text: `15 мин`, callback_data: "remindOpenGate15"}],
                            [{text: `30 мин`, callback_data: "remindOpenGate30"}, {text: `60 мин`, callback_data: "remindOpenGate60"}],
                            [{text: `Сбросить таймер`, callback_data: "clearOpenGateTimer"}]
                        ]
                    })
                });
            });
            createOpenGateReminder(60000, () => {
                this.isSendWarningOpenGateMessage = false;
            });
        }
    }

    handleSensorsData(data) {
        this.currentSensorsData = data;
        global.currentSensorsData = data;
        
        if (data.temperature < 2 && !this.isSendWarningTemperatureMessage) {
            this.isSendWarningTemperatureMessage = true;
            this.activeUsersId.forEach((userId) => {
                this.bot.sendMessage(userId, `*ВНИМАНИЕ*❗️\nТемпература близка к ${Math.floor(data.temperature)}C° 🌡\nВлажность: ${Math.floor(data.humidity)}% 💧\n\nНапомнить через:`, {
                    parse_mode: "MarkdownV2",
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: `30 мин`, callback_data: "remindTemperature30"}, {text: `60 мин`, callback_data: "remindTemperature60"}],
                            [{text: `Сбросить таймер`, callback_data: "clearTemperatureTimer"}]
                        ]
                    })
                });
            });
            createTemperatureReminder(60000, () => {
                this.isSendWarningTemperatureMessage = false;
            });
        }
    }

    getHttpServer() {
        return httpServer;
    }
}

module.exports = SocketServer;