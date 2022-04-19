var api = require('../api')
  , Zip = require('adm-zip')
  , log = require('winston')
  , archiver = require('archiver')
  , walk = require('walk')
  , path = require('path')
  , Team = require('../models/team');

function Form(event, form) {
  this._event = event;
  this._form = form;
}

function compareDisplayName(a, b) {
  var aNames = a.split(" ");
  var aFirstName = aNames.shift();
  var aLastName = aNames.pop();

  var bNames = b.split(" ");
  var bFirstName = bNames.shift();
  var bLastName = bNames.pop();

  if (aLastName < bLastName) return -1;

  if (aLastName > bLastName) return 1;

  if (aFirstName < bFirstName) return -1;

  if (aFirstName > bFirstName) return 1;

  return 0;
}

function getUserFields(form) {
  return form.fields.filter(function(field) {
    if (field.archived) return false;

    return form.userFields.some(function(memberField) {
      return memberField === field.name;
    });
  });
}

Form.prototype.populateUserFields = function(callback) {
  var event = this._event;
  var form = this._form;

  var forms = form ? [form] : event.forms;
  var formsUserFields = [];
  forms.forEach(function(form) {
    var userFields = getUserFields(form);
    if (userFields.length) {
      formsUserFields.push(userFields);
    }
  });

  // None of the forms in this event contain user fields
  if (!formsUserFields.length) return callback();

  var teamIds = (event.populated && event.populated('teamIds')) || event.teamIds;
  Team.getTeams({teamIds: teamIds}, function(err, teams) {
    if (err) return callback(err);

    var choices = [];
    var users = {};

    teams.forEach(function(team) {
      team.userIds.forEach(function(user) {
        users[user.displayName] = user.displayName;
      });
    });

    users = Object.keys(users);
    users.sort(compareDisplayName);
    for (var i = 0; i < users.length; i++) {
      choices.push({
        id: i + 1,
        value: i + 1,
        title: users[i]
      });
    }

    // Update the choices for user field
    formsUserFields.forEach(function(userFields) {
      userFields.forEach(function(userField) {
        userField.choices = choices.slice();

        if (!userField.required && userField.type === 'dropdown') {
          userField.choices.unshift({id: 0, value: 0, title: ""});
        }
      });
    });

    callback();
  });
};

Form.prototype.export = function(formId, callback) {
  var iconBasePath = new api.Icon(this._event._id).getBasePath();
  var formBasePath = path.join(iconBasePath, formId.toString());

  var archive = archiver('zip');
  archive.directory(formBasePath, 'form/icons');
  archive.append("", {name: 'icons/', prefix: 'form'});

  var forms = this._event.forms.filter(function(form) {
    return form._id === formId;
  });

  if (!forms.length) {
    var err = new Error('Form with id ' + formId + ' does not exist');
    err.status = 400;
    return callback(err);
  }

  archive.append(JSON.stringify(forms[0]), {name: "form/form.json"});
  archive.finalize();

  callback(null, {
    file: archive,
    name: forms[0].name
  });
};

Form.prototype.validate = function(file, callback) {
  let archiveError = new Error('Form archive file is invalid, please choose a valid file.');
  archiveError.status = 400;

  try {
    var zip = new Zip(file.path);
  } catch (e) {
    log.warn('Invalid zip archive', e);
    return callback(archiveError);
  }

  var form = zip.readAsText('form/form.json');
  if (!form) {
    log.warn('Invalid zip archive, no form/form.json');
    return callback(archiveError);
  }

  try {
    form = JSON.parse(form);
  } catch (e) {
    log.warn('Error parsing form.json, please insure its valid JSON');
    return callback(archiveError);
  }

  var iconsEntry = zip.getEntry('form/icons/');
  if (!iconsEntry) {
    log.warn('Invalid zip archive, no form/icons');
    return callback(archiveError);
  }

  form = cleanForm(form);

  callback(null, form);
};

Form.prototype.importIcons = function(file, form, callback) {
  var event = this._event;
  var zip = new Zip(file.path);

  var iconsEntry = zip.getEntry('form/icons/');
  if (iconsEntry) {
    var iconPath = path.join(new api.Icon(event._id).getBasePath(), form._id.toString()) + path.sep;

    zip.extractEntryTo(iconsEntry, iconPath, false, false);

    // for each file in each directory
    var walker = walk.walk(iconPath);
    walker.on("file", function(filePath, stat, next) {
      var primary = null;
      var variant = null;
      var regex = new RegExp(iconPath + path.sep + "+(.*)");
      var match = regex.exec(filePath);
      // TODO: what if there's a slash in the select field value?
      if (match && match[1]) {
        var variants = match[1].split("/");
        primary = variants.shift();
        variant = variants.shift();
      }

      new api.Icon(event._id, form._id, primary, variant).add({name: stat.name}, function(err) {
        next(err);
      });
    });
    walker.on("end", function() {
      callback(null);
    });
  } else {
    callback(null);
  }
};

function cleanForm(form) {
  // clean the form
  let fields = form.fields
    .filter(field => {
      // Handle historic form that may contain timestamp and geometry fields
      return field.name !== 'timestamp' && field.name !== 'geometry';
    })
    .filter(field => {
      // remove archived fields, used for historical reasons and not needed in a new form
      return !field.archived;
    })
    .sort((a, b) => {
      // reorder fields array in acsending order
      return a.id - b.id;
    })
    .map((field, index) => {
      // id is used for sorting, remap based on sorted array index
      field.id = index;
      return field;
    });

  const primaryMapField = fields.find(field => {
    return field.name === form.primaryField;
  });

  if (primaryMapField) {
    form.primaryField = fieldName(primaryMapField.id);
  }

  const secondaryMapField = fields.find(field => {
    return field.name === form.variantField;
  });

  if (secondaryMapField) {
    form.variantField = fieldName(secondaryMapField.id);
  }

  const primaryFeedField = fields.find(field => {
    return field.name === form.primaryFeedField;
  });

  if (primaryFeedField) {
    form.primaryFeedField = fieldName(primaryFeedField.id);
  }

  const secondaryFeedField = fields.find(field => {
    return field.name === form.secondaryFeedField;
  });

  if (secondaryFeedField) {
    form.secondaryFeedField = fieldName(secondaryFeedField.id);
  }

  const userFields = fields.filter(field => {
    return form.userFields.includes(field.name);
  });

  form.userFields =  [...userFields.reduce((fields, field) => {
    if (form.userFields.includes(field.name)) {
      fields.add(fieldName(field.id));
    }

    return fields;
  }, new Set())];

  // Re-map the field names based on index
  // This will ensure we eliminate non-unique field names
  // TODO this breaking primary/secondary map and feed fields
  form.fields = fields.map((field, index) => {
    field.name = fieldName(index);
    return field;
  });

  return form;
}

function fieldName(id) {
  return 'field' + id;
}

module.exports = Form;
