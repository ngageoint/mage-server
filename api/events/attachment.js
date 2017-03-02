var events = require('events');

function AttachmentEvent() {
}

AttachmentEvent.events = {
  add: 'add',
  update: 'update',
  remove: 'remove'
};

AttachmentEvent.prototype = new events.EventEmitter;

AttachmentEvent.prototype.add = function(listener) {
  this.addListener(AttachmentEvent.events.add, listener);
};

AttachmentEvent.prototype.update = function(listener) {
  this.addListener(AttachmentEvent.events.update, listener);
};

AttachmentEvent.prototype.remove = function(listener) {
  this.addListener(AttachmentEvent.events.remove, listener);
};

module.exports = AttachmentEvent;
