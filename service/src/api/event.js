const util = require('util');
const async = require('async');
const EventModel = require('../models/event');
const User = require('../models/user');
const api = {
  Form: require('./form'),
  Icon: require('./icon'),
  Attachment: require('./attachment')
};

function Event(event) {
  this._event = event;
}

Event.prototype.validate = function (event) {
  const errors = {};

  const forms = event.forms || [];

  // Validate min/max
  if (event.minObservationForms != null && event.maxObservationForms != null && event.minObservationForms > event.maxObservationForms) {
    errors.minMax = { error: 'value', message: `The minimum forms per observation must be less than or equal to the maximum forms per observation.` };
  }

  // Validate that total min for all forms is not greater than max per observation
  const totalMin = forms.reduce((total, form) => total += form.min, 0);
  if (event.maxObservationForms != null && totalMin > event.maxObservationForms) {
    errors.maxObservationForms = { error: 'value', message: `The maximum forms per observation must be equal to or greater than the sum of the minimum of all individual forms.` };
  }

  // Validate if total max = 4, all forms total is not less than that
  const totalMaxConstrained = forms.length && forms.every(form => form.max != null)
  if (totalMaxConstrained) {
    const totalMax = forms.reduce((total, form) => total += form.max, 0)
    if (event.minObservationForms != null && event.minObservationForms > totalMax) {
      errors.minObservationForms = { error: 'value', message: `The minimum forms per observation must be equal to or less than the sum of the maximum of all individual forms.` };
    }
  }

  const formErrors = {};
  forms.forEach(form => {
    if (form.min != null  && form.max != null && form.min > form.max) {
      errors[`form${form.id}minMax`] =  {
        error: 'value', message: `${form.name} form minimum must be less than or equal to the maximum.`
      }
    }
  });

  if (Object.keys(formErrors).length) {
    errors.forms = formErrors
  }

  if (Object.keys(errors).length) {
    const err = new Error('Invalid Event');
    err.name = 'ValidationError';
    err.status = 400;
    err.errors = errors;
    return err;
  }
}

Event.prototype.count = function(callback) {
  EventModel.count(callback);
};

Event.prototype.getEvents = function(options, callback) {
  EventModel.getEvents(options, function(err, events) {
    if (err) return callback(err);

    async.each(events, function(event, done) {
      new api.Form(event).populateUserFields(done);
    }, function(err) {
      callback(err, events);
    });
  });
};

Event.prototype.getById = function(id, options, callback) {
  EventModel.getById(id, options, function(err, event) {
    if (err) return callback(err);

    if (!event) {
      const error = new Error('Event does not exist');
      error.status = 404;
      return callback(error);
    }

    new api.Form(event).populateUserFields(function(err) {
      callback(err, event);
    });
  });
};

Event.prototype.createEvent = function(event, user, callback) {
  const err = this.validate(event);
  if (err) return callback(err);

  EventModel.create(event, user, function(err, newEvent) {
    if (err) return callback(err);

    // copy default icon into new event directory
    new api.Icon(event._id).saveDefaultIconToEventForm(function(err) {
      callback(err, newEvent);
    });
  });
};

Event.prototype.updateEvent = function(event, options, callback) {
  const err = this.validate(event);
  if (err) return callback(err);

  EventModel.update(this._event._id, event, options, function(err, updatedEvent) {
    if (err) return callback(err);

    new api.Form(updatedEvent).populateUserFields(function(err) {
      callback(err, updatedEvent);
    });
  });
};

Event.prototype.deleteEvent = async function(callback) {
  const event = this._event
  console.info(`deleting event ${event.name} (id ${event._id}) ...`)
  const parallelPromise = util.promisify(async.parallel)
  try {
    await parallelPromise({
      icons: function(done) {
        new api.Icon(event._id).delete(function(err) {
          done(err);
        });
      },
      recentEventIds: function(done) {
        User.removeRecentEventForUsers(event, function(err) {
          done(err);
        });
      },
      attachments: function(done) {
        new api.Attachment(event).deleteAllForEvent(function(err) {
          console.info(`finished deleting attachments for event ${event.name} (id ${event._id})`);
          done(err);
        });
      }
    })
  }
  catch (err) {
    console.error(`error deleting referenced resources of event ${event.name} (id ${event._id})`, err);
    return void(callback(err));
  }
  try {
    await event.remove();
  }
  catch (err) {
    console.error(`error deleting event ${event.name} (id ${event._id})`, err);
    return void(callback(err));
  }
  callback()
};

Event.prototype.addForm = function(form, callback) {
  EventModel.addForm(this._event._id, form, function(err, event, form) {
    callback(err, form);
  });
};

Event.prototype.updateForm = function(form, callback) {
  EventModel.updateForm(this._event._id, form, function(err, event, form) {
    callback(err, form);
  });
};

Event.prototype.addTeam = function(team, callback) {
  EventModel.addTeam(this._event, team, function(err, event) {
    callback(err, event);
  });
};

Event.prototype.removeTeam = function(team, callback) {
  EventModel.removeTeam(this._event, team, function(err, event) {
    callback(err, event);
  });
};

Event.prototype.addLayer = function(layer, callback) {
  EventModel.addLayer(this._event, layer, function(err, event) {
    callback(err, event);
  });
};

Event.prototype.removeLayer = function(layer, callback) {
  EventModel.removeLayer(this._event, layer, function(err, event) {
    callback(err, event);
  });
};

module.exports = Event;
