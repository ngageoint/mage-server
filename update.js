var x=Math.floor((Math.random()*42) + 81);
var y=Math.floor((Math.random()*14) + 30);

var x=x - x - x;
	
jQuery.ajax({
	url: "./api/v1/features",
	type: "PUT",
	data: {
		"x": "",
		"y": ""
	},
	success: function (data, textStatus, jqXHR) {
		console.log("Post resposne:");
		console.dir(data);
		console.log(textStatus);
	}
}); 