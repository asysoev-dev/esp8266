require('dotenv').config()
const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer, {});
const TelegramApi = require("node-telegram-bot-api");
const token = process.env.API_KEY;
const pinCode = process.env.PIN_CODE;
const bot = new TelegramApi(token, {polling: true});
const fs = require('fs');
let isSendWarningTemperatureMessage = false;
let isSendWarningOpenGateMessage = false;
let currentSensorsData = null;
let activeUsersId = [];
let remindTemperatureSetTimeoutId = null;
let remindOpenGateSetTimeoutId = null;
let isSendDisconnectMessage = false;
let disconnectTimeoutId = null;
let isRestartModule = false;
let bufferPinCode = {};
let calculatorKeyboard = JSON.stringify({
    inline_keyboard: [
        [{text: `1`, callback_data: "pin-1"}, {text: `2`, callback_data: "pin-2"}, {text: `3`, callback_data: "pin-3"}],
        [{text: `4`, callback_data: "pin-4"}, {text: `5`, callback_data: "pin-5"}, {text: `6`, callback_data: "pin-6"}],
        [{text: `7`, callback_data: "pin-7"}, {text: `8`, callback_data: "pin-8"}, {text: `9`, callback_data: "pin-9"}],
        [{text: `*`, callback_data: "pin-*"}, {text: `0`, callback_data: "pin-0"}, {text: `#`, callback_data: "pin-#"}],
        [{text: `Сброс`, callback_data: "reset"}]
    ],
});

bot.setMyCommands([
    {command: "/start", description: "Войти"},
    {command: "/close", description: "Выйти"},
    {command: "/service", description: "Сервисные команды"}
]);
bot.on('text', async msg => {
    // console.log(msg);
})

