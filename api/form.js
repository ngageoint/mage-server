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

    userFields.forEach(function(userField) {
      userField.choices = choices;
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

Form.prototype.import = function(file, callback) {
  if (file.extension !== 'zip') return callback(new Error('File attachment must be of type "zip"'));

  var event = this._event;
  var zip = new Zip(file.path);
  var form = zip.readAsText('form/form.json');
  if (!form) return callback(new Error('invalid zip archive, no form.json'));
  try {
    form = JSON.parse(form);
  } catch (e) {
    return callback(new Error('invalid zip archive cannot parse'));
  }

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
      callback(null, form);
    });
  }
};

module.exports = Form;
