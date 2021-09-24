import { expect } from 'chai'
import { PluginResourceUrl } from '../../lib/entities/entities.global'

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