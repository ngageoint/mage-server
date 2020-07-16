"use strict";

var PasswordValidator = require('../utilities/passwordValidator.js')
    , expect = require("chai").expect;

describe("Password Validator Tests", function () {
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
});