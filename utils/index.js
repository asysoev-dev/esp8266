let remindTemperatureSetTimeoutId = null;
let remindOpenGateSetTimeoutId = null;

function createTemperatureReminder(interval, callback) {
    console.log('НАПОМНИТЬ ПРО ТЕМПЕРАТУРУ ЧЕРЕЗ ', interval, "МС");
    clearTimeout(remindTemperatureSetTimeoutId);
    remindTemperatureSetTimeoutId = setTimeout(callback, interval);
    return remindTemperatureSetTimeoutId;
}

function createOpenGateReminder(interval, callback) {
    console.log('НАПОМНИТЬ ПРО ВОРОТА ЧЕРЕЗ ', interval, "МС");
    clearTimeout(remindOpenGateSetTimeoutId);
    remindOpenGateSetTimeoutId = setTimeout(callback, interval);
    return remindOpenGateSetTimeoutId;
}

function limitHumidity(value) {
    const humidity = Math.floor(value || 0);
    return Math.min(humidity, 100);
}

module.exports = {
    createTemperatureReminder,
    createOpenGateReminder,
    limitHumidity
};