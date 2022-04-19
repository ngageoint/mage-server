const mongoose = require('mongoose')
  , async = require('async')
  , Counter = require('./counter')
  , User = require('./user')
  , Team = require('./team')
  , api = require('../api')
  , whitelist = require('../utilities/whitelist')
  , log = require('winston');

// Creates a new Mongoose Schema object
const Schema = mongoose.Schema;

const OptionSchema = new Schema({
  id: { type: Number, required: true },
  title: {type: String, required: false, default: ''},
  value: { type: Number, required: true },
  blank: { type: Boolean, required: false }
},{
  _id: false
});

const FieldSchema = new Schema({
  id: { type: Number, required: true },
  archived: { type: Boolean, required: false},
  title: { type: String, required: true },
  type: { type: String, required: true, enum: ['attachment', 'textfield', 'numberfield', 'email', 'password', 'radio', 'dropdown', 'multiselectdropdown', 'date', 'geometry', 'textarea', 'checkbox', 'hidden'] },
  value: { type: Schema.Types.Mixed, required: false },
  name: { type: String, required: true },
  required: { type: Boolean, required: true },
  choices: [OptionSchema],
  allowedAttachmentTypes: [{ type: String, required: false, enum: ['image', 'video', 'audio'] }],
  min: { type: Number, required: false },
  max: { type: Number, required: false }
},{
  _id: false
});

function hasAtLeastOneField(fields) {
  return fields.length > 0;
}

function fieldNamesAreUnique(fields) {
  const names = new Set();
  const hasDuplicates = fields.some(function(field) {
    return names.size === names.add(field.name).size;
  });

  return !hasDuplicates;
}

function validateColor(color) {
  return /^#[0-9A-F]{6}$/i.test(color);
}

const permissions = {
  OWNER: ['read', 'update', 'delete'],
  MANAGER: ['read', 'update'],
  GUEST: ['read']
};

function rolesWithPermission(permission) {
  const roles = [];

  for (let key in permissions) {
    if (permissions[key].indexOf(permission) !== -1) {
      roles.push(key);
    }
  }

  return roles;
}

const FormSchema = new Schema({
  _id: { type: Number, required: true, unique: true, sparse: true },
  name: { type: String, required: true },
  description: { type: String, required: false },
  default: { type: Boolean, default: false },
  min: { type: Number, required: false },  
  max: { type: Number, required: false },
  color: { type: String, required: true },
  archived: { type: Boolean, required: true, default: false },
  primaryField: { type: String, required: false },
  variantField: { type: String, required: false },
  primaryFeedField: { type: String, required: false },
  secondaryFeedField: { type: String, required: false },
  userFields: [String],
  fields: [FieldSchema],
  style: { type: Schema.Types.Mixed, required: false }
});

const EventSchema = new Schema({
  _id: { type: Number, required: true },
  name: { type: String, required: true, unique: 'Event with name "{VALUE}" already exists.' },
  description: { type: String, required: false },
  complete: { type: Boolean },
  collectionName: { type: String, required: true },
  teamIds: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
  layerIds: [{ type: Number, ref: 'Layer' }],
  forms: [FormSchema],
  minObservationForms: { type: Number },
  maxObservationForms: { type: Number },
  style: {
    type: Schema.Types.Mixed,
    required: true,
    default: {
      fill: '#5278A2',
      stroke: '#5278A2',
      fillOpacity: 0.2,
      strokeOpacity: 1,
      strokeWidth: 2
    }
  },
  acl: {}
},{
  autoIndex: false,
  minimize: false,
  versionKey: false
});

EventSchema.plugin(require('mongoose-beautiful-unique-validation'));

FormSchema.path('fields').validate(hasAtLeastOneField, 'Form must contain at least one field.');
FormSchema.path('fields').validate(fieldNamesAreUnique, 'Form contains non unique field names');
FormSchema.path('color').validate(validateColor, 'Form color must be valid hex string.');

function validateTeamIds(eventId, teamIds, next) {
  if (!teamIds || !teamIds.length) return next();

  Team.getTeams({teamIds: teamIds}, function(err, teams) {
    if (err) return next(err);

    const containsInvalidTeam = teams.some(function(team) {
      return team.teamEventId && team.teamEventId !== eventId;
    });
    if (containsInvalidTeam) {
      const error = new Error("Cannot add a team that belongs specifically to another event");
      error.status = 405;
      return next(error);
    }

    next();
  });
}

