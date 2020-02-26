var nock = require('nock');
var fs = require('fs');

// record.js enables us to save off http requests as they are
// run during functional tests.  It will write them to a file
// named testRecordings.js, which can be used later for
// offline testing.

module.exports = function (name, options) {
  // options tell us where to store our fixtures
  options = options || {};
  var fp = 'functionalTests/testRecordings.js';
  // `has_fixtures` indicates whether the test has fixtures we should read,
  // or doesn't, so we should record and save them.
  // the environment variable `NOCK_RECORD` can be used to force a new recording.
  var hasFixtures = !!process.env.NOCK_RECORD;
  // Set this to false if you don't want to save the file
  var saveToFile = true;


  return {
    // starts recording, or ensure the fixtures exist
    before: function () {
      if (!hasFixtures) try {
        console.log('Has Fixtures: testRecordings should exist');
        require('../' + fp);
        hasFixtures = true;
      } catch (e) {
        console.log('Caught error loading fixtures, recording');
        nock.recorder.rec({
          use_separator: false, // eslint-disable-line camelcase
          dont_print: true // eslint-disable-line camelcase
        });
      } else {
        console.log('Doesn\'t have Fixtures');
        hasFixtures = false;
        nock.recorder.rec({
          use_separator: false, // eslint-disable-line camelcase
          dont_print: true // eslint-disable-line camelcase
        });
      }
    },
    // saves our recording if fixtures didn't already exist
    after: function () {
      if (!hasFixtures && saveToFile) {
        var recordedText = nock.recorder.play();
        console.log("----- Record.js: Saving http request recording -----");
        console.log("Saving file at: " + fp);
        var text = "var nock = require('nock');\n" + recordedText.join('\n');
        // Use "sync" version to force execution to wait for file to be written
        fs.writeFileSync(fp, text, 'utf8', function (err) {
          if (err) return console.log(err);
        });
      } else {
        console.log("*** Not saving http request recording.  It's likely the " +
        "file already exists.");
      }
    }
  };
};
