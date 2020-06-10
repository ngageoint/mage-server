"use strict";

var Paging = require('../utilities/paging.js'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = require("chai").expect,
    mongoose = require('mongoose'),
    User = require('../models/user.js'),
    Device = require('../models/device.js');

require('sinon-mongoose');

chai.use(sinonChai);

describe("Paging Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test page users', function (done) {
        var countQuery = new mongoose.Query();
        sinon.stub(countQuery, 'count');
        countQuery.count.returns(Promise.resolve(1));

        let user0 = {
            _id: '0'
        };

        var query = new mongoose.Query();
        sinon.stub(query, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves([user0])
        });

        var callback = function (error, users, pageInfo) {
            expect(error).to.be.null;
            expect(users).to.not.be.null;
            expect(users.length).to.equal(1);
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.limit).to.equal(10);
            expect(pageInfo.size).to.equal(1);
            expect(pageInfo.links).to.not.be.null;
            expect(pageInfo.links.next).to.be.null;
            done();
        };
        let spy = sinon.spy(callback);
        let options = { limit: '10' };
        Paging.pageUsers(countQuery, query, options, spy);
    });

    it('Test page to end', function (done) {
        var countQuery = new mongoose.Query();
        sinon.stub(countQuery, 'count');
        countQuery.count.returns(Promise.resolve(2));

        let user0 = {
            _id: '0'
        };
        let user1 = {
            _id: '1'
        };

        var query = new mongoose.Query();
        sinon.stub(query, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves([user0])
        });

        var query1 = new mongoose.Query();
        sinon.stub(query1, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves([user1])
        });

        var callback = function (error, users, pageInfo) {
            expect(error).to.be.null;
            expect(users).to.not.be.null;
            expect(users.length).to.equal(1);
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.limit).to.equal(1);
            expect(pageInfo.size).to.equal(1);
            expect(pageInfo.links).to.not.be.null;
            expect(pageInfo.links.next).to.not.be.null;

            let spy = sinon.spy(callback1);
            let options = { limit: '1', start: pageInfo.links.next };
            Paging.pageUsers(countQuery, query1, options, spy);
        };
        var callback1 = function (error, users, pageInfo) {
            expect(error).to.be.null;
            expect(users).to.not.be.null;
            expect(users.length).to.equal(1);
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.limit).to.equal(1);
            expect(pageInfo.size).to.equal(1);
            expect(pageInfo.links).to.not.be.null;
            expect(pageInfo.links.next).to.be.null;
            expect(pageInfo.links.prev).to.not.be.null;
            done();
        };

        let spy = sinon.spy(callback);
        let options = { limit: '1' };
        Paging.pageUsers(countQuery, query, options, spy);
    });

    it('Test page no results', function (done) {
        var countQuery = new mongoose.Query();
        sinon.stub(countQuery, 'count');
        countQuery.count.returns(Promise.resolve(0));


        var query = new mongoose.Query();
        sinon.stub(query, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves([])
        });

        var callback = function (error, users, pageInfo) {
            expect(error).to.be.null;
            expect(users).to.not.be.null;
            expect(users.length).to.equal(0);
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.limit).to.equal(10);
            expect(pageInfo.size).to.equal(0);
            expect(pageInfo.links).to.not.be.null;
            expect(pageInfo.links.next).to.be.null;
            expect(pageInfo.links.prev).to.be.null;
            done();
        };
        let spy = sinon.spy(callback);
        let options = { limit: '10' };
        Paging.pageUsers(countQuery, query, options, spy);
    });

    it('Test page devices', function (done) {
        var countQuery = new mongoose.Query();
        sinon.stub(countQuery, 'count');
        countQuery.count.returns(Promise.resolve(10));

        let device0 = {
            _id: '0'
        };

        var query = new mongoose.Query();
        sinon.stub(query, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves([device0])
        });

        let conditions = {};
        let options = { limit: '10' };
        Paging.pageDevices(countQuery, query, options, conditions).then(pageInfo => {
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.size).to.equal(1);
            expect(pageInfo.devices).to.not.be.null;
            expect(pageInfo.devices).to.have.lengthOf(1);
            done();
        });
    });

    it('Test page devices against users', function (done) {
        sinon.mock(User.Model)
            .expects('count')
            .returns(5);

        var mockUsers = [{
            _id: 'id1',
            username: 'test1'
        }, {
            _id: 'id2',
            username: 'test2'
        }];

        sinon.mock(User.Model)
            .expects('find')
            .chain('exec')
            .returns(Promise.resolve(mockUsers));

        var mockDevices = [{
            _id: 'id0',
            description: 'test0'
        }, {
            _id: 'id1',
            description: 'test1'
        }];

        var query = new mongoose.Query();
        sinon.stub(query, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves(mockDevices)
        });

        sinon.mock(Device.Model)
            .expects('find')
            .returns(query);

        let conditions = {};
        let options = { limit: '10' };
        Paging.pageDevices(null, null, options, conditions).then(pageInfo => {
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.size).to.equal(2);
            expect(pageInfo.devices).to.not.be.null;
            expect(pageInfo.devices).to.have.lengthOf(2);
            done();
        });
    });
})