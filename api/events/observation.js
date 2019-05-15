var events = require('events');

function ObservationEvent() {
}

ObservationEvent.events = {
  add: 'add',
  update: 'update',
  remove: 'remove'
};

ObservationEvent.prototype = new events.EventEmitter;

ObservationEvent.prototype.add = function(listener) {
  this.addListener(ObservationEvent.events.add, listener);
};

ObservationEvent.prototype.update = function(listener) {
  this.addListener(ObservationEvent.events.update, listener);
};

ObservationEvent.prototype.remove = function(listener) {
  this.addListener(ObservationEvent.events.remove, listener);
};

module.exports = ObservationEvent;
