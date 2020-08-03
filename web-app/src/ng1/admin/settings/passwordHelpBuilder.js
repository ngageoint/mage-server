'use strict'

function build(passwordPolicy) {
    const originalKeys = Object.keys(passwordPolicy);
    const filtered = originalKeys.filter(function (value, index, arr) {
        if (value.toLowerCase().includes('help') || value.endsWith('Enabled')) {
            return false;
        }
        return true;
    });

    let commaCount = 0;
    let passwordText = "";
    for (let i = 0; i < filtered.length; i++) {
        const key = filtered[i];

        const enabled = passwordPolicy[key + 'Enabled'];

        if (enabled) {
            const value = passwordPolicy[key];
            const msg = passwordPolicy.helpTextTemplate[key];
            if (msg && value) {
                const subbedMsg = msg.replace('#', value);

                passwordText += subbedMsg;
                passwordText += ', ';
                commaCount++;
            }
        }
    }

    let helpText = '';
    if (passwordText.length > 0) {
        helpText = 'Your password is invalid and must ';
        helpText += fixSentenceStructure(passwordText, commaCount);
    }

    return helpText;
}

function fixSentenceStructure(passwordText, commaCount) {
    //Remove the last comma.  Tricky to do in the loop since we don't know ahead 
    //of time if things are enabled.
    let correctedPasswordText = passwordText.substring(0, passwordText.length - 2);
    correctedPasswordText += '.';

    if (commaCount > 1) {
        const idx = correctedPasswordText.lastIndexOf(',');
        const firstPart = correctedPasswordText.slice(0, idx + 1);
        const lastPart = correctedPasswordText.slice(idx + 1, correctedPasswordText.length);

        correctedPasswordText = firstPart + ' and' + lastPart;
    }

    return correctedPasswordText;
}

module.exports = {
    build
}