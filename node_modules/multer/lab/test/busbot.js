var http = require('http'),
    inspect = require('util').inspect;

var Busboy = require('busboy');

http.createServer(function(req, res) {
  if (req.method === 'POST') {
    var busboy = new Busboy({ headers: req.headers });
    // busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    //   console.log('File [' + fieldname +']: filename: ' + filename + ', encoding: ' + encoding);
    //   file.on('data', function(data) {
    //     console.log('File [' + fieldname +'] got ' + data.length + ' bytes');
    //   });
    //   file.on('end', function() {
    //     console.log('File [' + fieldname +'] Finished');
    //   });
    // });
    busboy.on('field', function(fieldname, val, valTruncated, keyTruncated) {
      console.log('Field [' + fieldname + ']: value: ' + inspect(val));
    });
    busboy.on('end', function() {
      console.log('Done parsing form!');
      res.writeHead(303, { Connection: 'close', Location: '/' });
      res.end();
    });
    req.pipe(busboy);
  } else if (req.method === 'GET') {
    res.writeHead(200, { Connection: 'close' });
    res.end('<html><head></head><body>\
               <form method="POST" enctype="multipart/form-data" action="http://localhost:3000/">\
                <input type="text" name="inpuet"><br />\
                <input type="submit">\
              </form>\
            </body></html>');
  }
}).listen(8000, function() {
  console.log('Listening for requests');
});