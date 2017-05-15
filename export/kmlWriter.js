var moment = require('moment')
  , path = require('path');


function KmlWriter() {}
module.exports = new KmlWriter();

KmlWriter.prototype.generateKMLHeader = function() {
  return "<?xml version='1.0' encoding='UTF-8'?>" +
               "<kml xmlns='http://www.opengis.net/kml/2.2' " +
               "xmlns:gx='http://www.google.com/kml/ext/2.2' " +
               "xmlns:kml='http://www.opengis.net/kml/2.2' " +
               "xmlns:atom='http://www.w3.org/2005/Atom'>";
};

KmlWriter.prototype.generateUserStyles = function(users) {
  var styles = [];

  Object.keys(users).forEach(function(userId) {
    var user = users[userId];

    if (!user.icon || !user.icon.relativePath) return;

    styles.push("<Style id='user-" + user._id.toString() + "'><IconStyle><Icon><href>" + path.join("icons/users/", user._id.toString()) + "</href></Icon></IconStyle></Style>");
  });

  return styles.join("");
};

KmlWriter.prototype.generateObservationStyles = function(event, icons) {
  var styles = [];

  var defaultIconPath = "";
  var typePathMap = {};
  var variantPathMap = {};
  icons.forEach(function(icon) {
    if (icon.variant) {
      variantPathMap[icon.type] = variantPathMap[icon.type] || {};
      variantPathMap[icon.type][icon.variant] = icon.relativePath;
    } else if (icon.type) {
      typePathMap[icon.type] = icon.relativePath;
    } else {
      defaultIconPath = icon.relativePath;
    }
  });

  // default icon style
  styles.push("<Style id='" + event._id.toString() + "'><IconStyle><Icon><href>" + path.join("icons", defaultIconPath) + "</href></Icon></IconStyle></Style>");

  var typeField = getFieldByName(event.form, 'type');
  if (!typeField) return;
  var variantField = getFieldByName(event.form, event.form.variantField);

  typeField.choices.forEach(function(choice) {
    // create style for choice (determine if choice is in map or pick default)
    var iconPath = typePathMap[choice.title] ? typePathMap[choice.title] : defaultIconPath;
    styles.push("<Style id='" + [event._id.toString(), choice.title].join("-") + "'><IconStyle><Icon><href>" + path.join('icons', iconPath) + "</href></Icon></IconStyle></Style>");

    // variant styles for each type
    if (variantField) {
      variantField.choices.forEach(function(variantChoice) {
        if (variantPathMap[choice.title] && variantPathMap[choice.title][variantChoice.title]) {
          iconPath = variantPathMap[choice.title][variantChoice.title];
        } else if (typePathMap[choice.title]) {
          iconPath = typePathMap[choice.title];
        } else {
          iconPath = defaultIconPath;
        }
        styles.push("<Style id='" + [event._id.toString(), choice.title, variantChoice.title].join("-") + "'><IconStyle><Icon><href>" + path.join('icons', iconPath) + "</href></Icon></IconStyle></Style>");
      });
    }
  });

  return styles.join("");
};

KmlWriter.prototype.generateKMLDocument = function() {
  return "<Document>" +
    "<name>MAGE-Export.kml</name>" +
    "<open>1</open>";
};

KmlWriter.prototype.generateKMLFolderStart = function(name) {
  return "<Folder>" + "<name>" + name + "</name>";
};

KmlWriter.prototype.generateObservationPlacemark = function(name, observation, event, variant) {
  var timestamp = generateTimestamp(observation.properties.timestamp);
  var description = generateDescription(observation);

  var styles = [];
  if (event) {
    styles.push(event._id.toString());
    if (observation.properties.type) {
      styles.push(observation.properties.type);
      if (variant) {
        styles.push(variant);
      }
    }
  }

  var style = '#' + styles.join('-');
  var coordinates = generatePlacemarkCoordinates(observation);

  return generatePlacemarkElement(name, style, coordinates, timestamp, description);
};

KmlWriter.prototype.generateLocationPlacemark = function(user, location) {
  var timestamp = generateTimestamp(location.properties.timestamp);
  var description = generateDescription(location);
  var style = '#user-' + user._id.toString();
  var coordinates = generatePlacemarkCoordinates(location);

  return generatePlacemarkElement(user.displayName, style, coordinates, timestamp, description);
};

KmlWriter.prototype.generateKMLDocumentClose = function() {
  return "</Document>";
};

KmlWriter.prototype.generateKMLFolderClose = function() {
  return "</Folder>";
};

KmlWriter.prototype.generateKMLClose = function() {
  return "</kml>";
};

function generateTimestamp(timestamp) {
  return "<TimeStamp>" +
    "<when>" + moment(timestamp).utc().format("YYYY-MM-DDTHH:mm:ss") + "Z</when>" +
    "</TimeStamp>";
}

function generateDescription(geojson) {
  var description = "<description>" +
    '<![CDATA[<html xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:msxsl="urn:schemas-microsoft-com:xslt">' +
      '<head>' +
      '<META http-equiv="Content-Type" content="text/html">' +
      '<meta http-equiv="content-type" content="text/html; charset=UTF-8">' +
      '</head>';

  description += '<table style="font-family:Arial,Verdana,Times;font-size:12px;text-align:left;width:100%;border-collapse:collapse;padding:3px 3px 3px 3px">';

  description +=
    '<tr bgcolor="#D4E4F3">' +
      '<td>Lat</td>' + '<td>' + geojson.geometry.coordinates[1] + '</td>' +
    '<tr>';
  description +=
    '<tr>' +
      '<td>Lon</td>' + '<td>' + geojson.geometry.coordinates[0] + '</td>' +
    '<tr>';

  var odd = true;
  Object.keys(geojson.properties).forEach(function(key) {
    var color = "";
    if (odd) color = "#D4E4F3";
    odd = !odd;

    description +=
    '<tr bgcolor="' + color + '">' +
      '<td>' + key + '</td>' + '<td>' + geojson.properties[key] + '</td>' +
    '</tr>';
  });

  description += '</table>';

  //does this feature have media
  if (geojson.attachments && geojson.attachments.length) {
    description += '<div>';

    geojson.attachments.forEach(function(attachment) {
      description += '<div style="padding-top:15px;"><a href="' + attachment.relativePath + '">' + attachment.name + '</a></div>';

      //determine media type (image or other)
      if ((/^image/).test(attachment.contentType)) {
        description +=
          '<div>' +
            '<img src="' + attachment.relativePath + '" width="150"; height="150";/>' +
          '</div>';
      }
    });

    description += '</div>';
  }

  description += '</html>]]></description>';

  return description;
}

function generatePlacemarkCoordinates(geojson) {
  var coordinates = "<Point><coordinates>" +
    geojson.geometry.coordinates[0] + "," +
    geojson.geometry.coordinates[1];

  if (geojson.properties.altitude) {
    coordinates += "," + geojson.properties.altitude;
  }

  coordinates += "</coordinates></Point>";

  if (geojson.properties.altitude) {
    coordinates += "<altitudeMode>absolute</altitudeMode>";
  }

  return coordinates;
}

function generatePlacemarkElement(name, style, coordinates, timestamp, description) {
  return "<Placemark>" +
      "<name>" + name + "</name>" +
      "<visibility>0</visibility>" +
      "<styleUrl>" + style + "</styleUrl>" +
      coordinates +
      timestamp +
      description +
    "</Placemark>";
}

function getFieldByName(form, name) {
  for (var i = 0; i < form.fields.length; i++) {
    if (form.fields[i].name === name) return form.fields[i];
  }

  return null;
}
