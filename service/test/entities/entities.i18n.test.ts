import { LanguageTag, parseAcceptLanguageHeader } from '../../lib/entities/entities.i18n'
import { expect } from 'chai'

describe('internationalization', function() {

  describe('parsing rfc-7231 accept-language header strings', function() {

    it('parses one language range', function() {

      const tags = parseAcceptLanguageHeader('en-US')

      expect(tags.length).to.equal(1)
      expect(tags[0].toString()).to.equal(new LanguageTag('en-us').toString())
    })

    it('parses several language ranges', function() {

      const tags = parseAcceptLanguageHeader('es-419, es-*, en-US')

      expect(tags.length).to.equal(3)
      expect(tags.map(x => x.toString())).to.have.ordered.members([
        new LanguageTag('es-419').toString(),
        new LanguageTag('es-*').toString(),
        new LanguageTag('en-us').toString()
      ])
    })

    it('parses ranges with quality values', function() {

      const tags = parseAcceptLanguageHeader('es-419;q=1.0, es-*, en-US;q=0.6')

      expect(tags.length).to.equal(3)
      expect(tags.map(x => x.toString())).to.have.ordered.members([
        new LanguageTag('es-419').toString(),
        new LanguageTag('es-*').toString(),
        new LanguageTag('en-us').toString()
      ])
    })

    it('parses ranges in descending order of quality values', function() {

      const tags = parseAcceptLanguageHeader('es-419;q=0.5, es-*;q=0.4, en-US;q=0.6')

      expect(tags.length).to.equal(3)
      expect(tags.map(x => x.toString())).to.have.ordered.members([
        new LanguageTag('en-us').toString(),
        new LanguageTag('es-419').toString(),
        new LanguageTag('es-*').toString(),
      ])
    })

    it('assumes quality 1.0 when quality value is absent', function() {

      const tags = parseAcceptLanguageHeader('es-419;q=0.5, en-GB, es-*;q=0.4, en-US')

      expect(tags.length).to.equal(4)
      expect(tags.map(x => x.toString())).to.have.ordered.members([
        new LanguageTag('en-gb').toString(),
        new LanguageTag('en-us').toString(),
        new LanguageTag('es-419').toString(),
        new LanguageTag('es-*').toString(),
      ])
    })

    it('parses the example from https://httpwg.org/specs/rfc7231.html#header.accept-language', function() {

      const tags = parseAcceptLanguageHeader('da, en-gb;q=0.8, en;q=0.7')

      expect(tags.length).to.equal(3)
      expect(tags.map(x => x.toString())).to.have.ordered.members([
        new LanguageTag('da').toString(),
        new LanguageTag('en-gb').toString(),
        new LanguageTag('en').toString(),
      ])
    })

    it('disregards white space between language ranges', function() {

      const tags = parseAcceptLanguageHeader('\tes-419;q=0.5,es-*;q=0.4  , en-US;q=0.6 ')

      expect(tags.length).to.equal(3)
      expect(tags.map(x => x.toString())).to.have.ordered.members([
        new LanguageTag('en-us').toString(),
        new LanguageTag('es-419').toString(),
        new LanguageTag('es-*').toString(),
      ])
    })

    it('returns an empty array for empty inputs', function() {

      let tags = parseAcceptLanguageHeader('')

      expect(tags).to.be.an('array')
      expect(tags).to.be.empty

      tags = parseAcceptLanguageHeader(' \t  ')

      expect(tags).to.be.an('array')
      expect(tags).to.be.empty

      tags = parseAcceptLanguageHeader(', , ')

      expect(tags).to.be.an('array')
      expect(tags).to.be.empty

      tags = parseAcceptLanguageHeader(null)

      expect(tags).to.be.an('array')
      expect(tags).to.be.empty

      tags = parseAcceptLanguageHeader(void(0))

      expect(tags).to.be.an('array')
      expect(tags).to.be.empty
    })

  })
})