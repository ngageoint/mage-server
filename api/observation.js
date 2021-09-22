const async = require('async')
  , log = require('winston')
  , ObservationEvents = require('./events/observation.js')
  , FieldFactory = require('./field')
  , ObservationModel = require('../models/observation')
  , Attachment = require('./attachment');

const fieldFactory = new FieldFactory();

function Observation(event, user, deviceId) {
  this._event = event;
  this._user = user;
  this._deviceId = deviceId;
}

const EventEmitter = new ObservationEvents();
Observation.on = EventEmitter;

Observation.prototype.getAll = function(options, callback) {
  const event = this._event;
  const filter = options.filter;
  if (filter && filter.geometries) {
    let allObservations = [];
    async.each(
      filter.geometries,
      function(geometry, done) {
        options.filter.geometry = geometry;
        ObservationModel.getObservations(event, options, function (err, observations) {
          if (err) return done(err);

          if (observations) {
            allObservations = allObservations.concat(observations);
          }

          done();
        });
      },
      function(err) {
        callback(err, allObservations);
      }
    );
  } else {
    ObservationModel.getObservations(event, options, callback);
  }
};

Observation.prototype.getById = function(observationId, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  ObservationModel.getObservationById(this._event, observationId, options, callback);
};

Observation.prototype.validate = function(observation) {
  const errors = {};
  let message = '';

  if (observation.type !== 'Feature') {
    errors.type = { error: 'required', message: observation.type ? 'type is required' :  'type must equal "Feature"' };
    message += observation.type ? '\u2022 type is required\n' : '\u2022 type must equal "Feature"\n'
  }

  // validate timestamp
  const properties = observation.properties || {};
  const timestampError = fieldFactory.createField({
    type: 'date',
    required: true,
    name: 'timestamp',
    title: 'Date'
  }, properties).validate();
  if (timestampError) {
    errors.timestamp = timestampError;
    message += `\u2022 ${timestampError.message}\n`;
  }

  // validate geometry
  const geometryError = fieldFactory.createField({
    type: 'geometry',
    required: true,
    name: 'geometry',
    title: 'Location'
  }, observation).validate();
  if (geometryError) {
    errors.geometry = geometryError;
    message += `\u2022 ${geometryError.message}\n`;
  }

  const forms = properties.forms || [];
  const formCount = forms.reduce((count, form) => {
    count[form.formId] = (count[form.formId] || 0) + 1;
    return count;
  }, {})
  
  const formDefinitions = {};

  // Validate total number of forms
  if (this._event.minObservationForms != null && forms.length < this._event.minObservationForms) {
    errors.minObservationForms = new Error("Insufficient number of forms");
    message += `\u2022 Total number of forms in observation must be at least ${this._event.minObservationForms}\n`;
  }

  if (this._event.maxObservationForms != null && forms.length > this._event.maxObservationForms) {
    errors.maxObservationForms = new Error("Exceeded maximum number of forms");
    message += `\u2022 Total number of forms in observation cannot be more than ${this._event.maxObservationForms}\n`;
  }

  // Validate forms min/max occurrences
  const formError = {};
  this._event.forms
    .filter(form => !form.archived)
    .forEach(formDefinition => {
      formDefinitions[formDefinition._id] = formDefinition;

      const count = formCount[formDefinition.id] || 0;
      if (formDefinition.min && count < formDefinition.min) {
        formError[formDefinition.id] = {
          error: 'min',
          message: `${formDefinition.name} form must be included in observation at least ${formDefinition.min} times`
        }

        message += `\u2022 ${formDefinition.name} form must be included in observation at least ${formDefinition.min} times\n`;
      } else if  (formDefinition.max && (count > formDefinition.max)) {
        formError[formDefinition.id] = {
          error: 'max',
          message: `${formDefinition.name} form cannot be included in observation more than ${formDefinition.max} times`
        }

        message += `\u2022 ${formDefinition.name} form cannot be included in observation more than ${formDefinition.max} times\n`;
      }
    });

  // TODO attachment-work, validate attachment restrictions and min/max

  if (Object.keys(formError).length) {
    errors.form = formError;
  }

  // Validate form fields
  const formErrors = [];

  forms.forEach(observationForm => {
    let fieldsMessage = '';
    const fieldsError = {};

    formDefinitions[observationForm.formId].fields
      .filter(fieldDefinition => !fieldDefinition.archived)
      .forEach(fieldDefinition => {
        const field = fieldFactory.createField(fieldDefinition, observationForm, observation);
        const fieldError = field.validate();

        if (fieldError) {
          fieldsError[field.name] = fieldError;
          fieldsMessage += `    \u2022 ${fieldError.message}\n`;
        }
      });

    if (Object.keys(fieldsError).length) {
      formErrors.push(fieldsError);
      message += `${formDefinitions[observationForm.formId].name} form is invalid\n`;
      message += fieldsMessage;
    }
  });

  if (formErrors.length) {
    errors.forms = formErrors
  }

  if (Object.keys(errors).length) {
    const err = new Error('Invalid Observation');
    err.name = 'ValidationError';
    err.status = 400;
    err.message = message;
    err.errors = errors;
    return err;
  }
};

