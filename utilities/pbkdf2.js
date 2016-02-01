module.exports = function(options) {

  var crypto = require('crypto');

  options = options || {};
  var iterations = options.iterations || 12000;
  var saltLength = options.saltLength || 128;
  var derivedKeyLength = options.derivedKeyLength || 256;

  /**
   * Serialize a password object containing all the information needed to check a password into a string
   * The info is salt, derivedKey, derivedKey length and number of iterations
   */
  function serializePassword(password) {
    return password.salt + "::" +
           password.derivedKey + "::" +
           password.derivedKeyLength + "::" +
           password.iterations;
  }

  /**
   * Deserialize a string into a password object
   * The info is salt, derivedKey, derivedKey length and number of iterations
   */
  function deserializePassword(password) {
    var items = password.split('::');

    return {
      salt: items[0],
      derivedKey: items[1],
      derivedKeyLength: parseInt(items[2], 10),
      iterations: parseInt(items[3], 10)
    };
  }

  /**
   * Encrypt a password using node.js' crypto's PBKDF2
   * Description here: http://en.wikipedia.org/wiki/PBKDF2
   * Number of iterations are saved in case we change the setting in the future
   * @param {String} password
   * @param {Funtion} callback Signature: err, encryptedPassword
   */
  function encryptPassword(password, callback) {
    var salt = crypto.randomBytes(saltLength).toString('base64').slice(0, saltLength);

    crypto.pbkdf2(password, salt, iterations, derivedKeyLength, function (err, derivedKey) {
      if (err) { return callback(err); }

      var encryptedPassword = serializePassword({
        salt: salt,
        iterations: iterations,
        derivedKeyLength: derivedKeyLength,
        derivedKey: derivedKey.toString('base64')
      });

      callback(null, encryptedPassword);
    });
  }

  /**
   * Compare a password to an encrypted password
   * @param {String} password
   * @param {String} encryptedPassword
   * @param {Function} callback Signature: err, true/false
   */
  function validPassword(password, encryptedPassword, callback) {
    if (!encryptedPassword) return callback(false);

    encryptedPassword = deserializePassword(encryptedPassword);

    if (!encryptedPassword.salt || !encryptedPassword.derivedKey || !encryptedPassword.iterations || !encryptedPassword.derivedKeyLength) {
      return callback("encryptedPassword doesn't have the right format");
    }

    // Use the encrypted password's parameter to hash the candidate password
    crypto.pbkdf2(password, encryptedPassword.salt, encryptedPassword.iterations, encryptedPassword.derivedKeyLength, function (err, derivedKey) {
      if (err) { return callback(err); }

      callback(null, derivedKey.toString('base64') === encryptedPassword.derivedKey);
    });
  }

  return {
    encryptPassword: encryptPassword,
    validPassword: validPassword
  };

};