function populateUserFields(event, callback) {
  new api.Form(event).populateUserFields(callback);
}

EventSchema.pre('init', function(next, event) {
  if (event.forms) {
    populateUserFields(event, function() {
      next();
    });
  } else {
    next();
  }
});

EventSchema.pre('remove', function(next) {
  let event = this;

  async.parallel({
    collection: function(done) {
      dropObservationCollection(event, done);
    },
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
        log.info('done deleting attachments for event');
        done(err);
      });
    }
  },
  function(err) {
    next(err);
  });
});

EventSchema.post('remove', function(event) {
  if (event.populated('teamIds')) {
    event.depopulate('teamIds');
  }

  Team.getTeams({teamIds: event.teamIds}, function(err, teams) {
    if (err) log.error('Could not get teams for deleted event ' + event.name, err);

    const teamEvents = teams.filter(function(team) {
      return team.teamEventId && team.teamEventId === event._id;
    });

    if (teamEvents && teamEvents.length) {
      Team.deleteTeam(teamEvents[0], function(err) {
        if (err) log.error('Could not delete team for event ' + event.name);
      });
    }
  });
});

function transformForm(form, ret) {
  ret.id = ret._id;
  delete ret._id;
}

function transform(event, ret, options) {
  if ('function' !== typeof event.ownerDocument) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.collectionName;

    if (event.populated('teamIds')) {
      ret.teams = ret.teamIds;
      delete ret.teamIds;
    }

    if (event.populated('layerIds')) {
      ret.layers = ret.layerIds;
      delete ret.layerIds;
    }

    // if read only permissions in event acl, only return users acl
    if (options.access) {
      var userAccess = ret.acl[options.access.user._id];
      var roles = rolesWithPermission('update').concat(rolesWithPermission('delete'));
      if (!userAccess || roles.indexOf(userAccess) === -1) {
        var acl = {};
        acl[options.access.user._id] = ret.acl[options.access.user._id];
        ret.acl = acl;
      }
    }

    for (var userId in ret.acl) {
      ret.acl[userId] = {
        role: ret.acl[userId],
        permissions: permissions[ret.acl[userId]]
      };
    }

    // TODO: this should be done at query time
    // make sure only projected fields are returned
    if (options.projection) {
      var projection = convertProjection(options.projection);
      projection.id = true; // always keep id
      whitelist.project(ret, projection);
    }
  }
}

FormSchema.set("toJSON", {
  transform: transformForm
});

FormSchema.set("toObject", {
  transform: transformForm
});

EventSchema.set("toJSON", {
  transform: transform
});

EventSchema.set("toObject", {
  transform: transform
});

// Creates the Model for the Layer Schema
var Event = mongoose.model('Event', EventSchema);
var Form = mongoose.model('Form', FormSchema);
exports.Model = Event;

function convertProjection(field, keys, projection) {
  keys = keys || [];
  projection = projection || {};

  for (var childField in field) {
    keys.push(childField);
    if (Object(field[childField]) === field[childField]) {
      convertProjection(field[childField], keys, projection);
    } else {
      var key = keys.join(".");
      if (field[childField]) projection[key] = field[childField];
      keys.pop();
    }
  }

  return projection;
}

// TODO look at filtering this in query, not after
function filterEventsByUserId(events, userId, callback) {
  Event.populate(events, 'teamIds', function(err, events) {
    if (err) return callback(err);

    var filteredEvents = events.filter(function(event) {
      // Check if user has read access to the event based on
      // being on a team that is in the event
      if (event.teamIds.some(function(team) { return team.userIds.indexOf(userId) !== -1; })) {
        return true;
      }

      // Check if user has read access to the event based on
      // being in the events access control list
      if (event.acl[userId] && rolesWithPermission('read').some(function(role) { return role === event.acl[userId]; })) {
        return true;
      }

      return false;
    });

    callback(null, filteredEvents);
  });
}

