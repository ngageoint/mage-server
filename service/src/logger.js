var winston = require('winston');

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  timestamp: true,
  level: 'debug',
  colorize: true
});

var mongooseLogger = winston.loggers.add('mongoose', {
  transports: [
    new (winston.transports.Console)({
      level: 'mongoose',
      timestamp: true,
      colorize: true
    })
  ]
});

winston.addColors({ mongoose: 'cyan' });
mongooseLogger.setLevels({ mongoose: 0 });

module.exports = winston;
