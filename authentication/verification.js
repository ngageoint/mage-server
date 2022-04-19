const JWT = require('jsonwebtoken');

function payload(subject, assertion) {
  return { subject: `${subject}`, assertion: assertion };
}

const VerificationErrorReason = {
  NoToken: 'no_token',
  Subject: 'subject',
  Assertion: 'assertion',
  Expired: 'expired',
  Decode: 'decode',
  Implementation: 'implementation'
}

const TokenAssertion = {
  Authorized: 'urn:mage:auth:authorized',
  Captcha: 'urn:mage:signup:captcha'
}

class TokenGenerateError extends Error {

  constructor(subject, assertion, secondsToLive, cause) {
    super();
    this.name = 'TokenVerificationError';
    this.subject = subject;
    this.assertion = assertion;
    this.secondsToLive = secondsToLive;
    this.cause = cause;
    let causeMessage = '';
    if (cause) {
      causeMessage = 'cause=' + (cause instanceof Error ? `${"\n" + cause.stack || `${cause.name}: ${cause.message}`}` : `${cause}`)
    }
    this.message = `error generating token: subject=${subject}; assertion=${assertion}; secondsToLive=${secondsToLive}; ${causeMessage}`
  }
}

class TokenVerificationError extends Error {
  /**
   * @param reason why the verification failed
   * @param subject the expected subject
   * @param assertion the expected assertion
   * @param token the encoded token string
   * @param decoded the decoded payload of the token
   * @param cause cause of the verification error from the underlying token implementation
   */
  constructor(reason, expected, token, decoded, cause) {
    super();
    this.reason = reason;
    this.expected = expected || { subject: null, assertion: null };
    this.token = token;
    this.decoded = decoded;
    let reasonMessage = `${reason}`;
    let causeMessage = '';
    if (cause) {
      causeMessage = 'cause=' + (cause instanceof Error ? `${"\n" + cause.stack || `${cause.name}: ${cause.message}`}` : `${cause}`)
    }

    decoded = decoded || { subject: null, assertion: null, expiration: null };
    if (reason === VerificationErrorReason.Subject) {
      reasonMessage = `subject was ${decoded.subject}`
    } else if (reason === VerificationErrorReason.Assertion) {
      reasonMessage = `assertion was ${decoded.assertion}`
    } else if (reason === VerificationErrorReason.Expired) {
      reasonMessage = `token expired ${new Date(decoded.expiration || 0)} (${decoded.expiration})`
    } else if (reason === VerificationErrorReason.Decode) {
      reasonMessage = `failed to decode token`;
    }

    this.message = `TokenVerificationError (${reasonMessage}): expected subject=${this.expected.subject}, assertion=${this.expected.assertion}; token=${token}; ${causeMessage}`
  }
}

class JWTService {
  constructor(secret, issuer) {
    this._secret = secret;
    this._issuer = issuer;
    this._algorithm = 'HS256';
  }

  generateToken(subject, assertion, secondsToLive, claims = {}) {
    return new Promise((resolve, reject) => {
      const payload = Object.assign({ assertion: assertion }, claims);

      JWT.sign(payload, this._secret, {
        algorithm: this._algorithm,
        issuer: this._issuer,
        expiresIn: secondsToLive,
        subject: subject,
      },(err, token) => {
        if (err) {
          reject(new TokenGenerateError(subject, assertion, secondsToLive, err));
        } else {
          resolve(token);
        }
      });
    });
  }

  verifyToken(token, expected) {
    return new Promise((resolve, reject) => {
      JWT.verify(token, this._secret, { algorithms: [this._algorithm], issuer: this._issuer }, (err, payload) => {
        if (!expected) {
          expected = { subject: null, assertion: null };
        }

        if (err) {
          let reason = VerificationErrorReason.Implementation;
          let decoded = null;
          try {
            const jwt = JWT.decode(token, { json: true });
            if (jwt) {
              decoded = Object.assign({}, jwt, { 
                subject: jwt.sub || null,
                assertion: jwt.assertion || null, 
                expiration: jwt.exp || null 
              });
            }
          } catch (err) {
            reason = VerificationErrorReason.Decode;
          }
          
          if (!decoded) {
            reason = VerificationErrorReason.Decode;
            decoded = { subject: null, assertion: null, expiration: null };
          } else if (err instanceof JWT.TokenExpiredError) {
            reason = VerificationErrorReason.Expired;
          }
          return reject(new TokenVerificationError(reason, expected, token, payload, err));
        } else if (expected.subject && payload.sub !== expected.subject) {
          return reject(new TokenVerificationError(VerificationErrorReason.Subject, expected, token, payload))
        } else if (expected.assertion && payload.assertion !== expected.assertion) {
          return reject(new TokenVerificationError(VerificationErrorReason.Assertion, expected, token, payload));
        }

        resolve(Object.assign({}, payload, {
            subject: payload.sub || null,
            assertion: payload.assertion || null,
            expiration: payload.exp || null
        }));

      });
    });
  }
}

exports.payload = payload;
exports.TokenAssertion = TokenAssertion;
exports.TokenGenerateError = TokenGenerateError;
exports.VerificationErrorReason = VerificationErrorReason;
exports.JWTService = JWTService;
