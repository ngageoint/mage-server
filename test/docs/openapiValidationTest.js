const path = require('path');
const Enforcer = require('openapi-enforcer');
const expect = require('chai').expect;

describe('mage openapi document', function() {

  it('is valid', async function() {

    const openapiDocPath = path.resolve(__dirname, '..', '..', 'docs', 'openapi.yaml');
    const { error, warning } = await Enforcer(openapiDocPath, { fullResult: true });

    if (error) {
      console.log(error.message());
      console.log(`\n${error.count} validation errors\n`);
    }

    if (warning) {
      console.log(warning);
      console.log(`\n${warning.count} validation warnings\n`);
    }

    expect(error).to.be.undefined;
  });
});