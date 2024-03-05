import { expect } from 'chai'
import { copyLineStyleAttrs, LineStyle, PluginResourceUrl } from '../../lib/entities/entities.global'

describe('PluginResourceUrl', function() {

  it('defines the protocol', function() {
    expect(PluginResourceUrl.pluginProtocol).to.equal('mage-plugin:')
  })

  it('creates a url from normal components', function() {

    const url = new PluginResourceUrl('@test/normal', 'nested/thing.er')

    expect(String(url)).to.equal(`${PluginResourceUrl.pluginProtocol}///@test/normal/nested/thing.er`)
    expect(url.pluginModuleName).to.equal('@test/normal')
    expect(url.pluginResourcePath).to.equal('nested/thing.er')
  })

  it('creates a url from only the plugin module name', function() {

    const url = new PluginResourceUrl('@bare/module')

    expect(String(url)).to.equal(`${PluginResourceUrl.pluginProtocol}///@bare/module`)
    expect(url.pluginModuleName).to.equal('@bare/module')
    expect(url.pluginResourcePath).to.be.undefined
  })

  it('handles a leading slash in the plugin module name', function() {

    const url = new PluginResourceUrl('/@test/leading')

    expect(String(url)).to.equal(`${PluginResourceUrl.pluginProtocol}///@test/leading`)
    expect(url.pluginModuleName).to.equal('@test/leading')
    expect(url.pluginResourcePath).to.be.undefined
  })

  it('handles multiple leading slashes in the plugin module name', function() {

    const url = new PluginResourceUrl('///@test/leading')

    expect(String(url)).to.equal(`${PluginResourceUrl.pluginProtocol}///@test/leading`)
    expect(url.pluginModuleName).to.equal('@test/leading')
    expect(url.pluginResourcePath).to.be.undefined
  })

  it('retains a trailing slash in the plugin module name', function() {

    const url = new PluginResourceUrl('@test/trailing/')

    expect(String(url)).to.equal(`${PluginResourceUrl.pluginProtocol}///@test/trailing/`)
    expect(url.pluginModuleName).to.equal('@test/trailing/')
    expect(url.pluginResourcePath).to.be.undefined
  })

  it('truncates multiple trailing slashes in the plugin module name', function() {

    const url = new PluginResourceUrl('@test/trailing///')

    expect(String(url)).to.equal(`${PluginResourceUrl.pluginProtocol}///@test/trailing/`)
    expect(url.pluginModuleName).to.equal('@test/trailing/')
    expect(url.pluginResourcePath).to.be.undefined
  })

  it('handles a leading slash in the plugin resource path', function() {

    const url = new PluginResourceUrl('leading', '/resource')

    expect(String(url)).to.equal(`${PluginResourceUrl.pluginProtocol}///leading/resource`)
    expect(url.pluginModuleName).to.equal('leading')
    expect(url.pluginResourcePath).to.equal('resource')
  })

  it('handles multiple leading slashes in the plugin resource path', function() {

    const url = new PluginResourceUrl('leading', '///resource')

    expect(String(url)).to.equal(`${PluginResourceUrl.pluginProtocol}///leading/resource`)
    expect(url.pluginModuleName).to.equal('leading')
    expect(url.pluginResourcePath).to.equal('resource')
  })

  it('retains a trailing slash in the plugin resource path', function() {

    const url = new PluginResourceUrl('leading', 'resource/')

    expect(String(url)).to.equal(`${PluginResourceUrl.pluginProtocol}///leading/resource/`)
    expect(url.pluginModuleName).to.equal('leading')
    expect(url.pluginResourcePath).to.equal('resource/')
  })

  it('truncates multiple trailing slashes in the plugin resource path', function() {

    const url = new PluginResourceUrl('leading', 'resource///')

    expect(String(url)).to.equal(`${PluginResourceUrl.pluginProtocol}///leading/resource/`)
    expect(url.pluginModuleName).to.equal('leading')
    expect(url.pluginResourcePath).to.equal('resource/')
  })
})

describe('copying line styles', function() {

  it('copies only line style entries', function() {

    const omitExtra = {
      extra1: 'omit',
      extra2: false,
      extra3: NaN,
      extra4: new Date()
    }
    const style: Required<LineStyle> = {
      fill: '#12ab34',
      fillOpacity: 0.5,
      stroke: '#11ee22',
      strokeOpacity: 0.75,
      strokeWidth: 2.2
    }
    const merged = { ...omitExtra, ...style }
    const copy = copyLineStyleAttrs(merged)

    expect(copy).to.deep.equal(style)
    expect(copy).not.to.have.keys('extra1', 'extra2', 'extra3', 'extra4')
  })
})