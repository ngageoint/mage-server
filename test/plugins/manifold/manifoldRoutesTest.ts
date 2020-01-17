import { expect } from 'chai';
import { mock, reset, instance, when } from 'ts-mockito';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { ManifoldController, loadApi } from '../../../plugins/mage-manifold';
import { SourceRepository, AdapterRepository } from '../../../plugins/mage-manifold/repositories';
import { SourceDescriptor, SourceDescriptorEntity, SourceDescriptorModel } from '../../../plugins/mage-manifold/models';
import mongoose from 'mongoose';
import { parseEntity } from '../../utils';
const log = require('../../../logger');


describe.only('manifold routes', function() {

  const adapterRepoMock = mock(AdapterRepository);
  const sourceRepoMock = mock(SourceRepository);
  const adapterRepo = instance(adapterRepoMock);
  const sourceRepo = instance(sourceRepoMock);
  const app = express();
  app.use(express.json());
  const injection: ManifoldController.Injection = {
    adapterRepo,
    sourceRepo
  };
  const enforcer = loadApi(injection);
  app.use(enforcer.middleware());
  app.use((err: any, req: Request, res: Response, next: NextFunction): any => {
    if (err) {
      log.error(err);
      next(err);
    }
  });

  beforeEach(function() {
    reset(adapterRepoMock);
    reset(sourceRepoMock);
  });

  describe('path /sources', function() {

    describe('GET', function() {

      it('returns one source', async function() {

        const sources = [
          {
            id: mongoose.Types.ObjectId().toHexString(),
            adapterId: 'adapter123',
            title: 'Source 123',
            description: 'A test source',
            isReadable: true,
            isWritable: false,
            url: 'http://test.com/source123'
          }
        ]
        const sourceEntities = sources.map(x => parseEntity(SourceDescriptorModel, x));

        when(sourceRepoMock.readAll()).thenResolve(sourceEntities);

        let res = await request(app).get('/sources');

        expect(res.status).to.equal(200);
        expect(res.type).to.match(/^application\/json/);
        expect(res.body).to.deep.equal(sources);
      });

      it('returns multiple sources', async function() {

      });
    });
  });

});