function userHasEventPermission(event, userId, permission, callback) {
  getTeamsForEvent(event, function(err, teams) {
    if (err) return callback(err);

    // If asking for event read permission and user is part of a team in this event
    if (permission === 'read' && teams.some(function(team) { return team.userIds.indexOf(userId) !== -1; })) {
      return callback(null, true);
    }

    // Check if user has permission in event acl
    if (event.acl[userId] && rolesWithPermission(permission).some(function(role) { return role === event.acl[userId]; })) {
      return callback(null, true);
    }

    callback(null, false);
  });
}

function getTeamsForEvent(event, callback) {

  if (event.populated('teamIds')) {
    callback(null, event.teamIds);
  } else {
    Event.populate(event, 'teamIds', function(err, event) {
      if (err) return callback(err);

      callback(null, event.teamIds);
    });
  }
}

exports.count = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var conditions = {};
  if (options.access) {
    var accesses = [];
    rolesWithPermission(options.access.permission).forEach(function(role) {
      var access = {};
      access['acl.' + options.access.user._id.toString()] = role;
      accesses.push(access);
    });

    conditions['$or'] = accesses;
  }

  Event.count(conditions, function(err, count) {
    callback(err, count);
  });
};

exports.getEvents = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var query = {};
  var filter = options.filter || {};
  if (filter.complete === true) query.complete = true;
  if (filter.complete === false) query.complete = {$ne: true};

  var projection = {};
  if (options.projection) {
    projection = convertProjection(options.projection);

    // Need these to check event access
    projection.acl = true;
    projection.teamIds = true;
  }

  Event.find(query, projection, function (err, events) {
    if (err) return callback(err);

    var filters = [];

    // First filter out events user cannot access
    if (options.access && options.access.user) {
      filters.push(function(done) {
        filterEventsByUserId(events, options.access.user._id, function(err, filteredEvents) {
          if (err) return done(err);

          events = filteredEvents;
          done();
        });
      });
    }

    // Filter again if filtering based on particular user
    if (options.filter && options.filter.userId) {
      filters.push(function(done) {
        filterEventsByUserId(events, options.filter.userId, function(err, filteredEvents) {
          if (err) return done(err);

          events = filteredEvents;
          done();
        });
      });
    }

    async.series(filters, function(err) {
      if (err) return callback(err);

      if (options.populate) {
        Event.populate(events, [{path: 'teamIds'}, {path: 'layerIds'}], function(err, events) {
          callback(err, events);
        });
      } else {
        callback(null, events);
      }
    });
  });
};

exports.getById = function(id, options, callback) {

  if (typeof options === 'function') {
    callback = options;

    options = {};
  }

  Event.findById(id, function (err, event) {
    if (err || !event) return callback(err);

    var filters = [];
    // First filter out events user my not have access to
    if (options.access && options.access.userId) {
      filters.push(function(done) {
        filterEventsByUserId([event], options.access.userId, function(err, events) {
          if (err) return done(err);
          event = events.length === 1 ? events[0] : null;
          done();
        });
      });
    }

    async.series(filters, function(err) {
      if (err) return callback(err);

      if (options.populate) {
        event.populate([{path: 'teamIds'}, {path: 'layerIds'}], function(err, events) {
          callback(err, events);
        });
      } else {
        event.depopulate('teamIds');
        event.depopulate('layerIds');
        callback(null, event);
      }
    });
  });
};

// TODO probably should live in event api
exports.filterEventsByUserId = filterEventsByUserId;
exports.userHasEventPermission = userHasEventPermission;

function createObservationCollection(event) {
  log.info("Creating observation collection: " + event.collectionName + ' for event ' + event.name);
  mongoose.connection.db.createCollection(event.collectionName, function(err) {
    if (err) {
      log.error(err);
      return;
    }

    log.info("Successfully created observation collection for event " + event.name);
  });
}

function dropObservationCollection(event, callback) {
  log.info("Dropping observation collection: " + event.collectionName);
  mongoose.connection.db.dropCollection(event.collectionName, function(err) {
    if (!err) {
      log.info('Dropped observation collection ' + event.collectionName);
    }

    callback(err);
  });
}

