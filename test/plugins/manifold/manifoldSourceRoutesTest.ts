import { expect } from 'chai'
import { mock, reset, instance, when, deepEqual } from 'ts-mockito'
import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'
import { SourceRepository, AdapterRepository } from '../../../plugins/mage-manifold/repositories'
import { SourceDescriptor, SourceDescriptorEntity, SourceDescriptorModel } from '../../../plugins/mage-manifold/models'
import mongoose from 'mongoose'
import { parseEntity } from '../../utils'
import { ManifoldDescriptor, ManifoldService } from '../../../plugins/mage-manifold/services'
const log = require('../../../logger')


describe.only('manifold source routes', function() {

  describe('path /{sourceId}/collections', function() {

  })

  describe('path /{sourceId}/collections/{collectionId}', function() {

  })

  describe('path /{sourceId}/collections/{collectionId}/items', function() {

  })

  describe('path /{sourceId}/collections/{collectoinId}/items/{featureId}', function() {

  })
})
