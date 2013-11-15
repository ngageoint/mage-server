JSZip
=====

An AMD version of the library by [STUK](https://github.com/Stuk/jszip) for creating, reading and editing .zip files with Javascript, with a lovely and simple API.

build with

```bash
npm run-script build
```

```javascript
var zip = new JSZip();

zip.file("Hello.txt", "Hello World\n");

var img = zip.folder("images");
img.file("smile.gif", imgData, {base64: true});

var content = zip.generate();

location.href = "data:application/zip;base64," + content;
/*
Results in a zip containing
Hello.txt
images/
    smile.gif
*/
```

License
=======

JSZip is dual-licensed. You may use it under the MIT license *or* the GPLv3
license. See LICENSE.markdown.
