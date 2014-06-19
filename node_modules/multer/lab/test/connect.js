var connect = require('connect');
var multer = require('..');
var http = require('http');

var app = connect()
        //.use(multer())


  .use(multer({
    dest: './images/'
    // , rename: function(fieldname, filename) {
    //   return filename + Date.now();
    // }
  }))

  // .use(multer({
  //   onParseEnd: function() {
  //     console.log('Form processed!');
  //   }
  // }))

        .use(function(req, res, next) {
          console.log('MIDDLWARE');
          next();
        })
        .use(function(req, res){
          console.log(req.body);
          console.log(req.files);
          res.end('OK');
        });

http.createServer(app).listen(3000);

//curl -X POST http://localhost:3000 --data "name=LOLA" --header "Content-Type=multipart/form-data; boundary=Multer2347892789273421499814"