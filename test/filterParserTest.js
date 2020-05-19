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
                "objectIds": objectId.toString() 
            } 
        };

        const conditions = FilterParser.parse(filter);
        expect(conditions).to.not.be.null;
        expect(conditions).to.not.be.empty;
        expect(conditions.userIds).to.not.be.empty;

        let condition = conditions.userIds;
        let generatedId = condition.$in[0];
        expect(generatedId.toString()).to.equal(objectId.toString());

        done();
    });

    it('Test NIN filter parsing', function (done) {
        const objectId = mongoose.Types.ObjectId('578df3efb618f5141202a196');
        let filter = { 
            "nin": { 
                "objectIds": objectId.toString() 
            } 
        };

        const conditions = FilterParser.parse(filter);
        expect(conditions).to.not.be.null;
        expect(conditions).to.not.be.empty;
        expect(conditions.userIds).to.not.be.empty;

        let condition = conditions.userIds;
        let generatedId = condition.$nin[0];
        expect(generatedId.toString()).to.equal(objectId.toString());

        done();
    });

});