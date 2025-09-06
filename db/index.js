const fs = require('fs');

function readActiveUsersIdFromDbFile() {
    try {
        const readFile = fs.readFileSync('db.txt', 'utf8');
        return readFile ? JSON.parse(readFile) : [];
    } catch (error) {
        return [];
    }
}

function writeActiveUsersIdToDbFile(data) {
    const writeData = [...readActiveUsersIdFromDbFile(), data];
    fs.writeFileSync("db.txt", JSON.stringify(writeData));
}

function rewriteActiveUsersIdToDbFile(data) {
    fs.writeFileSync("db.txt", JSON.stringify(data));
}

module.exports = {
    readActiveUsersIdFromDbFile,
    writeActiveUsersIdToDbFile,
    rewriteActiveUsersIdToDbFile
};