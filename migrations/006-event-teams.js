var Team = require('../models/team')
  , Event = require('../models/event');

exports.id = '006-event-teams';

exports.up = function(done) {
  console.log('\nCreating team for each event');

  Event.getEvents(function(err, events) {
    events.forEach(function(event) {

      Team.createTeamForEvent(event, function(err, eventTeam) {
        if (err) {
          console.log('Error creating team for event ' + event.name);
          return done(err);
        }

        console.log('Created team ' + eventTeam.name + ' for event ' + event.name);
        done();
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
