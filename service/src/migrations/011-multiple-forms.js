const async = require('async')
  , fs = require('fs-extra')
  , mongoose = require('mongoose')
  , path = require('path')
  , environment = require('../environment/env')
  , Counter = require('../models/counter')
  , Observation = require('../models/observation');

const iconBase = environment.iconBaseDirectory;

exports.id = 'multiple-forms';

exports.up = function(done) {
  this.log('migrating single form per event to multiple forms');

  async.waterfall([
    getEvents.bind(this),
    migrateEvents.bind(this)
  ], function(err) {
    done(err);
  });
};

exports.down = function() {
  // No down, please backup your instance
};

function getEvents(callback) {
  const EventModel = mongoose.model('Event');
  EventModel.find({}).lean().exec(function(err, events) {
    callback(err, events);
  });
}

function migrateEvents(events, callback) {
  this.log('migrating events to multiple forms...');

  async.eachSeries(events, function(event, done) {
    Counter.getNext('form').then(formId => {
      migrateEvent.bind(this)(event, formId, done);
    });
  }, function(err) {
    callback(err);
  });
}

function migrateEvent(event, formId, callback) {
  this.log('migrating event ' + event.name);

  async.series([
    function(done) {
      migrateIconFiles.call(this, event, formId, done);
    }.bind(this),
    function(done) {
      migrateIconData.call(this, event, formId, done);
    }.bind(this),
    function(done) {
      migrateEventData.call(this, event, formId, done);
    }.bind(this),
    function(done) {
      migrateObservationData.call(this, event, formId, done);
    }.bind(this)
  ], function(err) {
    this.log('migrated event ' + event.name);
    callback(err);
  }.bind(this));
}

function migrateIconFiles(event, formId, callback) {
  this.log('migrate icon files for event ' + event.name);

  const eventIconPath = path.join(iconBase, event._id.toString());
  const formIconPath = path.join(eventIconPath, formId.toString());

  async.eachSeries(fs.readdirSync(eventIconPath),
    function(child, done) {
      if (child === formId.toString()) {
        done();
      } else if (child === 'icon.png') {
        fs.copy(path.join(eventIconPath, child), path.join(formIconPath, child), done);
      } else {
        fs.move(path.join(eventIconPath, child), path.join(formIconPath, child), done);
      }
    }.bind(this),
    function(err) {
      this.log('migrated icon files with error', err);
      callback(err);
    }.bind(this));
}

function migrateIconData(event, formId, callback) {
  this.log('migrate icon data for event ' + event.name);

  const IconModel = mongoose.model('Icon');

  async.series([
    function(done) {
      IconModel.find({eventId: event._id}, function(err, icons) {
        async.eachSeries(icons, function(icon, done) {
          icon.formId = formId;
          icon.relativePath = path.join(path.join(event._id.toString(), formId.toString()),  icon.relativePath.split(path.sep).splice(1).join(path.sep));
          icon.save(done);
        }, function(err) {
          done(err);
        });
      });
    },
    function(done) {
      IconModel.create({eventId: event._id, formId: null, type: null, variant: null, relativePath: path.join(event._id.toString(), 'icon.png')}, done);
    },
    function(done) {
      IconModel.update({eventId: event._id, formId: formId}, {$rename: {'type': 'primary'}}, {multi: true, strict: false}, done);
    }
  ],function(err) {
    callback(err);
  });
}

function migrateEventData(event, formId, callback) {
  this.log('migrate event data ' + event.name);

  const EventModel = mongoose.model('Event');

  async.series([
    function(done) {
      EventModel.findById(event._id).lean().exec(function(err, event) {
        event.forms = [];
        event.forms.push(event.form);
        event.forms[0]._id = formId;
        event.forms[0].name = event.name;
        event.forms[0].color = '#5278A2';
        event.forms[0].primaryField = 'type';

        // remove the timestamp and geometry fields, these are no
        // longer in the form.
        event.forms[0].fields = event.forms[0].fields.filter(function(field) {
          return field.name !== 'timestamp' && field.name !== 'geometry';
        });

        const typeFields = event.forms[0].fields.filter(function(field) {
          return field.name === 'type';
        });
        typeFields[0].required = false;
        delete event.form;

        event.style = {
          fill: '#5278A2',
          stroke: '#5278A2',
          fillOpacity: 0.2,
          strokeOpacity: 1,
          strokeWidth: 2
        };

        EventModel.findByIdAndUpdate(event._id, event, {overwrite: true}, done);
      });
    }
  ],function(err) {
    callback(err);
  });
}

function migrateObservationData(event, formId, callback) {
  this.log('migrate observation data for event form ' + event.name);

  const ObservationModel = Observation.observationModel(event);

  const fieldMap = {};
  event.form.fields.forEach(function(field) {
    fieldMap[field.name] = field;
  });

  ObservationModel.find({}).lean().exec(function(err, observations) {
    async.eachSeries(observations, function(observation, done) {
      const form = {
        formId: formId
      };

      // TODO don't move properties that are not in the form, ie accuracy
      for (const property in observation.properties) {
        if (property === 'timestamp' || !fieldMap[property]) continue;

        form[property] = observation.properties[property];
        delete observation.properties[property];
      }

      observation.properties.forms = [form];

      ObservationModel.findByIdAndUpdate(observation._id, observation, {overwrite: true, new: true}, function(err) {
        done(err);
      });
    }, function(err) {
      callback(err);
    });
  });
}
