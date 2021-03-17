"use strict";

const mongoose = require('mongoose');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

const AuthenticationConfigurationSchema = new Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: false },
    textColor: { type: String, required: false },
    buttonColor: { type: String, required: false },
    icon: { type: String, required: false },
    enabled: { type: Boolean, default: false },
    settings: Schema.Types.Mixed
}, {
    discriminatorKey: 'type',
    timestamps: {
        updatedAt: 'lastUpdated'
    }
});


const AuthenticationConfiguration = mongoose.model('AuthenticationConfiguration', AuthenticationConfigurationSchema);
exports.Model = AuthenticationConfiguration;

exports.getConfiguration = function(type, name) {
    return AuthenticationConfiguration.findOne({type: type, name: name}).exec();
};