module.exports = function(options) {

var featureTypes = require('../models/featureType')
  , moment = require('moment')
  , config = require('../config.json');

var deploymentType = config.server.type;

var generateKMLHeader = function() {
  var header = "<?xml version='1.0' encoding='UTF-8'?>" + 
               "<kml xmlns='http://www.opengis.net/kml/2.2' " + 
               "xmlns:gx='http://www.google.com/kml/ext/2.2' " + 
               "xmlns:kml='http://www.opengis.net/kml/2.2' " + 
               "xmlns:atom='http://www.w3.org/2005/Atom'>";
  return header;
};

var generateKMLDocument = function() {
	
  var types = featureTypes.getFeatureTypes(deploymentType);

  var doc = "<Document>" + 
	          "  <name>MAGE-Export.kml</name>" +
	          "  <open>1</open>";

  types.forEach(function(type) {
    doc += "<Style id='" + type.name + "-blue'><IconStyle><Icon><href>icons/blue/" + type.kmlIcon +     ".png</href></Icon></IconStyle></Style>";
    doc += "<Style id='" + type.name + "-green'><IconStyle><Icon><href>icons/green/" + type.kmlIcon +   ".png</href></Icon></IconStyle></Style>";
    doc += "<Style id='" + type.name + "-yellow'><IconStyle><Icon><href>icons/yellow/" + type.kmlIcon + ".png</href></Icon></IconStyle></Style>";
    doc += "<Style id='" + type.name + "-red'><IconStyle><Icon><href>icons/red/" + type.kmlIcon +       ".png</href></Icon></IconStyle></Style>";
  });
	
  return doc;
};

var generateKMLFolderStart = function(name) {
  var folder = "<Folder>" + 
               "  <name>" + name + "</name>";

  return folder;
};

var generatePlacemark = function(name, styleUrl, lon, lat, alt, feature, attachments) {
  var timestamp = "<TimeStamp>" +
    "<when>" + moment(feature.timestamp).toISOString() + "</when>" +
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
      '<td>Lat</td>' + '<td>' + lat + '</td>' +
    '<tr>';
  description += 
    '<tr>' +
      '<td>Lon</td>' + '<td>' + lon + '</td>' +
    '<tr>';

  var odd = true;
  Object.keys(feature).forEach(function(key) {
    var color = "";
    if (odd) color = "#D4E4F3";
    odd = !odd;

    description += 
    '<tr bgcolor="' + color + '">' +
      '<td>' + key + '</td>' + '<td>' + feature[key] + '</td>' +
    '</tr>';
  });

  description += '</table>';

  //does this feature have media
  if (attachments && attachments.length) {
    description += '<div>'

    attachments.forEach(function(attachment) {
      description += '<div style="padding-top:15px;"><a href="files/' + attachment.relativePath + '">' + attachment.name + '</a></div>';

      //determine media type (image or other)
      if ((/^image/).test(attachment.contentType)) {
        description += 
          '<div>' + 
            '<img src="files/' + attachment.relativePath + '" width="150"; height="150";/>' +
          '</div>';
      }
    });

    description += '</div>';
  }

  description += '</html>]]></description>';

  //determine event level ***REMOVED***ign icon color
  switch (feature.EVENTLEVEL) {
    case 'None':
      styleColor = "blue";
      break;
    case 'Low':
      styleColor = "green";
      break;
    case 'Medium':
      styleColor = "yellow";
      break;
    case 'High':
      styleColor = "red";
      break;
    default:
      styleColor = "blue";
  }

  //build the actual placemark
  var placemark = 
    "<Placemark>" + 
      "<name>" + name + " " + feature.timestamp + "</name>" + 
      "<visibility>0</visibility>" +
      "<styleUrl>#" + styleUrl + "-" + styleColor + "</styleUrl>" +
      "<Point>" +
      "<coordinates>" + lon + "," + lat + "," + alt + "</coordinates>" +
      "</Point>" +
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
  generateKMLDocument: generateKMLDocument,
  generateKMLFolderStart: generateKMLFolderStart,
  generatePlacemark: generatePlacemark,
  generateKMLFolderClose: generateKMLFolderClose,
  generateKMLDocumentClose: generateKMLDocumentClose,
  generateKMLClose: generateKMLClose
 }

}()