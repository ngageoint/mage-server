module.exports.lpad = function lpad(str, len, char) {
    while (str.length < len) { str = char + str; } return str;
};

module.exports.rpad = function rpad(str, len, char) {
    while (str.length < len) { str = str + char; } return str;
};

module.exports.writeField = function writeField(view, fieldLength, str, offset) {
    for (var i = 0; i < fieldLength; i++) {
        view.setUint8(offset, str.charCodeAt(i)); offset++;
    }
    return offset;
};
