"use strict";

const Paging = require('../lib/utilities/paging.js'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = require("chai").expect,
    mongoose = require('mongoose'),
    User = require('../lib/models/user.js'),
    Device = require('../lib/models/device.js');

require('sinon-mongoose');

chai.use(sinonChai);

describe("Paging Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test page users', function (done) {
        const countQuery = new mongoose.Query();
        sinon.stub(countQuery, 'count');
        countQuery.count.returns(Promise.resolve(1));

        let user0 = {
            _id: '0'
        };

        const query = new mongoose.Query();
        sinon.stub(query, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves([user0])
        });

        let options = { limit: '10' };
        Paging.countAndPage(countQuery, query, options, 'users').then(pageInfo => {
            const users = pageInfo['users'];
            expect(users).to.not.be.null;
            expect(users.length).to.equal(1);
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.limit).to.equal(10);
            expect(pageInfo.size).to.equal(1);
            expect(pageInfo.links).to.not.be.null;
            expect(pageInfo.links.next).to.be.null;
            done();
        }).catch(err => {
            done(err);
        })
    });

    it('Test page to end', function (done) {
        const countQuery = new mongoose.Query();
        sinon.stub(countQuery, 'count');
        countQuery.count.returns(Promise.resolve(2));

        let user0 = {
            _id: '0'
        };
        let user1 = {
            _id: '1'
        };

        const query = new mongoose.Query();
        sinon.stub(query, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves([user0])
        });

        const query1 = new mongoose.Query();
        sinon.stub(query1, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves([user1])
        });

        const options = { limit: '1' };
        Paging.countAndPage(countQuery, query, options, 'users').then(pageInfo => {
            const users = pageInfo['users'];
            expect(users).to.not.be.null;
            expect(users.length).to.equal(1);
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.limit).to.equal(1);
            expect(pageInfo.size).to.equal(1);
            expect(pageInfo.links).to.not.be.null;
            expect(pageInfo.links.next).to.not.be.null;

            const options1 = { limit: '1', start: pageInfo.links.next };
            return Paging.countAndPage(countQuery, query1, options1, 'users');
        }).then(pageInfo => {
            const users = pageInfo['users'];
            expect(users).to.not.be.null;
            expect(users.length).to.equal(1);
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.limit).to.equal(1);
            expect(pageInfo.size).to.equal(1);
            expect(pageInfo.links).to.not.be.null;
            expect(pageInfo.links.next).to.be.null;
            expect(pageInfo.links.prev).to.not.be.null;
            done();
        }).catch(err => {
            done(err);
        })
    });

    it('Test page no results', function (done) {
        const countQuery = new mongoose.Query();
        sinon.stub(countQuery, 'count');
        countQuery.count.returns(Promise.resolve(0));


        const query = new mongoose.Query();
        sinon.stub(query, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves([])
        });

        let options = { limit: '10' };
        Paging.countAndPage(countQuery, query, options, 'users').then(pageInfo => {
            const users = pageInfo['users'];
            expect(users).to.not.be.null;
            expect(users.length).to.equal(0);
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.limit).to.equal(10);
            expect(pageInfo.size).to.equal(0);
            expect(pageInfo.links).to.not.be.null;
            expect(pageInfo.links.next).to.be.null;
            expect(pageInfo.links.prev).to.be.null;
            done();
        }).catch(err => {
            done(err);
        })
    });

    it('Test page devices', function (done) {
        const countQuery = new mongoose.Query();
        sinon.stub(countQuery, 'count');
        countQuery.count.returns(Promise.resolve(10));

        let device0 = {
            _id: '0'
        };

        const query = new mongoose.Query();
        sinon.stub(query, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves([device0])
        });

        let options = { limit: '10' };
        Paging.countAndPage(countQuery, query, options, 'devices').then(pageInfo => {
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.size).to.equal(1);
            expect(pageInfo['devices']).to.not.be.null;
            expect(pageInfo['devices']).to.have.lengthOf(1);
            done();
        });
    });

    it('Test page devices against users', function (done) {
        sinon.mock(User)
            .expects('count')
            .returns(5);

        const mockUsers = [{
            _id: 'id1',
            username: 'test1'
        }, {
            _id: 'id2',
            username: 'test2'
        }];

        sinon.mock(User)
            .expects('getUsers')
            .returns(Promise.resolve(mockUsers));

        const mockDevices = [{
            _id: 'id0',
            description: 'test0'
        }, {
            _id: 'id1',
            description: 'test1'
        }];

        const query = new mongoose.Query();
        sinon.stub(query, 'sort').returns({
            limit: sinon.stub().returnsThis(),
            skip: sinon.stub().returnsThis(),
            exec: sinon.stub().resolves(mockDevices)
        });

        sinon.mock(Device)
            .expects('getDevices')
            .returns(query);

        let options = { limit: '10' };
        Paging.page(null, query, options, 'devices').then(pageInfo => {
            expect(pageInfo).to.not.be.null;
            expect(pageInfo.size).to.equal(2);
            expect(pageInfo['devices']).to.not.be.null;
            expect(pageInfo['devices']).to.have.lengthOf(2);
            done();
        });
    });
})