var request = require('supertest')
  , sinon = require('sinon')
  , MockToken = require('../mockToken')
  , app = require('../../express')
  , mongoose = require('mongoose');

require('../../models/token');
var TokenModel = mongoose.model('Token');

require('../../models/user');
var UserModel = mongoose.model('User');

require('sinon-mongoose');

describe("user delete tests", function() {

  afterEach(function() {
    sinon.restore();
  });

  var userId = mongoose.Types.ObjectId();
  function mockTokenWithPermission(permission) {
    sinon.mock(TokenModel)
      .expects('findOne')
      .withArgs({token: "12345"})
      .chain('populate', 'userId')
      .chain('exec')
      .yields(null, MockToken(userId, [permission]));
  }

  it('should delete user by id', function(done) {
    mockTokenWithPermission('DELETE_USER');

    var id = mongoose.Types.ObjectId();
    var mockUser = new UserModel({
      _id: id,
      username: 'test',
      displayName: 'test',
      active: true
    });

    sinon.mock(UserModel)
      .expects('findById')
      .chain('exec')
      .yields(null, mockUser);

    sinon.mock(mockUser)
      .expects('remove')
      .yields(null, mockUser);

    request(app)
      .delete('/api/users/' + id.toString())
      .set('Accept', 'application/json')
      .set('Authorization', 'Bearer 12345')
      .expect(204)
      .end(done);
  });

});
