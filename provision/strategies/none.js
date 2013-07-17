function Strategy() {
  this.name = 'none';
}

Strategy.prototype.check = function(req, options, done) {
  if (typeof options == 'function') {
    done = options;
    options = {};
  }
  
  done(null, 'none');
}

/**
 * Expose `Strategy`.
 */ 
 exports.Strategy = Strategy;