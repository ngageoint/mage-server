module.exports = function(options) {

var crypto = require('crypto');

var options = options || {};
var iterations = options.iterations || 12000;
var saltLength = options.saltLength || 128;
var derivedKeyLength = options.derivedKeyLength || 256;

/**
 * Serialize a p***REMOVED***word object containing all the information needed to check a p***REMOVED***word into a string
 * The info is salt, derivedKey, derivedKey length and number of iterations
 */
 var serializeP***REMOVED***word = function (p***REMOVED***word) {
  return p***REMOVED***word.salt + "::" +
         p***REMOVED***word.derivedKey + "::" +
         p***REMOVED***word.derivedKeyLength + "::" +
         p***REMOVED***word.iterations;
};

/**
 * Deserialize a string into a p***REMOVED***word object
 * The info is salt, derivedKey, derivedKey length and number of iterations
 */
var deserializeP***REMOVED***word = function (p***REMOVED***word) {
  var items = p***REMOVED***word.split('::');

  return {
    salt: items[0],
    derivedKey: items[1],
    derivedKeyLength: parseInt(items[2], 10),
    iterations: parseInt(items[3], 10)
  };
};

/**
 * Encrypt a p***REMOVED***word using node.js' crypto's PBKDF2
 * Description here: http://en.wikipedia.org/wiki/PBKDF2
 * Number of iterations are saved in case we change the setting in the future
 * @param {String} p***REMOVED***word
 * @param {Funtion} callback Signature: err, encryptedP***REMOVED***word
 */
var encryptP***REMOVED***word = function (p***REMOVED***word, callback) {
  var salt = crypto.randomBytes(saltLength).toString('base64').slice(0, saltLength);

  crypto.pbkdf2(p***REMOVED***word, salt, iterations, derivedKeyLength, function (err, derivedKey) {
    if (err) { return callback(err); }

    var encryptedP***REMOVED***word = serializeP***REMOVED***word({
      salt: salt,
      iterations: iterations,
      derivedKeyLength: derivedKeyLength,
      derivedKey: derivedKey.toString('base64')
    });

    callback(null, encryptedP***REMOVED***word);
  });
};

/**
 * Compare a p***REMOVED***word to an encrypted p***REMOVED***word
 * @param {String} p***REMOVED***word
 * @param {String} encryptedP***REMOVED***word
 * @param {Function} callback Signature: err, true/false
 */
 var validP***REMOVED***word = function (p***REMOVED***word, encryptedP***REMOVED***word, callback) {
  if (!encryptedP***REMOVED***word) return callback(false);

  encryptedP***REMOVED***word = deserializeP***REMOVED***word(encryptedP***REMOVED***word);

  if (!encryptedP***REMOVED***word.salt || !encryptedP***REMOVED***word.derivedKey || !encryptedP***REMOVED***word.iterations || !encryptedP***REMOVED***word.derivedKeyLength) { 
    return callback("encryptedP***REMOVED***word doesn't have the right format"); 
  }

  // Use the encrypted p***REMOVED***word's parameter to hash the candidate p***REMOVED***word
  crypto.pbkdf2(p***REMOVED***word, encryptedP***REMOVED***word.salt, encryptedP***REMOVED***word.iterations, encryptedP***REMOVED***word.derivedKeyLength, function (err, derivedKey) {
    if (err) { return callback(err); }


    callback(null, derivedKey.toString('base64') === encryptedP***REMOVED***word.derivedKey)
  });
 };

 return {
  encryptP***REMOVED***word: encryptP***REMOVED***word,
  validP***REMOVED***word: validP***REMOVED***word
 }

}