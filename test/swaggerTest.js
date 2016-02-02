var request = require('supertest')
  , app = require('../express');

describe("documentation tests", function() {

  it("should get swagger document", function(done) {
    request(app)
      .get('/api/api-docs')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(done);
  });

});
