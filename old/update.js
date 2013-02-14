jQuery.ajax({
	url: "./api/v1/features/5050edc80f1f5fc8fa2f9495",
	type: "PUT",
	data: {
		"x": "x1",
		"y": "y1",
	    "OBJECTID": "0987654321",  
		"ADDRESS": "Updated",  
		"EVENTDATE": "Mar-21-12",  
		"TYPE": "Fire",  
		"EVENTLEVEL": "normal",  
		"TEAM": "", 
		"DESCRIPTION": "test for mongoose update",  
		"USNG": "",  
		"EVENTCLEAR": "",
		"UNIT": ""
	},
	success: function (data, textStatus, jqXHR) {
		console.log("Post resposne:");
		console.dir(data);
		console.log(textStatus);
	}
}); 