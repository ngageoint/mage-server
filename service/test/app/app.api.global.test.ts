import { expect } from 'chai';
import sinon from 'sinon';
import { withPermission, logPermissionDenials } from '../../lib/app.api/app.api.global';
import { permissionDenied } from '../../lib/app.api/app.api.errors';
import { Logger, NoopLogger } from '../../lib/entities/entities.logging';

describe('withPermission denial logging', () => {

  let logger: Logger & { warn: sinon.SinonSpy };

  beforeEach(() => {
    logger = {
      debug: sinon.spy(),
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy()
    };
    logPermissionDenials(logger);
  });

  afterEach(() => {
    logPermissionDenials(NoopLogger);
  });

  it('logs a warning when the permission check fails', async () => {
    const denied = permissionDenied('UPDATE_SETTINGS', 'basicUser', 'map settings');
    const op = sinon.fake.resolves('should not happen');

    const res = await withPermission(Promise.resolve(denied), op);

    expect(res.error).to.equal(denied);
    expect(op.called).to.be.false;
    expect(logger.warn.calledOnce).to.be.true;
    const [message, meta] = logger.warn.firstCall.args;
    expect(message).to.equal('permission denied');
    expect(meta).to.deep.equal({ subject: 'basicUser', permission: 'UPDATE_SETTINGS', object: 'map settings' });
  });

  it('logs nothing when the permission check succeeds', async () => {
    const res = await withPermission(Promise.resolve(null), async () => 'ok');

    expect(res.success).to.equal('ok');
    expect(logger.warn.called).to.be.false;
  });
});
