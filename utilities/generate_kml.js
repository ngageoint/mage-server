module.exports = function(options) {

var generateKMLHeader = function() {
  var header = "<?xml version='1.0' encoding='UTF-8'?>" + 
               "<kml xmlns='http://www.opengis.net/kml/2.2' xmlns:gx='http://www.google.com/kml/ext/2.2' xmlns:kml='http://www.opengis.net/kml/2.2' xmlns:atom='http://www.w3.org/2005/Atom'>";
  return header;
};

var generateKMLDocument = function() {
	var doc = "<Document>" + 
	          "<name>MAGE Export</name>" +
	          "<open>1</open>";
	           return doc;
};

var generatePlacemark = function(name, styleUrl, lat, lon, alt) {
  var placemark = "<Placemark>" + 
                  "  <name>" + name + "</name>" + 
                  "  <styleUrl>" + styleUrl + "</styleUrl>" +
                  "  <Point>" +
                  "    <coordinates>" + lon + "," + lat + "," + alt + "</coordinates>" +
                  "  </Point>" +
                  "</Placemark>";
  return placemark;
};

var generateKMLDocumentClose = function() {
  var doc = "</Document>";	
  return doc;
};

var generateKMLClose = function() {
	var kml = "</kml>";
	return kml;
};

return {
  generateKMLHeader: generateKMLHeader,
  generateKMLDocument: generateKMLDocument,
  generatePlacemark: generatePlacemark,
  generateKMLDocumentClose: generateKMLDocumentClose,
  generateKMLClose: generateKMLClose
 }

}()