bot.on('callback_query', function onCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    if (callbackQuery.data === "remindTemperature30") {
        clearTimeout(remindTemperatureSetTimeoutId);
        createTemperatureReminder(1800000);
    }
    if (callbackQuery.data === "remindTemperature60") {
        clearTimeout(remindTemperatureSetTimeoutId);
        createTemperatureReminder(3600000);
    }
    if (callbackQuery.data === "clearTemperatureTimer") {
        clearTimeout(remindTemperatureSetTimeoutId);
        createTemperatureReminder(60000);
    }

    if (callbackQuery.data === "remindOpenGate5") {
        clearTimeout(remindOpenGateSetTimeoutId);
        createOpenGateReminder(300000);
    }
    if (callbackQuery.data === "remindOpenGate15") {
        clearTimeout(remindOpenGateSetTimeoutId);
        createOpenGateReminder(900000);
    }
    if (callbackQuery.data === "remindOpenGate30") {
        clearTimeout(remindOpenGateSetTimeoutId);
        createOpenGateReminder(1800000);
    }
    if (callbackQuery.data === "remindOpenGate60") {
        clearTimeout(remindOpenGateSetTimeoutId);
        createOpenGateReminder(3600000);
    }
    if (callbackQuery.data === "clearOpenGateTimer") {
        clearTimeout(remindOpenGateSetTimeoutId);
        createOpenGateReminder(60000);
    }

    if (callbackQuery.data === "openDoor") {
        socketIo.emit('relay_three');
    }
    if (callbackQuery.data === "skipCall") {
        bot.sendSticker(chatId, "CAACAgIAAxkBAAIG9GcpVhedhI5bd6Co2xLkrg6835vgAAItPQACiHVJSZGPS5PWIKflNgQ");
    }
    if (callbackQuery.data.includes("pin")) {
        bufferPinCode[chatId] += callbackQuery.data.split("-")[1];
        console.log('%cbufferPinCode: ', 'color: green;', bufferPinCode);
        if (bufferPinCode[chatId] === pinCode) {
            bufferPinCode[chatId] = "";
            if (!activeUsersId.includes(chatId)) {
                activeUsersId.push(chatId);
                writeActiveUsersIdToDbFile(chatId);
            } else {
                bot.sendMessage(chatId, `${callbackQuery.from.first_name}, ты уже авторизован`);
                return;
            }
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
        }
    }
    if (callbackQuery.data === "reset") {
        bufferPinCode[chatId] = "";
    }
});
bot.on("message", async msg => {
    // console.log('%cmsg: ', 'color: green;', msg);
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
    if (text === "📈 Проверить показания") {
        if (currentSensorsData === null) {
            bot.sendSticker(chatId, 'CAACAgIAAxkBAAIGzGcpUvM89T8Qg5AwGhqWZ3Onaf9dAALzQQACb7NoSV-j4NDXxKN2NgQ').then(() => {
                bot.sendMessage(chatId, "Ошибка подключения сенсоров");
            })
            return;
        }
        // bot.sendMessage(chatId, "Введи PIN код", {
        //     reply_markup: calculatorKeyboard
        // });
        bot.sendMessage(chatId, `Температура: ${Math.floor(currentSensorsData?.temperature)}C° 🌡\nВлажность: ${Math.min(Math.floor(currentSensorsData?.humidity), 100)}% 💧`);
    }
    if (text === "Свет") {
        socketIo.emit('relay_one');
    }
    if (text === "Ворота") {
        socketIo.emit('relay_two');
    }
    if (text === "Калитка") {
        socketIo.emit('relay_three');
    }
    if (text === "/state") {
        socketIo.emit('show_state');
    }
    if (text === "/restartMod") {
        isRestartModule = true;
        socketIo.emit('restart_module');
    }
    if (text === "/apMode") {
        socketIo.emit('start_ap_mode');
    }
    if (text === "/service") {
        bot.sendMessage(chatId, `Сервисные команды:\n/restartMod \\- перезагрузка модуля,\n/apMode \\- перевести модуль в режим точки доступа,\n/state \\- показать состояние датчиков`, {
            parse_mode: "MarkdownV2"
        });
    }
    if (text === "/close") {
        if (activeUsersId.includes(chatId)) {
            const userIndex = activeUsersId.indexOf(chatId);
            activeUsersId.splice(userIndex, 1);
            rewriteActiveUsersIdToDbFile(activeUsersId);

            bot.sendSticker(chatId, "CAACAgIAAxkBAAIG4WcpVDXaMVArMMhs0zPGDxoGLktuAAKmQwACW8MoSgAB0uw6E9P-YzYE").then(() => {
                bot.sendMessage(chatId, `Пока ${msg.from.first_name}\nЕсли снова понадобится получать уведомления или управлять системой, нажми Войти или набери команду */start*`, {
                    reply_markup: {
                        remove_keyboard: true
                    },
                    parse_mode: "MarkdownV2"
                });
            });

        }
    }
});

