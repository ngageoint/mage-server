class FileBrowserController {
  constructor($element, $timeout) {
    this.$element = $element;
    this.$timeout = $timeout;
  }

  $postLink() {
    var fileElement = this.$element.find(':file');
    fileElement.bind('change', () => {
      var file = fileElement[0].files[0];
      this.$timeout(() => {
        this.file = file;
        this.onFileChosen({
          $event: {
            file: file
          }
        });
      });
    });
  }
}

FileBrowserController.$inject = ['$element', '$timeout'];

export default {
  template: require('./file.browser.html'),
  bindings: {
    onFileChosen: '&'
  },
  controller: FileBrowserController
};

