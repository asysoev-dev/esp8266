const { writeActiveUsersIdToDbFile, rewriteActiveUsersIdToDbFile } = require('../../db');
const { limitHumidity } = require('../../utils');

const calculatorKeyboard = JSON.stringify({
    inline_keyboard: [
        [{text: `1`, callback_data: "pin-1"}, {text: `2`, callback_data: "pin-2"}, {text: `3`, callback_data: "pin-3"}],
        [{text: `4`, callback_data: "pin-4"}, {text: `5`, callback_data: "pin-5"}, {text: `6`, callback_data: "pin-6"}],
        [{text: `7`, callback_data: "pin-7"}, {text: `8`, callback_data: "pin-8"}, {text: `9`, callback_data: "pin-9"}],
        [{text: `*`, callback_data: "pin-*"}, {text: `0`, callback_data: "pin-0"}, {text: `#`, callback_data: "pin-#"}],
        [{text: `Сброс`, callback_data: "reset"}]
    ],
});

// Функция handleStart
function handleStart(bot, msg, activeUsersId, bufferPinCode) {
    const text = msg.text;
    const chatId = msg.chat.id;
    
    if (text === "/start") {
        if (!activeUsersId.includes(chatId)) {
            bot.sendSticker(chatId, "CAACAgIAAxkBAAIG12cpU3cTRTOfwp2aj-obCpUT1uWOAAIxNAAC6BugStKvp8RmJqK8NgQ").then(() => {
                bufferPinCode[chatId] = "";
                bot.sendMessage(chatId, `Привет ${msg.from.first_name}, введи PIN код`, {
                    parse_mode: "MarkdownV2",
                    reply_markup: calculatorKeyboard
                });
            });
            return;
        }
        bot.sendMessage(chatId, "Добро пожаловать!");
    }
}

// Функция handleCheckSensors
function handleCheckSensors(bot, msg, currentSensorsData) {
    const text = msg.text;
    const chatId = msg.chat.id;
    
    if (text === "📈 Проверить показания") {
        if (currentSensorsData === null) {
            bot.sendSticker(chatId, 'CAACAgIAAxkBAAIGzGcpUvM89T8Qg5AwGhqWZ3Onaf9dAALzQQACb7NoSV-j4NDXxKN2NgQ').then(() => {
                bot.sendMessage(chatId, "Ошибка подключения сенсоров");
            });
            return;
        }
        bot.sendMessage(chatId, `Температура: ${Math.floor(currentSensorsData?.temperature)}C° 🌡\nВлажность: ${limitHumidity(currentSensorsData?.humidity)}% 💧`);
    }
}

// Функция handleRelayControls
function handleRelayControls(bot, msg, socketIo) {
    const text = msg.text;
    const chatId = msg.chat.id;
    
    const relayActions = {
        "Свет": () => socketIo.emit('relay_one'),
        "Ворота": () => socketIo.emit('relay_two'),
        "Калитка": () => socketIo.emit('relay_three')
    };
    
    if (relayActions[text]) {
        relayActions[text]();
    }
}

// Функция handleServiceCommands
function handleServiceCommands(bot, msg, activeUsersId, socketIo) {
    const text = msg.text;
    const chatId = msg.chat.id;
    
    const serviceCommands = {
        "/state": () => socketIo.emit('show_state'),
        "/restartMod": () => {
            global.isRestartModule = true;
            socketIo.emit('restart_module');
        },
        "/apMode": () => socketIo.emit('start_ap_mode'),
        "/service": () => {
            bot.sendMessage(chatId, `Сервисные команды:\n/restartMod \\- перезагрузка модуля,\n/apMode \\- перевести модуль в режим точки доступа,\n/state \\- показать состояние датчиков`, {
                parse_mode: "MarkdownV2"
            });
        }
    };
    
    if (serviceCommands[text]) {
        serviceCommands[text]();
    }
}

// Функция handleCloseCommand
function handleCloseCommand(bot, msg, activeUsersId) {
    const text = msg.text;
    const chatId = msg.chat.id;
    
    if (text === "/close") {
        if (activeUsersId.includes(chatId)) {
            const userIndex = activeUsersId.indexOf(chatId);
            activeUsersId.splice(userIndex, 1);
            rewriteActiveUsersIdToDbFile(activeUsersId);

            bot.sendSticker(chatId, "CAACAgIAAxkBAAIG4WcpVDXaMVArMMhs0zPGDxoGLktuAAKmQwACW8MoSgAB0uw6E9P-YzYE").then(() => {
                bot.sendMessage(chatId, `Пока ${msg.from.first_name}\nЕсли снова понадобится получать уведомления или управлять системой, нажми Войти или набери команду */start*`, {
                    reply_markup: { remove_keyboard: true },
                    parse_mode: "MarkdownV2"
                });
            });
        }
    }
}

module.exports = {
    handleStart,
    handleCheckSensors,
    handleRelayControls,
    handleServiceCommands,
    handleCloseCommand,
    calculatorKeyboard
};