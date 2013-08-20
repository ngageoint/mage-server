module.exports = function(options) {

featureTypes = require('../models/featureType')

var generateKMLHeader = function() {
  var header = "<?xml version='1.0' encoding='UTF-8'?>" + 
               "<kml xmlns='http://www.opengis.net/kml/2.2' " + 
               "xmlns:gx='http://www.google.com/kml/ext/2.2' " + 
               "xmlns:kml='http://www.opengis.net/kml/2.2' " + 
               "xmlns:atom='http://www.w3.org/2005/Atom'>";
  return header;
};

var generateKMLDocument = function() {
	
  var types = featureTypes.getFeatureTypes();

  var doc = "<Document>" + 
	          "  <name>MAGE-Export.kml</name>" +
	          "  <open>1</open>";
  for(i in types) {
    var type = types[i];
    doc += "<Style id='" + type.name + "-blue'><IconStyle><Icon><href>icons/blue/" + type.kmlIcon +     ".png</href></Icon></IconStyle></Style>";
    doc += "<Style id='" + type.name + "-green'><IconStyle><Icon><href>icons/green/" + type.kmlIcon +   ".png</href></Icon></IconStyle></Style>";
    doc += "<Style id='" + type.name + "-yellow'><IconStyle><Icon><href>icons/yellow/" + type.kmlIcon + ".png</href></Icon></IconStyle></Style>";
    doc += "<Style id='" + type.name + "-red'><IconStyle><Icon><href>icons/red/" + type.kmlIcon +       ".png</href></Icon></IconStyle></Style>";
  }
	 return doc;
};

var generateKMLFolderStart = function(name) {
  var folder = "<Folder>" + 
               "  <name>" + name + "</name>"; 
  return folder;
};

var generatePlacemark = function(name, styleUrl, lon, lat, alt, feature, attachments) {
  
  var desc = "<h4>Properties</h4>";
  Object.keys(feature).forEach(function(key) {
    desc += key + ':  ' + feature[key] + '<br/>';
  });

  //does this feature have media
  var media = "<h4>Media Attachments</h4>";
  if(attachments) {
    for(var i = 0; i < attachments.length; i++) {
      var attachment = attachments[i];

      //determine media type (image or other)
      if((/^image/).test(attachment.contentType)) {
        media += '<img src="files/' + attachment.relativePath + '/' + attachment.name + '" width="300"/><br/>';
      }
      else {
        media += '<a href="files/' + attachment.relativePath + '/' + attachment.name + '">' + attachment.name + '</a><br/>';
      }    
    }
  }

  //determine event level ***REMOVED***ign icon color
  switch (feature.EVENTLEVEL) 
  {
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
  var placemark = "<Placemark>" + 
                  "  <name>" + name + "</name>" + 
                  "  <styleUrl>#" + styleUrl + "-" + styleColor + "</styleUrl>" +
                  "  <Point>" +
                  "    <coordinates>" + lon + "," + lat + "," + alt + "</coordinates>" +
                  "  </Point>" +
                  "  <description>" + desc + '<br/>' + media +"</description>" + 
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