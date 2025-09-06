const TelegramApi = require("node-telegram-bot-api");
const { token, pinCode } = require('../config');
const { readActiveUsersIdFromDbFile } = require('../db');
const { handleCallbackQuery } = require('./handlers/callbackHandlers');
const { 
    handleStart, 
    handleCheckSensors, 
    handleRelayControls, 
    handleServiceCommands, 
    handleCloseCommand 
} = require('./handlers/messageHandlers');

class Bot {
    constructor() {
        this.bot = new TelegramApi(token, { polling: true });
        this.activeUsersId = readActiveUsersIdFromDbFile();
        this.bufferPinCode = {};
        this.setupHandlers();
    }

    setupHandlers() {
        // Настройка команд бота
        this.bot.setMyCommands([
            { command: "/start", description: "Войти" },
            { command: "/close", description: "Выйти" },
            { command: "/service", description: "Сервисные команды" }
        ]);

        // Обработчики сообщений
        this.bot.on('message', async (msg) => {
            const text = msg.text;
            const chatId = msg.chat.id;

            handleStart(this.bot, msg, this.activeUsersId, this.bufferPinCode);
            handleCheckSensors(this.bot, msg, global.currentSensorsData);
            handleRelayControls(this.bot, msg, global.socketIo);
            handleServiceCommands(this.bot, msg, this.activeUsersId, global.socketIo);
            handleCloseCommand(this.bot, msg, this.activeUsersId);
        });

        // Обработчики callback queries
        this.bot.on('callback_query', (callbackQuery) => {
            const setFlags = (type, value) => {
                if (type === 'temperature') global.isSendWarningTemperatureMessage = value;
                if (type === 'gate') global.isSendWarningOpenGateMessage = value;
            };
            
            handleCallbackQuery(
                this.bot, 
                callbackQuery, 
                this.activeUsersId, 
                this.bufferPinCode, 
                pinCode, 
                global.socketIo,
                setFlags
            );
        });
    }

    getBot() {
        return this.bot;
    }

    getActiveUsers() {
        return this.activeUsersId;
    }
}

module.exports = Bot;