var api = require('../api')
  , Zip = require('adm-zip')
  , archiver = require('archiver')
  , walk = require('walk')
  , path = require('path')
  , Team = require('../models/team');

function Form(event) {
  this._event = event;
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
  var userFields = getUserFields(event.form);
  if (!userFields.length) return callback();

  // Get all users in this event
  event.populate({path: 'teamIds', populate: {path: 'userIds'}}, function(err, event) {
    if (err) return callback(err);

    var choices = [];
    var users = {};

    event.teamIds.forEach(function(team) {
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

    userFields.forEach(function(userField) {
      userField.choices = choices;

      if (!userField.required && userField.type === 'dropdown') {
        userField.choices.unshift("");
      }
    });

    callback();
  });
};

Form.prototype.export = function(callback) {
  var iconBasePath = new api.Icon(this._event._id).getBasePath();
  var archive = archiver('zip');
  archive.bulk([{src: ['**'], dest: 'form/icons', expand: true, cwd: iconBasePath}]);
  archive.append(JSON.stringify(this._event.form), {name: "form/form.json"});
  archive.finalize();

  callback(null, archive);
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

  callback(null, form);
};

Form.prototype.importIcons = function(file, form, callback) {
  var event = this._event;
  var zip = new Zip(file.path);

  var iconsEntry = zip.getEntry('form/icons/');
  if (iconsEntry) {
    var iconPath = new api.Icon(event._id).getBasePath() + path.sep;

    zip.extractEntryTo(iconsEntry, iconPath, false, false);

    // for each file in each directory
    var walker = walk.walk(iconPath);
    walker.on("file", function(filePath, stat, next) {
      var type = null;
      var variant = null;
      var regex = new RegExp(iconPath + path.sep + "+(.*)");
      var match = regex.exec(filePath);
      if (match && match[1]) {
        var variants = match[1].split("/");
        type = variants.shift();
        variant = variants.shift();
      }

      new api.Icon(event._id, type, variant).add({name: stat.name}, function(err) {
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
