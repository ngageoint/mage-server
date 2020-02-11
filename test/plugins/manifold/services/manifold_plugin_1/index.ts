import { ManifoldPlugin, ManifoldAdapter } from "../../../../../plugins/mage-manifold/adapters"


class TestManifoldPlugin implements ManifoldPlugin {

  async createAdapter(): Promise<ManifoldAdapter> {
    throw new Error('mock me')
  }
}

const plugin = new TestManifoldPlugin()
console.log(plugin)
export = plugin
