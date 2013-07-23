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
            "  <Style id='Animal Issue'><IconStyle> <Icon> <href>animal_issue.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Chemical Hazard'><IconStyle> <Icon> <href>hazardous_material_incident.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Command Post'><IconStyle> <Icon> <href>.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Confirmed Victim'><IconStyle> <Icon> <href>confirmed_survivor.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Confirmed Victim Removed'><IconStyle> <Icon> <href>confirmed_victim_removed.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Emergency Collection Point'><IconStyle> <Icon> <href>emergency_shelter.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Fire'><IconStyle> <Icon> <href>.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Helicopter Landing Site'><IconStyle> <Icon> <href>helicopter_landing_site.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Human Remains'><IconStyle> <Icon> <href>human_remains.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Possible Criminal Activity'><IconStyle> <Icon> <href>.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Shelter in Place'><IconStyle> <Icon> <href>shelter_in_place.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Special Needs'><IconStyle> <Icon> <href>***REMOVED***isted.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Staging Area'><IconStyle> <Icon> <href>.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Start Search'><IconStyle> <Icon> <href>.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Stop Search'><IconStyle> <Icon> <href>.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Structure Damaged but Safe'><IconStyle> <Icon> <href>structure_minor_damage.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Structure Major Damage No Entry'><IconStyle> <Icon> <href>structure_major_damage.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Structure No Damage'><IconStyle> <Icon> <href>structure_no_damage.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Victim Detected'><IconStyle> <Icon> <href>human_remains.png</href> </Icon></IconStyle></Style>" +
            "  <Style id='Water Level'><IconStyle> <Icon> <href>flood_water_level.png</href> </Icon></IconStyle></Style>";
	 return doc;
};

var generateKMLFolderStart = function(name) {
  var folder = "<Folder>" + 
               "  <name>" + name + "</name>"; 
  return folder;
};

var generatePlacemark = function(name, styleUrl, lon, lat, alt, desc) {
  var placemark = "<Placemark>" + 
                  "  <name>" + name + "</name>" + 
                  "  <styleUrl>#" + styleUrl + "</styleUrl>" +
                  "  <Point>" +
                  "    <coordinates>" + lon + "," + lat + "," + alt + "</coordinates>" +
                  "  </Point>" +
                  "  <description>" + desc + "</description>" + 
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