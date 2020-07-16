"use strict";

var PasswordValidator = require('../utilities/passwordValidator.js'),
    Setting = require('../models/setting'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = require("chai").expect;

chai.use(sinonChai);

describe("Password Validator Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test missing strategy', function (done) {
        PasswordValidator.validate(null, "password").then(isValid => {
            expect(isValid).to.equal(false);
            done();
        });
    });

    it('Test missing password', function (done) {
        PasswordValidator.validate("local", null).then(isValid => {
            expect(isValid).to.equal(false);
            done();
        });
    });

    it('Test minimum characters', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        minChars: 3,
                        minCharsEnabled: true
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "ABC").then(isValid => {
            expect(isValid).to.equal(true);
            done();
        });
    });
});