'use strict'

function build(passwordPolicy) {
    if (passwordPolicy.customizeHelpText) {
        return;
      }
  
      passwordPolicy.helpText = 'Your password is invalid and must contain '
  
      const originalKeys = Object.keys(passwordPolicy);
      const filtered = originalKeys.filter(function (value, index, arr) {
        if (value == 'helpText' || value == 'helpTextTemplate' || value == 'customizeHelpText'
          || value == 'lastNumPass' || value == 'restrictSpecialChars' || value.endsWith('Enabled')) {
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
          if (msg) {
            const subbedMsg = msg.replace('#', value);
  
            passwordText += subbedMsg;
            passwordText += ', ';
            commaCount++;
          }
        }
      }
  
      //Remove the last comma.  Tricky to do in the loop since we don't know ahead 
      //of time if things are enabled.
      passwordText = passwordText.substring(0, passwordText.length - 2);
      passwordText += '.';
  
      if(commaCount > 1) {
        const idx = passwordText.lastIndexOf(',');
        let firstPart = passwordText.slice(0, idx + 1);
        let lastPart = passwordText.slice(idx + 1, passwordText.length);
    
        const andInclude = firstPart + ' and' + lastPart;
        passwordText = andInclude;
      }
  
      passwordPolicy.helpText += passwordText;
}

module.exports = {
    build
}