const socketIo = io.on("connection", (socket) => {
    if (!isSendDisconnectMessage && !isRestartModule) { //не было disconnect(а) и перезагрузки
        activeUsersId.forEach((userId) => {
            bot.sendSticker(userId, "CAACAgIAAxkBAAIG7WcpVM7PlckHAVSETRPH3-NtOwQlAAISNQACx6ehSqkeK7OWc836NgQ").then(() => {
                bot.sendMessage(userId, "Связь с модулем установлена!!!!!! ))))");
            });
        });
    } else {
        isSendDisconnectMessage = false;
        clearTimeout(disconnectTimeoutId);
    }

    if (isRestartModule) {
        activeUsersId.forEach((userId) => {
            bot.sendMessage(userId, "Перезагрузка завершена");
            // isRestartModule = false;
        });
    }

    socket.on("disconnect", (data) => {
        if (!isRestartModule) {
            isSendDisconnectMessage = true;
            disconnectTimeoutId = setTimeout(() => {
                activeUsersId.forEach((userId) => {
                    bot.sendSticker(userId, "CAACAgIAAxkBAAIGzGcpUvM89T8Qg5AwGhqWZ3Onaf9dAALzQQACb7NoSV-j4NDXxKN2NgQ").then(() => {
                        bot.sendMessage(userId, "Потеряна связь с модулем");
                    });
                });
                isSendDisconnectMessage = false;
            }, 30000);
        };
        isRestartModule = false;
    });
    socket.on('noData', () => {
        // console.log('NO DATA');
        currentSensorsData = null;
    });
    socket.on('sensorsStates', (data) => {
        function getStateName(entity, state) {
            switch (entity) {
                case "relay_one": // Свет
                    return state ? "включен" : "отключен";
                case "relay_two": // Ворота
                    return state ? "открыты" : "закрыты";
                default:
                    return;
            }
        };
        activeUsersId.forEach((userId) => {
            bot.sendMessage(userId, `Свет ${getStateName("relay_one", data.relay_one)}, Ворота ${getStateName("relay_two", data.relay_two)}`);
        });
    });
    socket.on('restartModule', (data) => {
        activeUsersId.forEach((userId) => {
            bot.sendMessage(userId, "Перезагрузка модуля...");
        });
    });
    socket.on('startAPMode', (data) => {
        activeUsersId.forEach((userId) => {
            bot.sendMessage(userId, "Модуль переведен в режим точки доступа. ");
        });
    });
    socket.on('openGate', () => {
        console.log("WARNING OPEN GATE!!!");
        if (!isSendWarningOpenGateMessage) {
            activeUsersId.forEach((userId) => {
                bot.sendMessage(userId, "Не забудь закрыть ворота!\n\nНапомнить через:", {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [
                            [{text: `5 мин`, callback_data: "remindOpenGate5"}, {text: `15 мин`, callback_data: "remindOpenGate15"}],
                            [{text: `30 мин`, callback_data: "remindOpenGate30"}, {text: `60 мин`, callback_data: "remindOpenGate60"}],
                            [{text: `Сбросить таймер`, callback_data: "clearOpenGateTimer"}]],
                    })
                });
            });
            isSendWarningOpenGateMessage = true;
            createOpenGateReminder(60000);
        }
    });
    socket.on('sensorsData', (data) => {
        // console.log('%cactiveUsersId: ', 'color: green;', activeUsersId);
        currentSensorsData = data;
        switch (true) {
            case data.temperature < 2:
                console.log("WARNING!");
                if (!isSendWarningTemperatureMessage) {
                    activeUsersId.forEach((userId) => {
                        bot.sendMessage(userId, `*ВНИМАНИЕ*❗️\nТемпература близка к ${Math.floor(data.temperature)}C° 🌡\nВлажность: ${Math.floor(data.humidity)}% 💧\n\nНапомнить через:`, {
                            parse_mode: "MarkdownV2",
                            reply_markup: JSON.stringify({
                                inline_keyboard: [[{text: `30 мин`, callback_data: "remindTemperature30"}, {text: `60 мин`, callback_data: "remindTemperature60"}], [{text: `Сбросить таймер`, callback_data: "clearTemperatureTimer"}]],
                            })
                        });
                    });
                    isSendWarningTemperatureMessage = true;
                    createTemperatureReminder(60000);
                }
                break;
            default:
                break;
        }
    });
});

function createTemperatureReminder(interval) {
    console.log('НАПОМНИТЬ ПРО ТЕМПЕРАТУРУ ЧЕРЕЗ ', interval, "МС");
    remindTemperatureSetTimeoutId = setTimeout(() => {
        isSendWarningTemperatureMessage = false;
    }, interval);
}
function createOpenGateReminder(interval) {
    console.log('НАПОМНИТЬ ПРО ВОРОТА ЧЕРЕЗ ', interval, "МС");
    remindOpenGateSetTimeoutId = setTimeout(() => {
        isSendWarningOpenGateMessage = false;
    }, interval);
}
function readActiveUsersIdFromDbFile() {
    const readFile = fs.readFileSync('db.txt', 'utf8');
    if (fs.readFileSync('db.txt', 'utf8') !== "") {
        return JSON.parse(readFile);
    } else {
        return [];
    }
}
function writeActiveUsersIdToDbFile(data) {
    const writeData = [...readActiveUsersIdFromDbFile(), data];
    fs.writeFile("db.txt", JSON.stringify(writeData), (error) =>{
        if(error) throw error;
    });
}
function rewriteActiveUsersIdToDbFile(data) {
    fs.writeFile("db.txt", JSON.stringify(data), (error) =>{
        if(error) throw error;
    });
}

httpServer.listen(3000);
activeUsersId = readActiveUsersIdFromDbFile();