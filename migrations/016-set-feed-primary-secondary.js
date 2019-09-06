var mongoose = require('mongoose')
  , async = require('async')
  , RoleModel = mongoose.model('Role');

exports.id = 'set-feed-primary-secondary';

exports.up = function(done) {
  console.log('\nUpdating forms to have a feed primary and secondary option...');

  async.waterfall([
    getEvents,
    migrateEvents
  ], function(err) {
    done(err);
  });
};

exports.down = function(done) {
  // remove the feed primary and secondary
};

function getEvents(callback) {
  console.log('get events');

  var EventModel = mongoose.model('Event');
  EventModel.find({}).lean().exec(function(err, events) {
    callback(err, events);
  });
}

function migrateEvents(events, callback) {
  console.log('migrate events');

  var EventModel = mongoose.model('Event');

  async.eachSeries(events, function(event, done) {
    EventModel.findById(event._id).lean().exec(function(err, event) {
      for (const form of event.forms) {
        form.primaryFeedField = form.primaryField;
        form.secondaryFeedField = form.variantField;
      }
      EventModel.findByIdAndUpdate(event._id, event, {overwrite: true}, done);
    })
  }, function(err) {
    callback(err);
  });
}
