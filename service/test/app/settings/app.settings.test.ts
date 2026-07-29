import { expect } from 'chai';
import sinon from 'sinon';
import { FetchMapSettings, UpdateMapSettings } from '../../../lib/app.impl/settings/app.impl.settings';
import * as api from '../../../lib/app.api/settings/app.api.settings';
import { AppRequest } from '../../../lib/app.api/app.api.global';
import { ErrPermissionDenied, permissionDenied } from '../../../lib/app.api/app.api.errors';
import { Logger } from '../../../lib/entities/entities.logging';
import {
  MapSettings,
  MobileSearchType,
  SettingRepository,
  WebSearchType
} from '../../../lib/entities/settings/entities.settings';

const mapSettings: MapSettings = {
  webSearchType: WebSearchType.NOMINATIM,
  webNominatimUrl: 'https://nominatim.test',
  mobileSearchType: MobileSearchType.NONE,
  mobileNominatimUrl: null
};

function requestBy<T extends object>(username: string, params?: T): AppRequest & T {
  return {
    ...(params || {} as T),
    context: {
      requestToken: Symbol(),
      requestingPrincipal: () => ({ id: 'user1', username }),
      locale() { return null; }
    }
  };
}

describe('settings app layer', () => {

  let settingRepo: SettingRepository;
  let permissions: api.SettingsPermissionService;
  let logger: Logger & { info: sinon.SinonSpy, warn: sinon.SinonSpy, debug: sinon.SinonSpy, error: sinon.SinonSpy };

  beforeEach(() => {
    settingRepo = {
      getMapSettings: sinon.fake.resolves(mapSettings),
      updateMapSettings: sinon.fake.resolves(mapSettings)
    };
    permissions = {
      ensureFetchMapSettingsPermissionFor: sinon.fake.resolves(null),
      ensureUpdateMapSettingsPermissionFor: sinon.fake.resolves(null)
    };
    logger = {
      debug: sinon.spy(),
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy()
    };
  });

  describe('UpdateMapSettings', () => {

    it('updates the settings and logs the admin action', async () => {
      const updateMapSettings = UpdateMapSettings(settingRepo, permissions, logger);
      const req = requestBy('admin', { settings: mapSettings });
      const res = await updateMapSettings(req);

      expect(res.error).to.be.null;
      expect(res.success).to.eql(mapSettings);
      expect(logger.info.calledOnce).to.be.true;
      const [message, meta] = logger.info.firstCall.args;
      expect(message).to.equal('updated map settings');
      expect(meta).to.eql({
        user: 'admin',
        webSearchType: WebSearchType.NOMINATIM,
        mobileSearchType: MobileSearchType.NONE
      });
      expect(logger.warn.called).to.be.false;
    });

    it('logs a warning when permission is denied', async () => {
      permissions.ensureUpdateMapSettingsPermissionFor =
        sinon.fake.resolves(permissionDenied('MAP_SETTINGS_UPDATE', 'nonAdmin'));
      const updateMapSettings = UpdateMapSettings(settingRepo, permissions, logger);
      const req = requestBy('nonAdmin', { settings: mapSettings });
      const res = await updateMapSettings(req);

      expect(res.success).to.be.null;
      expect(res.error?.code).to.equal(ErrPermissionDenied);
      expect(logger.info.called).to.be.false;
      expect(logger.warn.calledOnce).to.be.true;
      const [message, meta] = logger.warn.firstCall.args;
      expect(message).to.equal('map settings update failed');
      expect(meta).to.eql({ user: 'nonAdmin', error: res.error?.message });
    });

    it('works without an injected logger', async () => {
      const updateMapSettings = UpdateMapSettings(settingRepo, permissions);
      const res = await updateMapSettings(requestBy('admin', { settings: mapSettings }));
      expect(res.success).to.eql(mapSettings);
    });
  });

  describe('FetchMapSettings', () => {

    it('fetches the settings and logs at debug level', async () => {
      const getMapSettings = FetchMapSettings(settingRepo, permissions, logger);
      const res = await getMapSettings(requestBy('admin'));

      expect(res.error).to.be.null;
      expect(res.success).to.eql(mapSettings);
      expect(logger.debug.calledOnce).to.be.true;
      expect(logger.debug.firstCall.args).to.eql(['fetching map settings', { user: 'admin' }]);
    });
  });
});
