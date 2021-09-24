module.exports = function(options) {

  const crypto = require('crypto');

  options = options || {};
  const iterations = options.iterations || 12000;
  const saltLength = options.saltLength || 128;
  const derivedKeyLength = options.derivedKeyLength || 256;

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
    const items = password.split('::');

    return {
      salt: items[0],
      derivedKey: items[1],
      derivedKeyLength: parseInt(items[2], 10),
      iterations: parseInt(items[3], 10)
    };
  }

  /**
   * Hash a password using node.js' crypto's PBKDF2
   * Description here: http://en.wikipedia.org/wiki/PBKDF2
   * Number of iterations are saved in case we change the setting in the future
   * @param {String} password
   * @param {Funtion} callback Signature: err, hashedPassword
   */
  function hashPassword(password, callback) {
    const salt = crypto.randomBytes(saltLength).toString('base64');

    crypto.pbkdf2(password, salt, iterations, derivedKeyLength, 'sha1', function (err, derivedKey) {
      if (err) { return callback(err); }

      const hashedPassword = serializePassword({
        salt: salt,
        iterations: iterations,
        derivedKeyLength: derivedKeyLength,
        derivedKey: derivedKey.toString('base64')
      });

      callback(null, hashedPassword);
    });
  }

  /**
   * Compare a password to a hashed password
   * @param {String} password
   * @param {String} hashedPassword
   * @param {Function} callback Signature: err, true/false
   */
  function validPassword(password, hashedPassword, callback) {
    if (!hashedPassword) return callback(false);

    hashedPassword = deserializePassword(hashedPassword);

    if (!hashedPassword.salt || !hashedPassword.derivedKey || !hashedPassword.iterations || !hashedPassword.derivedKeyLength) {
      return callback(new Error("hashedPassword doesn't have the right format"));
    }

    // Use the hashedPassword password's parameters to hash the candidate password
    crypto.pbkdf2(password, hashedPassword.salt, hashedPassword.iterations, hashedPassword.derivedKeyLength, 'sha1', function (err, derivedKey) {
      if (err) { return callback(err); }

      callback(null, derivedKey.toString('base64') === hashedPassword.derivedKey);
    });
  }

  return {
    hashPassword: hashPassword,
    validPassword: validPassword
  };

};
