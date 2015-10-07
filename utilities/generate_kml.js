module.exports = function(options) {

var moment = require('moment')
  , path = require('path')
  , config = require('../config.json');

var timeFormat = "YYYY-MM-DDTHH:mm:ss";

var generateKMLHeader = function() {
  return "<?xml version='1.0' encoding='UTF-8'?>" +
               "<kml xmlns='http://www.opengis.net/kml/2.2' " +
               "xmlns:gx='http://www.google.com/kml/ext/2.2' " +
               "xmlns:kml='http://www.opengis.net/kml/2.2' " +
               "xmlns:atom='http://www.w3.org/2005/Atom'>";
};

var generateKMLDocument = function() {
  return "<Document>" +
	          "<name>MAGE-Export.kml</name>" +
	          "<open>1</open>";
};

var getFieldByName = function(form, name) {
  for (var i = 0; i < form.fields.length; i++) {
    if (form.fields[i].name === name) return form.fields[i];
  }

  return null;
}

var generateStyles = function(event, icons) {
  var styles = [];

  var defaultIcon = "";
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
}

var generateKMLFolderStart = function(name) {
  return "<Folder>" + "<name>" + name + "</name>";
};

var generatePlacemark = function(name, feature, event, variant) {
  var timestamp = "<TimeStamp>" +
    "<when>" + moment(feature.properties.timestamp).utc().format(timeFormat) + "Z</when>" +
    "</TimeStamp>";

  var description = "<description>" +
    '<![CDATA[<html xmlns:fo="http://www.w3.org/1999/XSL/Format" xmlns:msxsl="urn:schemas-microsoft-com:xslt">' +
      '<head>' +
      '<META http-equiv="Content-Type" content="text/html">' +
      '<meta http-equiv="content-type" content="text/html; charset=UTF-8">' +
      '</head>';

  description += '<table style="font-family:Arial,Verdana,Times;font-size:12px;text-align:left;width:100%;border-collapse:collapse;padding:3px 3px 3px 3px">';

  description +=
    '<tr bgcolor="#D4E4F3">' +
      '<td>Lat</td>' + '<td>' + feature.geometry.coordinates[1] + '</td>' +
    '<tr>';
  description +=
    '<tr>' +
      '<td>Lon</td>' + '<td>' + feature.geometry.coordinates[0] + '</td>' +
    '<tr>';

  var odd = true;
  Object.keys(feature.properties).forEach(function(key) {
    var color = "";
    if (odd) color = "#D4E4F3";
    odd = !odd;

    description +=
    '<tr bgcolor="' + color + '">' +
      '<td>' + key + '</td>' + '<td>' + feature.properties[key] + '</td>' +
    '</tr>';
  });

  description += '</table>';

  //does this feature have media
  if (feature.attachments && feature.attachments.length) {
    description += '<div>'

    feature.attachments.forEach(function(attachment) {
      description += '<div style="padding-top:15px;"><a href="files/' + attachment.relativePath + '">' + attachment.name + '</a></div>';

      //determine media type (image or other)
      if ((/^image/).test(attachment.contentType)) {
        description +=
          '<div>' +
            '<img src="attachments/' + attachment.relativePath + '" width="150"; height="150";/>' +
          '</div>';
      }
    });

    description += '</div>';
  }

  description += '</html>]]></description>';

  var style = [];
  if (event) {
    style.push(event._id.toString());
    if (feature.properties.type) {
      style.push(feature.properties.type);
      if (variant) {
        style.push(variant);
      }
    }
  }

  var coordinates = "<Point><coordinates>" +
  feature.geometry.coordinates[0] + "," +
  feature.geometry.coordinates[1];

  if (feature.properties.altitude) {
    coordinates += "," + feature.properties.altitude;
  }

  coordinates += "</coordinates></Point>";

  if (feature.properties.altitude) {
    coordinates += "<altitudeMode>absolute</altitudeMode>";
  }

  //build the actual placemark
  var placemark =
    "<Placemark>" +
      "<name>" + name + "</name>" +
      "<visibility>0</visibility>" +
      "<styleUrl>#" + style.join("-") + "</styleUrl>" +
      coordinates +
      timestamp +
      description +
    "</Placemark>";

  return placemark;
};

var generateKMLDocumentClose = function() {
  var doc = "</Document>";
  return doc;
};

var generateKMLFolderClose = function() {
  var folder = "</Folder>";
  return folder;
};

var generateKMLClose = function() {
	var kml = "</kml>";
	return kml;
};

return {
  generateKMLHeader: generateKMLHeader,
  generateStyles: generateStyles,
  generateKMLDocument: generateKMLDocument,
  generateKMLFolderStart: generateKMLFolderStart,
  generatePlacemark: generatePlacemark,
  generateKMLFolderClose: generateKMLFolderClose,
  generateKMLDocumentClose: generateKMLDocumentClose,
  generateKMLClose: generateKMLClose
 }

}()
