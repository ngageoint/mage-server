module.exports = function(config) {
	var async = require('async')
	  , restler = require('restler')
	  , sleep = require('sleep');

	// TODO need to encrypt these
	var username = 'admin';
	var p***REMOVED***word = 'admin';
	var uid = 12345;

	var getToken = function(done) {
		done();
	}

	var getFeatures = function() {
	}

	var syncAttachments = function(feature) {
	}

	var token;

	while(true) {
	  console.log('pulling data');

	  async.series({
	    token: function(done) {
	    	getToken(function() {
	    		done(null, 1);
	    	});
	    },
	    features: function(done) {
	      done(null, 2);
	    }
	  },
	  function(err, results) {
	    // all done each ran in order, results is now equal to: {token: 1, features: 2, etc...}
	  });


	  sleep.sleep(config.timeout);
	}
}