exports.create = function(event, user, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  async.waterfall([
    function(done) {
      Counter.getNext('event')
        .then(id => done(null, id))
        .catch(err => done(err));
    },
    function(id, done) {
      event._id = id;
      event.collectionName = 'observations' + id;

      event.acl = {};
      event.acl[user._id.toString()] = 'OWNER';

      Event.create(event, function(err, newEvent) {
        if (err) return done(err);

        createObservationCollection(newEvent);

        done(null, newEvent);
      });
    },
    function(event, done) {
      Team.createTeamForEvent(event, user, function(err) {
        if (err) {
          // could not create the team for this event, remove the event and error out
          event.remove(function() {
            done(err);
          });
        }
        done(err, event);
      });
    }
  ], function(err, newEvent) {
    if (err) {
      return callback(err);
    }
    callback(err, newEvent);
  });
};

exports.update = function(id, event, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const update = ['name', 'description', 'minObservationForms', 'maxObservationForms', 'complete', 'forms'].reduce(function(o, k) {
    if (event.hasOwnProperty(k)) {
      o[k] = event[k];
    }
    return o;
  }, {});

  // preserve form ids
  if (event.forms) {
    event.forms.forEach(function(form) {
      form._id = form.id;
    });
  }

  Event.findByIdAndUpdate(id, update, {new: true, runValidators: true, context: 'query'}, function(err, updatedEvent) {
    if (err) {
      return callback(err);
    }
    callback(err, updatedEvent);
  });
};

exports.addForm = function(eventId, form, callback) {
  Counter.getNext('form')
    .then(id => {
      form._id = id;

      var update = {
        $push: {forms: form}
      };

      Event.findByIdAndUpdate(eventId, update, {new: true, runValidators: true}, function(err, event) {
        if (err) return callback(err);

        var forms = event.forms.filter(function(f) {
          return f._id === form._id;
        });

        callback(err, event, forms.length ? forms[0] : null);
      });
    })
    .catch(err => callback(err));
};

exports.updateForm = function(event, form, callback) {
  new Form(form).validate(function(err) {
    if (err) return callback(err);

    var update = {
      $set: {
        'forms.$': form
      }
    };

    Event.findOneAndUpdate({'forms._id': form._id}, update, {new: true, runValidators: true}, function(err, event) {
      if (err) return callback(err);

      var forms = event.forms.filter(function(f) {
        return f._id === form._id;
      });

      callback(err, event, forms.length ? forms[0] : null);
    });
  });
};

exports.getMembers = async function (eventId, options) {
  const query = { _id: eventId };
  if (options.access) {
    const accesses = [{
      userIds: {
        '$in': [options.access.user._id]
      }
    }];

    rolesWithPermission(options.access.permission).forEach(role => {
      const access = {};
      access['acl.' + options.access.user._id.toString()] = role;
      accesses.push(access);
    });

    query['$or'] = accesses;
  }
  const event = await Event.findOne(query)

  if (event) {
    const { searchTerm } = options || {}
    const searchRegex = new RegExp(searchTerm, 'i')
    const params = searchTerm ? {
      '$or': [
        { username: searchRegex },
        { displayName: searchRegex },
        { email: searchRegex },
        { 'phones.number': searchRegex }
      ]
    } : {}

    const eventTeam = await Team.getTeamForEvent(event);
    params._id = { '$in': eventTeam.userIds.toObject() }

    // per https://docs.mongodb.com/v5.0/reference/method/cursor.sort/#sort-consistency,
    // add _id to sort to ensure consistent ordering
    const members = await User.Model.find(params)
      .sort('displayName _id')
      .limit(options.pageSize)
      .skip(options.pageIndex * options.pageSize)

    const page = {
      pageSize: options.pageSize,
      pageIndex: options.pageIndex,
      items: members
    }

    const includeTotalCount = typeof options.includeTotalCount === 'boolean' ? options.includeTotalCount : options.pageIndex === 0
    if (includeTotalCount) {
      page.totalCount = await User.Model.count(params);
    }

    return page;
  } else {
    return null;
  }
};

