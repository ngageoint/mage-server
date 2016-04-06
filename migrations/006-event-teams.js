var async = require('async')
  , mongoose = require('mongoose')
  , Team = require('../models/team')
  , Event = require('../models/event');

exports.id = '006-event-teams';

exports.up = function(done) {
  console.log('\nCreating team for each event');

  mongoose.model('Team').collection.dropAllIndexes(function (err) {
    if (err) console.log('could not drop indexes', err);

    Event.getEvents(function(err, events) {
      async.each(events, function(event, done) {
        Team.createTeamForEvent(event, function(err, eventTeam) {
          if (err) {
            console.log('Error creating team for event ' + event.name);
            return done(err);
          }

          console.log('Created team ' + eventTeam.name + ' for event ' + event.name);
          done();
        });
      }, function(err) {
        done(err);
      });
    });
  });
};

exports.down = function(done) {
  Event.getEvents(function(err, events) {
    if (err) return done(err);

    events.forEach({populate: 'teamIds'}, function(event) {
      event.teamsIds.forEach(function(team) {
        if (team.teamEventId) {
          Team.deleteTeam(team, function(err) {
            done(err);
          });
        }
      });
    });
  });
};
