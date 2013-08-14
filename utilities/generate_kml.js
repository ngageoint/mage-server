module.exports = function(options) {

feature_types = require('../utilities/feature_types')

var generateKMLHeader = function() {
  var header = "<?xml version='1.0' encoding='UTF-8'?>" + 
               "<kml xmlns='http://www.opengis.net/kml/2.2' " + 
               "xmlns:gx='http://www.google.com/kml/ext/2.2' " + 
               "xmlns:kml='http://www.opengis.net/kml/2.2' " + 
               "xmlns:atom='http://www.w3.org/2005/Atom'>";
  return header;
};

var generateKMLDocument = function() {
	
  var types = feature_types.getTypes();

  var doc = "<Document>" + 
	          "  <name>MAGE-Export.kml</name>" +
	          "  <open>1</open>";
  for(i in types) {
    var type = types[i];
    doc += "<Style id='" + type.name + "-blue'><IconStyle><Icon><href>icons/" + type.icon + "-blue.png</href></Icon></IconStyle></Style>";
    doc += "<Style id='" + type.name + "-green'><IconStyle><Icon><href>icons/" + type.icon + "-green.png</href></Icon></IconStyle></Style>";
    doc += "<Style id='" + type.name + "-yellow'><IconStyle><Icon><href>icons/" + type.icon + "-yellow.png</href></Icon></IconStyle></Style>";
    doc += "<Style id='" + type.name + "-red'><IconStyle><Icon><href>icons/" + type.icon + "-red.png</href></Icon></IconStyle></Style>";
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

  var media = "<h4>Media Attachments</h4>";
  if(attachments) {
    for(var i = 0; i < attachments.length; i++) {
      var attachment = attachments[i];


      if((/^image/).test(attachment.contentType)) {
        media += '<img src="files/' + attachment.relativePath + '/' + attachment.name + '" width="300"/><br/>';
      }
      else {
        media += '<a href="files/' + attachment.relativePath + '/' + attachment.name + '>' + attachment.name + '"</a><br/>';
      }
    
    }
  }

  switch (feature.EVENTLEVEL) 
  {
    case 'Normal':
      styleColor = "blue";
      break;
    case 'Yellow':
      styleColor = "yellow";
      break;
    case 'Green':
      styleColor = "green";
      break;
    case 'Red':
      styleColor = "red";
      break;
    default:
      styleColor = "blue";
  }

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