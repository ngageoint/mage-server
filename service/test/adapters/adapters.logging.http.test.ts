import { expect } from 'chai';
import express from 'express';
import sinon from 'sinon';
import supertest from 'supertest';
import { httpRequestLogging } from '../../lib/adapters/adapters.logging.http';
import { Logger } from '../../lib/entities/entities.logging';

describe('http request logging middleware', () => {

  let app: express.Application;
  let logger: Logger & { info: sinon.SinonSpy, warn: sinon.SinonSpy, debug: sinon.SinonSpy, error: sinon.SinonSpy };

  beforeEach(() => {
    logger = {
      debug: sinon.spy(),
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy()
    };
    app = express();
    app.use(httpRequestLogging(logger));
    // simulate passport populating req.user during route handling
    app.use('/api/authed', (req, res) => {
      req.user = { id: 'user123', username: 'admin' } as any;
      res.json({ ok: true });
    });
    app.use((req, res) => res.sendStatus(200));
  });

  it('logs mutating api requests at info with the acting user', async () => {
    await supertest(app).post('/api/authed/settings/map').expect(200);

    expect(logger.info.calledOnce).to.be.true;
    const [message, meta] = logger.info.firstCall.args;
    expect(message).to.equal('POST /api/authed/settings/map');
    expect(meta.user).to.equal('admin');
    expect(meta.userId).to.equal('user123');
    expect(meta.status).to.equal(200);
    expect(meta.duration).to.be.a('number');
    expect(logger.debug.called).to.be.false;
  });

  it('logs get requests at debug', async () => {
    await supertest(app).get('/api/authed/settings/map').expect(200);

    expect(logger.debug.calledOnce).to.be.true;
    expect(logger.info.called).to.be.false;
    const [message, meta] = logger.debug.firstCall.args;
    expect(message).to.equal('GET /api/authed/settings/map');
    expect(meta.user).to.equal('admin');
  });

  it('does not log requests outside api and auth paths', async () => {
    await supertest(app).get('/admin/main.js').expect(200);
    await supertest(app).post('/apiary').expect(200);

    expect(logger.info.called).to.be.false;
    expect(logger.debug.called).to.be.false;
  });

  it('logs auth path requests', async () => {
    await supertest(app).post('/auth/local/signin').expect(200);

    expect(logger.info.calledOnce).to.be.true;
    const [message, meta] = logger.info.firstCall.args;
    expect(message).to.equal('POST /auth/local/signin');
    expect(meta.user).to.equal('anonymous');
  });

  it('redacts access_token query parameters from the logged url', async () => {
    await supertest(app).post('/api/authed/attachment?access_token=supersecret&size=2').expect(200);

    const [message] = logger.info.firstCall.args;
    expect(message).to.not.contain('supersecret');
    expect(message).to.equal('POST /api/authed/attachment?access_token=[REDACTED]&size=2');
  });

  it('logs anonymous when no user is on the request', async () => {
    await supertest(app).post('/api/open').expect(200);

    const [, meta] = logger.info.firstCall.args;
    expect(meta.user).to.equal('anonymous');
    expect(meta.userId).to.be.undefined;
  });
});
