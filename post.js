jQuery.post("./api/v1/features", {
		"x": -1,
		"y": -2,
	    "OBJECTID": 2,  
		"ADDRESS": "DELETE",  
		"EVENTDATE": 1351859700000,  
		"TYPE": "Fire",  
		"EVENTLEVEL": "normal",  
		"TEAM": "", 
		"DESCRIPTION": "POST",  
		"USNG": "",  
		"EVENTCLEAR": 0,
		"UNIT": ""
}, function (data, textStatus, jqXHR) {
console.log("Post resposne:"); console.dir(data); console.log(textStatus); console.dir(jqXHR);
}); 