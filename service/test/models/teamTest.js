"use strict";

const sinon = require('sinon')
  , expect = require('chai').expect
  , mongoose = require('mongoose')
  , Team = require('../../lib/models/team');

describe("team model", function () {

  let query;

  beforeEach(function () {
    query = null;
    sinon.stub(mongoose.Query.prototype, 'exec').callsFake(function () {
      query = this;
      return Promise.resolve(null);
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  function getTeamById(id, options) {
    return new Promise((resolve, reject) => {
      Team.getTeamById(id, options, (err, team) => err ? reject(err) : resolve(team));
    });
  }

  describe('getTeamById', function () {

    it('finds the team by id and populates users', async function () {
      const teamId = new mongoose.Types.ObjectId();

      await getTeamById(teamId, {});

      expect(query.op).to.equal('findOne');
      expect(query.getFilter()).to.deep.equal({ _id: teamId });
      expect(query.mongooseOptions().populate).to.have.property('userIds');
    });

    it('does not populate users when populate is false', async function () {
      const teamId = new mongoose.Types.ObjectId();

      await getTeamById(teamId, { populate: false });

      expect(query.getFilter()).to.deep.equal({ _id: teamId });
      expect(query.mongooseOptions().populate).to.be.undefined;
    });

    it('finds the team by id when the user is a member or has an acl role with the permission', async function () {
      const teamId = new mongoose.Types.ObjectId();
      const userId = new mongoose.Types.ObjectId();

      await getTeamById(teamId, { access: { user: { _id: userId }, permission: 'update' } });

      expect(query.getFilter()).to.deep.equal({
        _id: teamId,
        $or: [
          { userIds: { $in: [userId] } },
          { ['acl.' + userId.toString()]: 'OWNER' },
          { ['acl.' + userId.toString()]: 'MANAGER' }
        ]
      });
    });
  });
});
