var events = require('events');

function LocationEvent() {
}

LocationEvent.events = {
  add: 'add'
};

LocationEvent.prototype = new events.EventEmitter;

LocationEvent.prototype.add = function(listener) {
  this.addListener(LocationEvent.events.add, listener);
};

module.exports = LocationEvent;
