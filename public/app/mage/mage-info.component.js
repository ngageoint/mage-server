class MageInfoController {

  constructor() {
    var backgrounds = [
      'mage-1-bg',
      'mage-2-bg',
      'mage-3-bg',
      'mage-4-bg'
    ];

    this.backgroundClass = backgrounds[Math.floor(Math.random() * 4)];
  }

}

var template = require('./mage-info.component.html');
var controller = MageInfoController;

export {
  template,
  controller
};