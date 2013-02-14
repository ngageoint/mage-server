var express = require("express");
var multipart = require("multipart");
var fs = require("fs");
var mongoose = require('mongoose');

var db = mongoose.connect('mongodb://localhost/sagedb');

// Config
app.configure(function () {
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(application_root, "public")));
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});



var Schema = mongoose.Schema;  

var Product = new Schema({  
    title: { type: String, required: true },  
    description: { type: String, required: true },  
    style: { type: String, unique: true },  
    modified: { type: Date, default: Date.now }
});

var ProductModel = mongoose.model('Product', Product); 

app.get('api', function (req, res) {
	res.send('Ecomm API is running');
});

app.get('api/products', function (req, res){
	return ProductModel.find(function (err, products) {
		if (!err) {
			return res.send(products);
		} else {
			return console.log(err);
		}
	});
});

app.post('api/products', function (req, res){
	var product;
	console.log("POST: ");
	console.log(req.body);
	product = new ProductModel({
		title: req.body.title,
		description: req.body.description,
		style: req.body.style,
	});
	product.save(function (err) {
		if (!err) {
			return console.log("created");
		} else {
			return console.log(err);
		}
	});
	return res.send(product);
}); 

// Launch server
app.listen(4242); 