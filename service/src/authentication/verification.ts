import JWT from 'jsonwebtoken'
import { Json } from '../entities/entities.json_types'

type Payload = {
  subject: string | null,
  assertion: TokenAssertion | null,
  expiration: number | null,
  [key: string]: Json
}

export enum VerificationErrorReason {
  NoToken = 'no_token',
  Subject = 'subject',
  Assertion = 'assertion',
  Expired = 'expired',
  Decode = 'decode',
  Implementation = 'implementation'
}

export enum TokenAssertion {
  Authorized = 'urn:mage:auth:authorized',
  Captcha = 'urn:mage:signup:captcha'
}

export class TokenGenerateError extends Error {

  constructor(readonly subject: string, readonly assertion: TokenAssertion, readonly secondsToLive: number, readonly cause?: Error | null) {
    const causeMessage = cause ? `cause=\n${cause.stack || `${cause.name}: ${cause.message}`}` : ''
    super(`error generating token: subject=${subject}; assertion=${assertion}; secondsToLive=${secondsToLive}; ${causeMessage}`)
  }
}

class TokenVerificationError extends Error {

  /**
   * @param reason why the verification failed
   * @param expected the expected `Payload`
   * @param token the encoded token string
   * @param decoded the decoded `Payload` of the token
   * @param cause cause of the verification error from the underlying token implementation
   */
  constructor(readonly reason: VerificationErrorReason, readonly expected: Payload | null, readonly token: string, readonly decoded: any, readonly cause?: Error | null) {
    let reasonMessage = `${reason}`;
    let causeMessage = '';
    if (cause) {
      causeMessage = 'cause=' + (cause instanceof Error ? `${"\n" + cause.stack || `${cause.name}: ${cause.message}`}` : `${cause}`)
    }
    if (reason === VerificationErrorReason.Subject) {
      reasonMessage = `subject was ${decoded?.subject}`
    }
    else if (reason === VerificationErrorReason.Assertion) {
      reasonMessage = `assertion was ${decoded?.assertion}`
    }
    else if (reason === VerificationErrorReason.Expired) {
      reasonMessage = `token expired ${new Date(decoded?.expiration || 0)} (${decoded?.expiration})`
    }
    else if (reason === VerificationErrorReason.Decode) {
      reasonMessage = `failed to decode token`
    }
    super(`TokenVerificationError (${reasonMessage}): expected subject=${expected?.subject}, assertion=${expected?.assertion}; token=${token}; ${causeMessage}`)
  }
}

export class JWTService {

  private readonly algorithm = 'HS256'

  constructor(private readonly secret: string, private readonly issuer: string) {}

  generateToken(subject: string, assertion: TokenAssertion, secondsToLive: number, claims = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const payload = Object.assign({ assertion }, claims);
      JWT.sign(payload, this.secret,
        {
          algorithm: this.algorithm,
          issuer: this.issuer,
          expiresIn: secondsToLive,
          subject: subject,
        },
        (err, token) => {
          if (err) {
            reject(new TokenGenerateError(subject, assertion, secondsToLive, err))
          }
          else {
            resolve(String(token))
          }
        }
      )
    })
  }

  verifyToken(token: string, expected: Payload): Promise<Payload> {
    return new Promise((resolve, reject) => {
      JWT.verify(token, this.secret, { algorithms: [this.algorithm], issuer: this.issuer }, (err: JWT.VerifyErrors | null, anyPayload?: any) => {
        const jwtPayload = anyPayload as JWT.JwtPayload
        if (!expected) {
          expected = { subject: null, assertion: null, expiration: null };
        }
        if (err) {
          let reason = VerificationErrorReason.Implementation;
          let decoded = null;
          try {
            const jwt = JWT.decode(token, { json: true });
            if (jwt) {
              decoded = {
                ...jwt,
                subject: jwt.sub || null,
                assertion: jwt.assertion || null,
                expiration: jwt.exp || null
              };
            }
          } catch (err) {
            reason = VerificationErrorReason.Decode;
          }
          if (!decoded) {
            reason = VerificationErrorReason.Decode;
            decoded = { subject: null, assertion: null, expiration: null };
          }
          else if (err instanceof JWT.TokenExpiredError) {
            reason = VerificationErrorReason.Expired;
          }
          return reject(new TokenVerificationError(reason, expected, token, jwtPayload, err));
        }
        else if (expected.subject && jwtPayload.sub !== expected.subject) {
          return reject(new TokenVerificationError(VerificationErrorReason.Subject, expected, token, jwtPayload))
        }
        else if (expected.assertion && jwtPayload.assertion !== expected.assertion) {
          return reject(new TokenVerificationError(VerificationErrorReason.Assertion, expected, token, jwtPayload));
        }
        resolve({
          ...jwtPayload,
          subject: jwtPayload.sub || null,
          assertion: jwtPayload.assertion || null,
          expiration: jwtPayload.exp || null
        })
      })
    })
  }
}
