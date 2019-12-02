import { describe, it, beforeEach } from 'mocha';
import request from 'supertest';
import { expect } from 'chai';
import express from 'express';
import initializePluginsRoutes from '../../../routes/plugins';
import { contentTypeOf } from '../../utils';
import mageApp from '../../../express'
import { PluginService } from '../../../api/plugins';

describe('plugins routes', function() {

  let app: express.Application;

  beforeEach(async function() {
    const app = express();
    const pluginService = {} as PluginService
    const routes = await initializePluginsRoutes(app, {});
  });

  describe('/plugins path', function() {

    describe('GET', function() {

      it('returns an array of plugin descriptors', async function() {

        const res: request.Response = await request(app).get('/plugins');

        expect(res.status).to.equal(200);
        expect(contentTypeOf(res)).to.match(/application\/json/);
        const body = res.body as object[];
        expect(body).to.be('array');
        expect(body).to.deep.equal([
          {
            pluginId: 'dopey',
            displayName: 'Dopey',
            summary: 'Not the sharpest',
            enabled: true,
          },
          {
            pluginId: 'sneezy',
            displayName: 'Sneezy',
            summary: 'Cover your mouth',
            enabled: true,
          }
        ])
      });
    })
  });


});