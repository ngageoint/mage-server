var api = require('../api')
  , Zip = require('adm-zip')
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

  var teamIds = event.populated('teamIds') || event.teamIds;
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
        id: i,
        value: i,
        title: users[i]
      });
    }

    // Update the choices for user field
    formsUserFields.forEach(function(userFields) {
      userFields.forEach(function(userField) {
        userField.choices = choices;

        if (!userField.required && userField.type === 'dropdown') {
          userField.choices.unshift("");
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
  var err;

  if (file.extension !== 'zip') {
    err = new Error('Form import attachment must be of type "zip"');
    err.status = 400;
    return callback(err);
  }

  var zip = new Zip(file.path);
  var form = zip.readAsText('form/form.json');
  if (!form) {
    err = new Error('Invalid zip archive, no form/form.json');
    err.status = 400;
    return callback(err);
  }

  try {
    form = JSON.parse(form);
  } catch (e) {
    err = new Error('Error parsing form.json, please insure its valid JSON');
    err.status = 400;
    return callback(err);
  }

  var iconsEntry = zip.getEntry('form/icons/');
  if (!iconsEntry) {
    err = new Error('Error parsing icons directory...');
    err.status = 400;
    callback(err);
  }


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

module.exports = Form;
