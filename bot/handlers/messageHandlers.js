const { writeActiveUsersIdToDbFile, rewriteActiveUsersIdToDbFile } = require('../../db');
const { limitHumidity } = require('../../utils');

// ... остальной код без изменений, но обновите вызовы:
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

function handleServiceCommands(bot, msg, activeUsersId, socketIo) {
    const text = msg.text;
    const chatId = msg.chat.id;
    
    const serviceCommands = {
        "/state": () => socketIo.emit('show_state'),
        "/restartMod": () => {
            // Устанавливаем флаг через глобальную переменную
            global.isRestartModule = true;
            socketIo.emit('restart_module');
        },
        // ... остальные команды
    };
    
    if (serviceCommands[text]) {
        serviceCommands[text]();
    }
}