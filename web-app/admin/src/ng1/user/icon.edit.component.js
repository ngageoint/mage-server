
class IconEditController {
  constructor($element) {
    this.$element = $element;

    this.fileName = 'Choose a map icon...';
  }

  $postLink() {
    var fileElement = this.$element.find(':file');
    fileElement.change(() => {
      this.iconChanged(fileElement[0].files[0]);
    });
  }

  iconChanged(file) {
    this.file = file;
    this.fileName = file.name;

    this.onIconChanged({
      $event: {
        icon: file
      }
    });
  }
}

IconEditController.$inject = ['$element'];

export default {
  template: require('./icon.edit.html'),
  bindings: {
    user: '<',
    onIconChanged: '&'
  },
  controller: IconEditController
};