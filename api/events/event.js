var events = require('events');

function EventEvent() {
}

EventEvent.events = {
  add: 'add',
  update: 'update',
  remove: 'remove'
};

EventEvent.prototype = new events.EventEmitter;

EventEvent.prototype.add = function(listener) {
  this.addListener(EventEvent.events.add, listener);
};

EventEvent.prototype.update = function(listener) {
  this.addListener(EventEvent.events.update, listener);
};

EventEvent.prototype.remove = function(listener) {
  this.addListener(EventEvent.events.remove, listener);
};

module.exports = EventEvent;
