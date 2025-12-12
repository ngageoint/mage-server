import uniqid from 'uniqid'
import { ExoObservationMod, ExoObservationPropertiesMod } from '../../../lib/app.api/observations/app.api.observations'
import { exoObservationModFromJson } from '../../../lib/adapters/observations/adapters.observations.dto.ecma404-json'
import { expect } from 'chai'
import { JsonObject } from '../../../lib/entities/entities.json_types'
import { MageError, InvalidInputError, ErrInvalidInput } from '../../../lib/app.api/app.api.errors'
import _ from 'lodash'

describe('observation json dto transform', function() {

  let modJson: JsonObject
  let modPropertiesJson: JsonObject

  beforeEach(function() {

    modPropertiesJson = {
      timestamp: new Date(Date.now() - 113355).toISOString(),
      provider: 'gps',
      accuracy: 50,
      delta: 12000,
      forms: [
        {
          id: 'entry1',
          formId: 1,
          field1: 'al7r45',
          field2: [
            {
              contentType: 'image/jpeg',
              size: 785634,
              name: 'car.jpg'
            }
          ],
          field3: new Date(Date.now() - 123456).toISOString()
        }
      ],
    }
    modJson = {
      id: uniqid(),
      type: 'Feature',
      bbox: [ 11, 22, 33, 12, 23, 33 ],
      geometry: {
        type: 'Point',
        coordinates: [ 23, 45, 67 ],
        bbox: [ 11, 22, 33, 12, 23, 33 ]
      },
      properties: modPropertiesJson
    }
  })

  describe('observation mod transform', function() {

    it('preserves all valid observation mod properties', function() {

      const expectedMod: Required<ExoObservationMod> = {
        ...modJson as any,
        properties: {
          ...modJson.properties as any,
          timestamp: new Date(modPropertiesJson.timestamp as any)
        }
      }
      const mod = exoObservationModFromJson(modJson as any)

      expect(mod).to.not.equal(modJson)
      expect(mod).to.deep.equal(expectedMod)
    })

    it('adds geojson type property if not present', function() {

      delete modJson.type
      let mod = exoObservationModFromJson(modJson) as ExoObservationMod

      expect(mod.type).to.equal('Feature')

      modJson.type = undefined
      mod = exoObservationModFromJson(modJson) as ExoObservationMod

      expect(mod.type).to.equal('Feature')
    })

    describe('validation', () => {

      it('fails if the json is not an object hash', function() {
        [
          [ true, 'boolean' ],
          [ 0, 'number' ],
          [ 'invalid', 'string' ],
          [ [], 'array' ],
          [ null, 'null' ],
        ].forEach(testCase => {
          const invalid = exoObservationModFromJson(testCase[0]) as InvalidInputError
          expect(invalid).to.be.instanceOf(MageError, testCase[1] as string)
          expect(invalid.code).to.equal(ErrInvalidInput, testCase[1] as string)
          expect(invalid.data).to.deep.equal([], testCase[1] as string)
        })
      })

      it('fails if id is not a string', function() {
        [
          [ true, 'boolean' ],
          [ 0, 'number' ],
          [ {}, 'object' ],
          [ [], 'array' ],
          [ null, 'null' ],
        ].forEach(testCase => {
          const invalidJson = { ...modJson, id: testCase[0] }
          const invalid = exoObservationModFromJson(invalidJson) as InvalidInputError
          expect(invalid).to.be.instanceOf(MageError, testCase[1] as string)
          expect(invalid.code).to.equal(ErrInvalidInput, testCase[1] as string)
          expect(invalid.data).to.deep.equal([[ 'id' ]], testCase[1] as string)
        })
      })

      it('fails if geojson type is not feature', function() {
        [
          [ true, 'boolean' ],
          [ 0, 'number' ],
          [ {}, 'object' ],
          [ [], 'array' ],
          [ null, 'null' ],
          [ 'FeatureCollection', 'wrong type' ],
          [ 'feature', 'case-sensitive' ],
        ].forEach(testCase => {
          const invalidJson = { ...modJson, type: testCase[0] }
          const invalid = exoObservationModFromJson(invalidJson) as InvalidInputError
          expect(invalid).to.be.instanceOf(MageError, testCase[1] as string)
          expect(invalid.code).to.equal(ErrInvalidInput, testCase[1] as string)
          expect(invalid.data).to.deep.equal([[ 'type' ]], testCase[1] as string)
        })
      })

      it('fails if bbox is present and not an array', function() {
        [
          [ true, 'boolean' ],
          [ 0, 'number' ],
          [ {}, 'object' ],
          [ null, 'null' ],
          [ 'wut', 'string' ],
        ].forEach(testCase => {
          const invalidJson = { ...modJson, bbox: testCase[0] }
          const invalid = exoObservationModFromJson(invalidJson) as InvalidInputError
          expect(invalid).to.be.instanceOf(MageError, testCase[1] as string)
          expect(invalid.code).to.equal(ErrInvalidInput, testCase[1] as string)
          expect(invalid.data).to.deep.equal([[ 'bbox' ]], testCase[1] as string)
        })

        const valid = exoObservationModFromJson(_.omit(modJson, 'bbox')) as ExoObservationMod
        expect(valid).to.not.be.instanceOf(Error)
      })

      it('fails if geometry is not an object hash', function() {
        [
          [ true, 'boolean' ],
          [ 0, 'number' ],
          [ [], 'array' ],
          [ null, 'null' ],
          [ 'wut', 'string' ],
        ].forEach(testCase => {
          const invalidJson = { ...modJson, geometry: testCase[0] }
          const invalid = exoObservationModFromJson(invalidJson) as InvalidInputError
          expect(invalid).to.be.instanceOf(MageError, testCase[1] as string)
          expect(invalid.code).to.equal(ErrInvalidInput, testCase[1] as string)
          expect(invalid.data).to.deep.equal([[ 'geometry' ]], testCase[1] as string)
        })
      })

      it('fails if properties is not an object hash', function() {
        [
          [ true, 'boolean' ],
          [ 0, 'number' ],
          [ [], 'array' ],
          [ null, 'null' ],
          [ 'wut', 'string' ],
        ].forEach(testCase => {
          const invalidJson = { ...modJson, properties: testCase[0] }
          const invalid = exoObservationModFromJson(invalidJson) as InvalidInputError
          expect(invalid).to.be.instanceOf(MageError, testCase[1] as string)
          expect(invalid.code).to.equal(ErrInvalidInput, testCase[1] as string)
          expect(invalid.data).to.deep.equal([[ 'properties' ]], testCase[1] as string)
        })
      })

      it('fails if the timestamp is not an iso-8601 date string', function() {
        [
          [ true, 'boolean' ],
          [ 0, 'number' ],
          [ [], 'array' ],
          [ {}, 'object' ],
          [ null, 'null' ],
          [ 'wut', 'string' ],
          [ '31 Oct', 'not iso' ]
        ].forEach(testCase => {
          const invalidJson = { ...modJson, properties: { ...modPropertiesJson, timestamp: testCase[0] }}
          const invalid = exoObservationModFromJson(invalidJson) as InvalidInputError
          expect(invalid).to.be.instanceOf(MageError, testCase[1] as string)
          expect(invalid.code).to.equal(ErrInvalidInput, testCase[1] as string)
          expect(invalid.data).to.deep.equal([[ 'properties', 'timestamp' ]], testCase[1] as string)
        })
      })
    })
  })
})