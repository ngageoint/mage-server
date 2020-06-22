"use strict";

var FilterParser = require('../utilities/filterParser.js')
    , expect = require("chai").expect
    , mongoose = require('mongoose');

describe("Filter Parser Tests", function () {

    it('Test empty filter parsing', function (done) {
        const conditions = FilterParser.parse({});
        expect(conditions).to.be.empty;
        done();
    });

    it('Test IN filter parsing', function (done) {
        const objectId = mongoose.Types.ObjectId('578df3efb618f5141202a196');
        let filter = { 
            "in": { 
                "testIds": objectId.toString() 
            } 
        };

        const conditions = FilterParser.parse(filter);
        expect(conditions).to.not.be.null;
        expect(conditions.testIds).to.not.be.empty;

        let condition = conditions.testIds;
        let generatedId = condition.$in[0];
        expect(generatedId.toString()).to.equal(objectId.toString());

        done();
    });

    it('Test NIN filter parsing', function (done) {
        const objectId = mongoose.Types.ObjectId('578df3efb618f5141202a196');
        let filter = { 
            "nin": { 
                "testIds": objectId.toString() 
            } 
        };

        const conditions = FilterParser.parse(filter);
        expect(conditions).to.not.be.null;
        expect(conditions.testIds).to.not.be.empty;

        let condition = conditions.testIds;
        let generatedId = condition.$nin[0];
        expect(generatedId.toString()).to.equal(objectId.toString());

        done();
    });

    it('Test Equals filter parsing', function (done) {
        let filter = { 
            "e": { 
                "equalToNull": null,
                "equalTo4": 4 
            } 
        };

        const conditions = FilterParser.parse(filter);
        expect(conditions).to.not.be.null;

        let nullCondition = conditions.equalToNull;
        expect(nullCondition).to.be.null;

        let equalTo4Condition = conditions.equalTo4;
        expect(equalTo4Condition).to.not.be.null;
        expect(equalTo4Condition).to.equal(4);

        done();
    });

    it('Test OR filter parsing', function (done) {
        const userSearch = 'caci';
        let filter = { 
            "or": { 
                email: '.*' + userSearch + '.*'
            } 
        };

        const conditions = FilterParser.parse(filter);
        expect(conditions).to.not.be.null;

        let or = conditions.$or;
        expect(or).to.not.be.null;
        expect(or).to.be.an('array');
        expect(or).to.have.lengthOf(1);
        expect(or[0].email).to.not.be.null;
        expect(or[0].email.$regex).to.not.be.null;

        done();
    });

});