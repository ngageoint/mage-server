"use strict";

const PasswordValidator = require('../utilities/passwordValidator'),
    Setting = require('../models/setting'),
    chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = require("chai").expect,
    _ = require('underscore'),
    Hasher = require('../utilities/pbkdf2')();

chai.use(sinonChai);

describe("Password Validator Tests", function () {

    afterEach(function () {
        sinon.restore();
    });

    it('Test null strategy', function (done) {
        PasswordValidator.validate(null, "password").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(false);
            done();
        });
    });

    it('Test null password', function (done) {
        PasswordValidator.validate("local", null).then(validationStatus => {
            expect(validationStatus.isValid).to.equal(false);
            done();
        });
    });

    it('Test minimum password length', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        passwordMinLength: 3,
                        passwordMinLengthEnabled: true
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "ABC").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
        }).then(() => {
            PasswordValidator.validate("test", "ab").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'passwordMinLength')).to.equal(true);
            });
            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test minimum password length disabled', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        passwordMinLength: 10,
                        passwordMinLengthEnabled: false
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "ABC").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
            done();
        }).catch(err => {
            done(err);
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

        PasswordValidator.validate("test", "ABC").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
        }).then(() => {
            PasswordValidator.validate("test", "ab").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'minChars')).to.equal(true);
            });
            done();
        }).catch(err => {
            done(err);
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

        PasswordValidator.validate("test", "a").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
            done();
        });
    });

    it('Test maximum consecutive character count', function (done) {
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

        PasswordValidator.validate("test", "ab123").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
        }).then(() => {
            PasswordValidator.validate("test", "ab123abc").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'maxConChars')).to.equal(true);
            });
            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test maximum consecutive character count disabled', function (done) {
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

        PasswordValidator.validate("test", "abc").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
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

        PasswordValidator.validate("test", "aBcD").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
        }).then(() => {
            PasswordValidator.validate("test", "ABCDE1234f").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'lowLetters')).to.equal(true);
            });
            done();
        }).catch(err => {
            done(err);
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

        PasswordValidator.validate("test", "abc").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
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

        PasswordValidator.validate("test", "aBcD").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
        }).then(() => {
            PasswordValidator.validate("test", "abcde1234F").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'highLetters')).to.equal(true);
            });
            done();
        }).catch(err => {
            done(err);
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

        PasswordValidator.validate("test", "ABC").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
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

        PasswordValidator.validate("test", "aBcD12").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
        }).then(() => {
            PasswordValidator.validate("test", "abcde1F").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'numbers')).to.equal(true);
            });
            done();
        }).catch(err => {
            done(err);
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

        PasswordValidator.validate("test", "ABC1").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
            done();
        });
    });

    it('Test minimum number of special characters', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        specialChars: 2,
                        specialCharsEnabled: true
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "abc$@").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
        }).then(() => {
            PasswordValidator.validate("test", "abc&").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'specialChars')).to.equal(true);
            });
            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test minimum number of special characters disabled', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        specialChars: 10,
                        specialCharsEnabled: false
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "abc$@").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
            done();
        });
    });

    it('Test restricted special characters', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        specialChars: 1,
                        specialCharsEnabled: true,
                        restrictSpecialChars: '$',
                        restrictSpecialCharsEnabled: true
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "abc$@").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(false);
        }).then(() => {
            PasswordValidator.validate("test", "abc$$$$$").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(true);
            });
            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test restricted special characters disabled', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        specialChars: 10,
                        specialCharsEnabled: false
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "abc").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test complex password policy', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        minCharsEnabled: true,
                        minChars: 1,
                        maxConCharsEnabled: true,
                        maxConChars: 3,
                        lowLettersEnabled: true,
                        lowLetters: 1,
                        highLettersEnabled: true,
                        highLetters: 2,
                        numbersEnabled: true,
                        numbers: 2,
                        specialCharsEnabled: false,
                        specialChars: 0,
                        restrictSpecialCharsEnabled: false,
                        restrictSpecialChars: "",
                        passwordMinLength: 10,
                        passwordMinLengthEnabled: true
                    }
                }
            }
        }));

        PasswordValidator.validate("test", "ab1cD3F~~~").then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
        }).then(() => {
            //Fail min letters
            PasswordValidator.validate("test", "1234567890").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'minChars')).to.equal(true);
            });
        }).then(() => {
            //Fail consecutive characters
            PasswordValidator.validate("test", "abcd1cD3F~~").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'maxConChars')).to.equal(true);
            });
        }).then(() => {
            //Fail lowercase letters
            PasswordValidator.validate("test", "AB1CD3F~~~").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'lowLetters')).to.equal(true);
            });
        }).then(() => {
            //Fail uppercase letters
            PasswordValidator.validate("test", "ab1cd3f~~~").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'highLetters')).to.equal(true);
            });
        }).then(() => {
            //Fail numbers
            PasswordValidator.validate("test", "ab#cd#f~~~").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'numbers')).to.equal(true);
            });
        }).then(() => {
            //Fail password length
            PasswordValidator.validate("test", "ab1cD3F~~").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'passwordMinLength')).to.equal(true);
            });
        }).then(() => {
            //Fail multiple
            PasswordValidator.validate("test", "~").then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'passwordMinLength')).to.equal(true);
                expect(_.includes(validationStatus.failedKeys, 'numbers')).to.equal(true);
                expect(_.includes(validationStatus.failedKeys, 'highLetters')).to.equal(true);
                expect(_.includes(validationStatus.failedKeys, 'lowLetters')).to.equal(true);
                expect(_.includes(validationStatus.failedKeys, 'minChars')).to.equal(true);
            });
            done();
        }).catch(err => {
            done(err);
        });
    });

    it('Test password history', function (done) {
        sinon.stub(Setting, 'getSetting').returns(Promise.resolve({
            settings: {
                test: {
                    passwordPolicy: {
                        passwordHistoryCount: 10,
                        passwordHistoryCountEnabled: true
                    }
                }
            }
        }));

        const passwordHistory = [];

        Hasher.hashPassword('history0', function (err, encryptedPassword) {
            passwordHistory.push(encryptedPassword);
        });

        Hasher.hashPassword('history1', function (err, encryptedPassword) {
            passwordHistory.push(encryptedPassword);
        });

        PasswordValidator.validate("test", "history2", passwordHistory).then(validationStatus => {
            expect(validationStatus.isValid).to.equal(true);
        }).then(() => {
            PasswordValidator.validate("test", "history1", passwordHistory).then(validationStatus => {
                expect(validationStatus.isValid).to.equal(false);
                expect(_.includes(validationStatus.failedKeys, 'passwordHistoryCount')).to.equal(true);
            });
            done();
        }).catch(err => {
            done(err);
        });
    });
});