class DisclaimerController {

}

var template = require('./disclaimer.html');
var bindings = {
  disclaimer: '<',
  onAccept: '&',
  onCancel: '&'
};
var controller = DisclaimerController;

export {
  template,
  bindings,
  controller
};