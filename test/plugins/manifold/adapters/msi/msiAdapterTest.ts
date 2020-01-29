
import { expect } from 'chai'
import NgaMsi from '../../../../../plugins/mage-manifold/adapters/msi'
import { SourceDescriptor } from '../../../../../plugins/mage-manifold/models'



describe.only('msi adapter', function() {

  const source1: SourceDescriptor = {
    adapter: 'abc123',
    title: 'Maritime Safety Information',
    description: 'Production MSI server',
    url: 'https://msi1.test.net/api',
    isReadable: true,
    isWritable: false,
  }
  const source2: SourceDescriptor = {
    adapter: 'xyz789',
    title: 'Maritime Safety Informatoin',
    description: '',
    isReadable: true,
    isWritable: false,
    url: 'https://msi2.test.net/api'
  }

  const msi = new NgaMsi.MsiAdapter()

  describe('asam collection', function() {

      it('has an asam collection', async function() {

        const conn = await msi.connectTo(source1)
        const collections = await conn.getCollections()
        const asamCollection = collections.get('asam')

        expect(asamCollection).to.deep.equal({
          id: 'asam',
          links: [],
          title: 'Anti-Shipping Activity Messages (ASAM)',
          description:
            'ASAM records include locations and accounts of hostile acts ' +
            'against ships and mariners.  This data can help vessels ' +
            'recognize and avoid potential hostile activity at sea.'
        })
      })

      it('fetches asam items for the last week', async function() {

        const conn = await msi.connectTo(source1)
        const items = await conn.getItemsInCollection('asam')
      })
  })
})