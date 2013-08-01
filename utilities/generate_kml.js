module.exports = function(options) {

var generateKMLHeader = function() {
  var header = "<?xml version='1.0' encoding='UTF-8'?>" + 
               "<kml xmlns='http://www.opengis.net/kml/2.2' " + 
               "xmlns:gx='http://www.google.com/kml/ext/2.2' " + 
               "xmlns:kml='http://www.opengis.net/kml/2.2' " + 
               "xmlns:atom='http://www.w3.org/2005/Atom'>";
  return header;
};

var generateKMLDocument = function() {
	var doc = "<Document>" + 
	          "  <name>MAGE-Export.kml</name>" +
	          "  <open>1</open>" +
            "  <Style id='Animal Issue'><IconStyle> <Icon> <href>icons/bear.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Chemical Hazard'><IconStyle> <Icon> <href>icons/radiation.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Command Post'><IconStyle> <Icon> <href>icons/emb***REMOVED***y.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Confirmed Victim'><IconStyle> <Icon> <href>icons/pirates.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Confirmed Victim Removed'><IconStyle> <Icon> <href>icons/rescue-2.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Emergency Collection Point'><IconStyle> <Icon> <href>icons/communitycentre.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Fire'><IconStyle> <Icon> <href>icons/fire.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Helicopter Landing Site'><IconStyle> <Icon> <href>icons/helicopter.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Human Remains'><IconStyle> <Icon> <href>icons/headstone-2.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Possible Criminal Activity'><IconStyle> <Icon> <href>icons/wrestling-2.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Shelter in Place'><IconStyle> <Icon> <href>icons/bunker-2-2.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Special Needs'><IconStyle> <Icon> <href>icons/nursing_home_icon.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Staging Area'><IconStyle> <Icon> <href>icons/regroup.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Start Search'><IconStyle> <Icon> <href>icons/start-race-2.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Stop Search'><IconStyle> <Icon> <href>icons/stop.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Structure Damaged but Safe'><IconStyle> <Icon> <href>icons/hut.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Structure Major Damage No Entry'><IconStyle> <Icon> <href>icons/earthquake-3.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Structure No Damage'><IconStyle> <Icon> <href>icons/home-2.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Victim Detected'><IconStyle> <Icon> <href>icons/crimescene.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Water Level'><IconStyle> <Icon> <href>icons/flood.png</href> </Icon></IconStyle></Style>" + 
            "  <Style id='FFT'><IconStyle> <Icon> <href>icons/male-2.png</href> </Icon></IconStyle></Style>";
	 return doc;
};

var generateKMLFolderStart = function(name) {
  var folder = "<Folder>" + 
               "  <name>" + name + "</name>"; 
  return folder;
};

var generatePlacemark = function(name, styleUrl, lon, lat, alt, desc, attachments) {
  
  var images;
  if(attachments) {
    for(var i = 0; i < attachments.length; i++) {
      var attachment = attachments[i];
      images = images + '<img src="files/' + attachment.relativePath + '/' + attachment.name + '"/>';
    }
  }

  var placemark = "<Placemark>" + 
                  "  <name>" + name + "</name>" + 
                  "  <styleUrl>#" + styleUrl + "</styleUrl>" +
                  "  <Point>" +
                  "    <coordinates>" + lon + "," + lat + "," + alt + "</coordinates>" +
                  "  </Point>" +
                  "  <description>" + desc + '<br/>' + images +"</description>" + 
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