var http = require("http");
//var exec = require('child_process').exec;

http.createServer(function(req, res) {
  
    res.writeHead(200,{"Content-Type": "application/vnd.google-earth.kml+xml"});
    res.write(generateKMLHeader());
    res.write(generateKMLDocument());
    res.write(generatePlacemark('point1', 'localhost', 39.83636818,-105.646844,3332.199951));
    res.write(generateKMLDocumentClose());
    res.end(generateKMLClose());

}).listen(8000);
console.log('Node server running');


function generateKMLHeader() {
  var header = "<?xml version='1.0' encoding='UTF-8'?>" + 
               "<kml xmlns='http://www.opengis.net/kml/2.2' xmlns:gx='http://www.google.com/kml/ext/2.2' xmlns:kml='http://www.opengis.net/kml/2.2' xmlns:atom='http://www.w3.org/2005/Atom'>";
  return header;
}

function generateKMLDocument() {
	var doc = "<Document>" + 
	          "<name>MAGE Export</name>" +
	          "<open>1</open>";
	           return doc;
}

function generatePlacemark(name, styleUrl, lat, lon, alt) {
  var placemark = "<Placemark>" + 
                  "  <name>" + name + "</name>" + 
                  "  <styleUrl>" + styleUrl + "</styleUrl>" +
                  "  <Point>" +
                  "    <coordinates>" + lon + "," + lat + "," + alt + "</coordinates>" +
                  "  </Point>" +
                  "</Placemark>";
  return placemark;
}

function generateKMLDocumentClose() {
  var doc = "</Document>";	
  return doc;
}

function generateKMLClose() {
	var kml = "</kml>";
	return kml;
}