Observation.prototype.createObservationId = function(callback) {
  ObservationModel.createObservationId(callback);
};

Observation.prototype.validateObservationId = function(id, callback) {
  ObservationModel.getObservationId(id, function(err, id) {
    if (err) return callback(err);

    if (!id) {
      err = new Error();
      err.status = 404;
    }

    callback(err, id);
  });
};

// TODO create is gone, do I need to figure out if this is an observation create?
Observation.prototype.update = function(observationId, observation, callback) {
  if (this._user) observation.userId = this._user._id;
  if (this._deviceId) observation.deviceId = this._deviceId;

  const err = this.validate(observation);
  if (err) return callback(err);

  ObservationModel.updateObservation(this._event, observationId, observation, (err, updatedObservation) => {
    if (updatedObservation) {
      EventEmitter.emit(ObservationEvents.events.update, updatedObservation.toObject({event: this._event}), this._event, this._user);

      // Remove any deleted attachments from file system
      const {forms: observationForms = []}  = observation.properties || {};
      observationForms.forEach(observationForm => {
        const formDefinition = this._event.forms.find(form => form._id === observationForm.formId);
        Object.keys(observationForm).forEach(fieldName => {
          const fieldDefinition = formDefinition.fields.find(field => field.name === fieldName);
          if (fieldDefinition && fieldDefinition.type === 'attachment') {
            const attachmentsField = observationForm[fieldName] || [];
            attachmentsField.filter(attachmentField => attachmentField.action === 'delete').forEach(attachmentField => {
              const attachment = observation.attachments.find(attachment => attachment._id.toString() === attachmentField.id);
              if (attachment) {
                new Attachment(this._event, observation).delete(attachment._id, err => {
                  log.warn('Error removing deleted attachment from file system', err);
                });
              }
            });
          }
        });
      });
    }

    callback(err, updatedObservation);
  });
};

Observation.prototype.addFavorite = function(observationId, user, callback) {
  ObservationModel.addFavorite(this._event, observationId, user, callback);
};

Observation.prototype.removeFavorite = function(observation, user, callback) {
  ObservationModel.removeFavorite(this._event, observation, user, callback);
};

Observation.prototype.addImportant = function(observationId, important, callback) {
  ObservationModel.addImportant(this._event, observationId, important, callback);
};

Observation.prototype.removeImportant = function(observation, callback) {
  ObservationModel.removeImportant(this._event, observation, callback);
};

Observation.prototype.addState = function(observationId, state, callback) {
  ObservationModel.addState(this._event, observationId, state, (err, state) => {
    if (!err) {
      if (state.name === 'archive') {
        EventEmitter.emit(ObservationEvents.events.remove, observationId, this._event);
      }
    }
    callback(err, state);
  });
};

module.exports = Observation;
