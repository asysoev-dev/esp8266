require('dotenv').config();

module.exports = {
    token: process.env.API_KEY,
    pinCode: process.env.PIN_CODE,
    port: process.env.PORT || 3000
};