exports.getNonMembers = async function (eventId, options) {
  const query = { _id: eventId };
  if (options.access) {
    const accesses = [{
      userIds: {
        '$in': [options.access.user._id]
      }
    }];

    rolesWithPermission(options.access.permission).forEach(role => {
      const access = {};
      access['acl.' + options.access.user._id.toString()] = role;
      accesses.push(access);
    });

    query['$or'] = accesses;
  }
  const event = await Event.findOne(query)

  if (event) {
    const { searchTerm } = options || {}
    const searchRegex = new RegExp(searchTerm, 'i')
    const params = searchTerm ? {
      '$or': [
        { username: searchRegex },
        { displayName: searchRegex },
        { email: searchRegex },
        { 'phones.number': searchRegex }
      ]
    } : {}

    const eventTeam = await Team.getTeamForEvent(event);
    params._id = { '$nin': eventTeam.userIds.toObject() }

    // per https://docs.mongodb.com/v5.0/reference/method/cursor.sort/#sort-consistency,
    // add _id to sort to ensure consistent ordering
    const members = await User.Model.find(params)
      .sort('displayName _id')
      .limit(options.pageSize)
      .skip(options.pageIndex * options.pageSize)

    const page = {
      pageSize: options.pageSize,
      pageIndex: options.pageIndex,
      items: members
    }

    const includeTotalCount = typeof options.includeTotalCount === 'boolean' ? options.includeTotalCount : options.pageIndex === 0
    if (includeTotalCount) {
      page.totalCount = await User.Model.count(params);
    }

    return page;
  } else {
    return null;
  }
};

exports.getTeamsInEvent = async function (eventId, options) {
  const query = { _id: eventId };
  if (options.access) {
    const accesses = [{
      userIds: {
        '$in': [options.access.user._id]
      }
    }];

    rolesWithPermission(options.access.permission).forEach(role => {
      const access = {};
      access['acl.' + options.access.user._id.toString()] = role;
      accesses.push(access);
    });

    query['$or'] = accesses;
  }
  const event = await Event.findOne(query)

  if (event) {
    const { searchTerm } = options || {}
    const searchRegex = new RegExp(searchTerm, 'i')
    const params = searchTerm ? {
      '$or': [
        { name: searchRegex },
        { description: searchRegex }
      ]
    } : {}

    // TODO make sure to exclude event teams
    params._id = { '$in': event.teamIds.toObject() }
    params.teamEventId = null;

    const populate = {
      path: 'teamIds'
    };

    if (options.populate && options.populate.includes('users')) {
      populate['populate'] = {
        path: 'userIds',
      };
    }

    // per https://docs.mongodb.com/v5.0/reference/method/cursor.sort/#sort-consistency,
    // add _id to sort to ensure consistent ordering
    const teams = await Team.TeamModel.find(params)
      .sort('name _id')
      .populate(populate)
      .limit(options.pageSize)
      .skip(options.pageIndex * options.pageSize)

    const page = {
      pageSize: options.pageSize,
      pageIndex: options.pageIndex,
      items: teams
    }

    const includeTotalCount = typeof options.includeTotalCount === 'boolean' ? options.includeTotalCount : options.pageIndex === 0
    if (includeTotalCount) {
      page.totalCount = await Team.TeamModel.count(params);
    }

    return page;
  } else {
    return null;
  }
};

exports.getTeamsNotInEvent = async function (eventId, options) {
  const query = { _id: eventId };
  if (options.access) {
    const accesses = [{
      userIds: {
        '$in': [options.access.user._id]
      }
    }];

    rolesWithPermission(options.access.permission).forEach(role => {
      const access = {};
      access['acl.' + options.access.user._id.toString()] = role;
      accesses.push(access);
    });

    query['$or'] = accesses;
  }
  const event = await Event.findOne(query)

  if (event) {
    const { searchTerm } = options || {}
    const searchRegex = new RegExp(searchTerm, 'i')
    const params = searchTerm ? {
      '$or': [
        { name: searchRegex },
        { description: searchRegex }
      ]
    } : {}

    params._id = { '$nin': event.teamIds.toObject() }
    params.teamEventId = null;

    // per https://docs.mongodb.com/v5.0/reference/method/cursor.sort/#sort-consistency,
    // add _id to sort to ensure consistent ordering
    const teams = await Team.TeamModel.find(params)
      .sort('name _id')
      .limit(options.pageSize)
      .skip(options.pageIndex * options.pageSize)

    const page = {
      pageSize: options.pageSize,
      pageIndex: options.pageIndex,
      items: teams
    }

    const includeTotalCount = typeof options.includeTotalCount === 'boolean' ? options.includeTotalCount : options.pageIndex === 0
    if (includeTotalCount) {
      page.totalCount = await Team.TeamModel.count(params);
    }

    return page;
  } else {
    return null;
  }
};

