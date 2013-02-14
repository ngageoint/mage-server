// JavaScript Document

var Db = require('mongodb').Db;
var Server = require('mongodb').Server;

var client = new Db('sagedb', new Server('127.0.0.1', 27017, {}));

var listAllData = function(err, collection) {
    collection.find().toArray(function(err, results) {
        console.log(results);
    });
}

client.open(function(err, pClient) {
    client.collection('features', listAllData);
});

/*var insertData = function(err, collection) {
    collection.insert({name: "Kristiono Setyadi"});
    collection.insert({name: "Meghan Gill"});
    collection.insert({name: "Spiderman"});
    // you can add as many object as you want into the database
}

var removeData = function(err, collection) {
    collection.remove({name: "Spiderman"});
}

var updateData = function(err, collection) {
    collection.update({name: "Kristiono Setyadi"}, {name: "Kristiono Setyadi", sex: "Male"});
}

var listAllData = function(err, collection) {
    collection.find().toArray(function(err, results) {
        console.log(results);
    });
}

client.open(function(err, pClient) {
    client.collection('test_insert', insertData);
    client.collection('test_insert', removeData);
    // etc.
});*/