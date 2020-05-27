"use strict";

var Paging = require('../utilities/paging.js'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = require("chai").expect,
    mongoose = require('mongoose');

require('sinon-mongoose');

chai.use(sinonChai);

describe("Paging Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test page users', function (done) {
        var callback = sinon.fake();

        var countQuery = new mongoose.Query();
        sinon.stub(countQuery, 'count');
        countQuery.count.returns(Promise.resolve(10));

        var query = new mongoose.Query();
        sinon.stub(query, 'sort');
        sinon.stub(query, 'limit');
        sinon.stub(query, 'skip');
        sinon.stub(query, 'exec');

        let options = {limit: '1'};
        Paging.pageUsers(countQuery, query, options, callback);

        done();
    });
})