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

    it('Test null strategy', function (done) {
        PasswordValidator.validate(null, "password").then(isValid => {
            expect(isValid).to.equal(false);
            done();
        });
    });

    it('Test null password', function (done) {
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
            PasswordValidator.validate("test", "ab").then(isValid => {
                expect(isValid).to.equal(false);
                done();
            });
        });
    });

    it('Test minimum characters disabled', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        minChars: 3,
                        minCharsEnabled: false
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "a").then(isValid => {
            expect(isValid).to.equal(true);
            done();
        });
    });

    it('Test maximum character count', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        maxConChars: 2,
                        maxConCharsEnabled: true
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "ab123").then(isValid => {
            expect(isValid).to.equal(true);
            PasswordValidator.validate("test", "abc123").then(isValid => {
                expect(isValid).to.equal(false);
                done();
            });
        });
    });

    it('Test maximum character count disabled', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        maxConChars: 1,
                        maxConCharsEnabled: false
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "abc").then(isValid => {
            expect(isValid).to.equal(true);
            done();
        });
    });

    it('Test minimum number of lowercase characters', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        lowLetters: 2,
                        lowLettersEnabled: true
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "aBcD").then(isValid => {
            expect(isValid).to.equal(true);
            PasswordValidator.validate("test", "ABCDE1234f").then(isValid => {
                expect(isValid).to.equal(false);
                done();
            });
        });
    });

    it('Test minimum number of lowercase characters disabled', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        lowLetters: 10,
                        lowLettersEnabled: false
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "abc").then(isValid => {
            expect(isValid).to.equal(true);
            done();
        });
    });

    it('Test minimum number of uppercase characters', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        highLetters: 2,
                        highLettersEnabled: true
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "aBcD").then(isValid => {
            expect(isValid).to.equal(true);
            PasswordValidator.validate("test", "abcde1234F").then(isValid => {
                expect(isValid).to.equal(false);
                done();
            });
        });
    });

    it('Test minimum number of uppercase characters disabled', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        highLetters: 10,
                        highLettersEnabled: false
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "ABC").then(isValid => {
            expect(isValid).to.equal(true);
            done();
        });
    });

    it('Test minimum number of numbers', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        numbers: 2,
                        numbersEnabled: true
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "aBcD12").then(isValid => {
            expect(isValid).to.equal(true);
            PasswordValidator.validate("test", "abcde1F").then(isValid => {
                expect(isValid).to.equal(false);
                done();
            });
        });
    });

    it('Test minimum number of numbers disabled', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        numbers: 10,
                        numbersEnabled: false
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "ABC1").then(isValid => {
            expect(isValid).to.equal(true);
            done();
        });
    });
});