import {menu} from 'material-components-web';

class MenuController {

  constructor($element, $timeout) {
    this.$element = $element;
    this.$timeout = $timeout;
  }

  $postLink() {
    this.menu = new menu.MDCMenu(this.$element.find('.mdc-menu')[0]);
  }

  $onDestroy() {
    this.menu.destroy();
  }

  toggleMenu()  {
    this.menu.open = !this.menu.open;
  }

  optionSelected(option) {
    if (this.onOption) {
      this.onOption({
        $event: {
          option: option
        }
      });
    }
  }

  isOptionSelected(option) {
    return this.selected.includes(option.value);
  }
}

MenuController.$inject = ['$element', '$timeout'];

var template = require('./menu.component.html'),
  bindings = {
    title: '@',
    options: '<',
    selected: '<',
    onOption: '&'
  },
  controller = MenuController;

export {
  template,
  bindings,
  controller
};
