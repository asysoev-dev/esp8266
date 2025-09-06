const { createTemperatureReminder, createOpenGateReminder } = require('../../utils');

function handleCallbackQuery(bot, callbackQuery, activeUsersId, bufferPinCode, pinCode, socketIo, setFlags) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Обработка напоминаний температуры
    const temperatureCallbacks = {
        "remindTemperature30": () => createTemperatureReminder(1800000, () => setFlags('temperature', false)),
        "remindTemperature60": () => createTemperatureReminder(3600000, () => setFlags('temperature', false)),
        "clearTemperatureTimer": () => createTemperatureReminder(60000, () => setFlags('temperature', false))
    };

    // Обработка напоминаний ворот
    const gateCallbacks = {
        "remindOpenGate5": () => createOpenGateReminder(300000, () => setFlags('gate', false)),
        "remindOpenGate15": () => createOpenGateReminder(900000, () => setFlags('gate', false)),
        "remindOpenGate30": () => createOpenGateReminder(1800000, () => setFlags('gate', false)),
        "remindOpenGate60": () => createOpenGateReminder(3600000, () => setFlags('gate', false)),
        "clearOpenGateTimer": () => createOpenGateReminder(60000, () => setFlags('gate', false))
    };

    // Обработка действий
    const actionCallbacks = {
        "openDoor": () => socketIo.emit('relay_three'),
        "skipCall": () => bot.sendSticker(chatId, "CAACAgIAAxkBAAIG9GcpVhedhI5bd6Co2xLkrg6835vgAAItPQACiHVJSZGPS5PWIKflNgQ")
    };

    if (temperatureCallbacks[data]) {
        temperatureCallbacks[data]();
    } else if (gateCallbacks[data]) {
        gateCallbacks[data]();
    } else if (actionCallbacks[data]) {
        actionCallbacks[data]();
    } else if (data.includes("pin")) {
        handlePinCode(bot, callbackQuery, activeUsersId, bufferPinCode, pinCode);
    } else if (data === "reset") {
        bufferPinCode[chatId] = "";
    }
}

function handlePinCode(bot, callbackQuery, activeUsersId, bufferPinCode, pinCode) {
    const chatId = callbackQuery.message.chat.id;
    bufferPinCode[chatId] += callbackQuery.data.split("-")[1];
    
    if (bufferPinCode[chatId] === pinCode) {
        bufferPinCode[chatId] = "";
        if (!activeUsersId.includes(chatId)) {
            activeUsersId.push(chatId);
            const { writeActiveUsersIdToDbFile } = require('../../db');
            writeActiveUsersIdToDbFile(chatId);
            bot.sendSticker(chatId, "CAACAgIAAxkBAAIGxGcpUUOOzM1rBIcB8UZY0fY31DcqAALnNQACtoxBS2JmFwWrYLwGNgQ").then(() => {
                bot.sendMessage(chatId, "Отлично! Доступ разрешен!", {
                    reply_markup: {
                        keyboard: [
                            ['📈 Проверить показания'],
                            ['Свет'],
                            ['Ворота'],
                            ['Калитка'],
                        ],
                        resize_keyboard: true
                    }
                });
            });
        } else {
            bot.sendMessage(chatId, `${callbackQuery.from.first_name}, ты уже авторизован`);
        }
    }
}

module.exports = {
    handleCallbackQuery
};