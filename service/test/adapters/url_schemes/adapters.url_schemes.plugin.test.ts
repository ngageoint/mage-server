import path from 'path'
import { expect } from 'chai'
import { URL } from 'url'
import { PluginUrlScheme } from '../../../lib/adapters/url_schemes/adapters.url_schemes.plugin'
import { UrlResolutionError } from '../../../lib/entities/entities.global'

describe('plugin url scheme', function() {

  const testNodeModules = path.resolve(__dirname, '..', '..', 'node_modules')

  it('resolves content relative to plugin base dir when main file is nested', async function() {

    const pluginName = '@adapters.url_schemes.plugin.test/plugin1'
    const scheme = new PluginUrlScheme([ pluginName ], [ testNodeModules ])
    const url = new URL(`mage-plugin:///${pluginName}/assets/some_content.txt`)
    const content = await scheme.resolveContent(url) as NodeJS.ReadableStream
    let read = await new Promise(function(this: { data: string[] }, resolve: (x: string) => any, reject: (x: any) => any) {
      content.setEncoding('utf8')
        .on('data', x => this.data.push(x))
        .on('end', () => resolve(this.data.join()))
    }.bind({ data: [] }))

    expect(read).to.equal('The content you want')
  })

  it('resolves content relative to dirname of the plugin index file', async function() {

    const pluginName = '@adapters.url_schemes.plugin.test/plugin2'
    const scheme = new PluginUrlScheme([ pluginName ], [ testNodeModules ])
    const url = new URL(`mage-plugin:///${pluginName}/assets/some_content.txt`)
    const content = await scheme.resolveContent(url) as NodeJS.ReadableStream
    let read = await new Promise(function(this: { data: string[] }, resolve: (x: string) => any, reject: (x: any) => any) {
      content.setEncoding('utf8')
        .on('data', x => this.data.push(x))
        .on('end', () => resolve(this.data.join()))
    }.bind({ data: [] }))

    expect(read).to.equal('I love you')
  })

  it('resolves path to main file when url is the base module name without a trailing slash', function() {

    const pluginName = '@adapters.url_schemes.plugin.test/plugin2'
    const scheme = new PluginUrlScheme([ pluginName ], [ testNodeModules ])
    const url = new URL(`mage-plugin:///${pluginName}`)
    const localPath = scheme.localPathOfUrl(url)

    expect(localPath).to.equal(path.resolve(testNodeModules, pluginName, 'index.js'))
  })

  it('resolves path to a directory path when the url has a trailing slash', function() {

    const pluginName = '@adapters.url_schemes.plugin.test/plugin2'
    const scheme = new PluginUrlScheme([ pluginName ], [ testNodeModules ])
    const url = new URL(`mage-plugin:///${pluginName}/`)
    const localPath = scheme.localPathOfUrl(url)

    expect(localPath).to.equal(path.resolve(testNodeModules, pluginName))
  })

  it('resolves path to base directory of package when the url has a trailing slash', function() {

    const pluginName = '@adapters.url_schemes.plugin.test/plugin1'
    const scheme = new PluginUrlScheme([ pluginName ], [ testNodeModules ])
    const url = new URL(`mage-plugin:///${pluginName}/`)
    const localPath = scheme.localPathOfUrl(url)

    expect(localPath).to.equal(path.resolve(testNodeModules, pluginName))
  })

  it('does not throw when resolving the path of an absent module', function() {

    const pluginName = '@adapters.url_schemes.plugin.test/nope'
    const scheme = new PluginUrlScheme([ pluginName ], [ testNodeModules ])
    const url = new URL(`mage-plugin:///${pluginName}`)
    const err = scheme.localPathOfUrl(url) as UrlResolutionError

    expect(err).to.be.instanceOf(UrlResolutionError)
    expect(String(err.sourceUrl)).to.equal(String(url))
  })

  xit('test module that defines exports in package.json', function() {
    expect.fail('todo: see https://nodejs.org/dist/latest-v14.x/docs/api/packages.html#packages_package_entry_points')
  })
})