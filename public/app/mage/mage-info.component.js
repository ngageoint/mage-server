class MageInfoController {

  constructor() {
    var backgrounds = [
      'olympic-park-bg',
      'burkina-faso-bg',
      'philadelphia-bg',
      'rio-olympics-bg'
    ];

    this.backgroundClass = backgrounds[Math.floor(Math.random() * 4)];
  }

}

var template = require('./mage-info.component.html');
var controller = MageInfoController;

export {
  template,
  controller
}