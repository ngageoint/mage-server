var connect = require('connect')
  , http = require('http')
  , multer = require('../');

// multer

var app = connect()

  //.use(multer())

  
  /*
  .use(multer({
    dest: './images/'
  }))
  */

  .use(multer({
    onParseEnd: function() {
      console.log('Form processed!');
    }
  }))


  /*
  .use(multer({
    dest: './images/',
    rename: function(fieldname, filename) {
      return Date.now();
    }
  }))
  */

  /*
  .use(multer({
    dest: './images/',
    rename: function(fieldname, filename) {
      return filename.toLowerCase().replace(/\W/g, '-') +'-'+ Date.now();
    },
    onFileUploadStart: function(file) {
      console.log('START: ' + file.name);
    },
    onFileUploadData: function(file, data) {
      console.log('DATA ' + file.name + ': ' + data.length);
    },
    onFileUploadComplete: function(file) {
      console.log('COMPLETE: ' + file.name);
    }
  }))
  */

  .use(function(req, res){
    console.log(req.body);
    console.log(req.files);
    res.end('Hello from Connect!\n');
  });

http.createServer(app).listen(3000);
