import { expect } from 'chai';
import { AppResponse } from '../../../lib/app.api/app.api.global';
import { beforeEach } from 'mocha';
import express from 'express';
import { WebAppRequestFactory } from '../../../lib/adapters/adapters.controllers.web';
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute';
import supertest from 'supertest';
import { SystemInfo } from '../../../lib/entities/systemInfo/entities.systemInfo';
import { SystemInfoAppLayer } from '../../../lib/app.api/systemInfo/app.api.systemInfo';
import { SystemInfoRoutes } from '../../../lib/adapters/systemInfo/adapters.systemInfo.controllers.web';

describe('SystemInfo web controller', () => {
  const root = '/api';

  type AppRequestFactoryHandle = {
    createRequest: WebAppRequestFactory;
  };

  let client: supertest.SuperTest<supertest.Test>;
  let appLayer: SubstituteOf<SystemInfoAppLayer>;
  let appReqFactory: SubstituteOf<AppRequestFactoryHandle>;

  beforeEach(function() {
    appLayer = Sub.for<SystemInfoAppLayer>();
    appReqFactory = Sub.for<AppRequestFactoryHandle>();
    const endpoint = express();
    endpoint.use(function lookupUser(
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) {
      req.testUser = req.headers['user'] as string;
      next();
    });
    const controller = SystemInfoRoutes(appLayer, appReqFactory.createRequest);
    endpoint.use(root, controller);
    client = supertest(endpoint);
  });

  describe('GET /api', () => {
    it('should return configuration', async () => {
      const expected: SystemInfo = {
        environment: {
          nodeVersion: 'test',
          monogdbVersion: 'test'
        },
        disclaimer: {},
        contactInfo: {},
        version: {
          major: 1,
          minor: 2,
          micro: 3
        }
      };
      appLayer
        .readSystemInfo(Arg.any())
        .returns(Promise.resolve(AppResponse.success(expected)));
      const response = await client.get(`${root}`);
      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(expected);
    });
  });
});