exports.addTeam = function(event, team, callback) {
  async.series([
    function(done) {
      validateTeamIds(event._id, [team.id], done);
    },
    function(done) {
      var update = {
        $addToSet: {
          teamIds: mongoose.Types.ObjectId(team.id)
        }
      };

      Event.findByIdAndUpdate(event._id, update, done);
    }
  ], function(err, results) {
    callback(err, results[1]);
  });

};

exports.removeTeam = function(event, team, callback) {
  if (event._id === team.teamEventId) {
    var err = new Error("Cannot remove an events team, event '" + event.name);
    err.status = 405;
    return callback(err);
  }

  var update = {
    $pull: {
      teamIds: { $in: [mongoose.Types.ObjectId(team.id)] }
    }
  };

  Event.findByIdAndUpdate(event._id, update, function(err, event) {
    callback(err, event);
  });
};

exports.addLayer = function(event, layer, callback) {
  var update = {
    $addToSet: {
      layerIds: layer.id
    }
  };

  Event.findByIdAndUpdate(event._id, update, function(err, event) {
    callback(err, event);
  });
};

exports.removeLayer = function(event, layer, callback) {
  var update = {
    $pull: {
      layerIds: { $in: [layer.id] }
    }
  };

  Event.findByIdAndUpdate(event._id, update, function(err, event) {
    callback(err, event);
  });
};

exports.removeLayerFromEvents = function(layer, callback) {
  var update = {
    $pull: {layerIds: layer._id}
  };
  Event.update({}, update, function(err) {
    callback(err);
  });
};

exports.removeTeamFromEvents = function(team, callback) {
  var update = {
    $pull: {teamIds: team._id}
  };
  Event.update({}, update, function(err) {
    callback(err);
  });
};

exports.updateUserInAcl = function(eventId, userId, role, callback) {
  // validate userId
  var err;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    err = new Error('Invalid userId');
    err.status = 400;
    return callback(err);
  }

  // validate role
  if (Object.keys(permissions).indexOf(role) === -1) {
    err = new Error('Invalid role');
    err.status = 400;
    return callback(err);
  }

  var update = {};
  update['acl.' + userId] = role;

  Event.findOneAndUpdate({_id: eventId}, update, {new: true, runValidators: true}, function(err, event) {
    if (err) return callback(err);

    // The team that belongs to this event should have the same acl as the event
    Team.updateUserInAclForEventTeam(eventId, userId, role, function(err) {
      callback(err, event);
    });
  });
};


exports.removeUserFromAcl = function(eventId, userId, callback) {
  var update = {
    $unset: {}
  };
  update.$unset['acl.' + userId] = true;

  Event.findByIdAndUpdate(eventId, update, {new: true, runValidators: true}, function(err, event) {
    if (err) return callback(err);

    // The team that belongs to this event should have the same acl as the event
    Team.removeUserFromAclForEventTeam(eventId, userId, function(err) {
      callback(err, event);
    });
  });
};

exports.removeUserFromAllAcls = function(user, callback) {
  var update = {
    $unset: {}
  };
  update.$unset['acl.' + user._id.toString()] = true;

  Event.update({}, update, {multi: true, new: true}, callback);
};

exports.remove = function(event, callback) {
  event.remove(function(err) {
    return callback(err);
  });
};

exports.getUsers = function(eventId, callback) {
  var populate = {
    path: 'teamIds',
    populate: {
      path: 'userIds'
    }
  };

  Event.findById(eventId).populate(populate).exec(function(err, event) {
    if (err) return callback(err);

    if (!event) {
      err = new Error("Event does not exist");
      err.status = 404;
      return callback(err);
    }

    var users = event.teamIds.reduce(function(users, team) {
      return users.concat(team.userIds);
    }, []);

    callback(err, users);
  });
};

exports.getTeams = function(eventId, options, callback) {
  var projection = {
    teamIds: 1
  };

  var populate = {
    path: 'teamIds'
  };

  if (options.populate && options.populate.includes('users')) {
    populate['populate'] = {
      path: 'userIds',
    };
  }

  Event.findById(eventId, projection).populate(populate).exec(function(err, event) {
    if (err) return callback(err);

    if (!event) {
      err = new Error("Event does not exist");
      err.status = 404;
      return callback(err);
    }

    callback(err, event.teamIds);
  });
};
