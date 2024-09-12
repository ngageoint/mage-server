class AvatarEditController {
  constructor($element) {
    this.$element = $element;
  }

  $onChanges(changes) {
    if (!changes.user || !changes.user.avatar) {
      this.file = null;
      this.fileName = 'Choose an avatar image...';
    }
  }

  $postLink() {
    var fileElement = this.$element.find(':file');
    fileElement.change(() => {
      this.avatarChanged(fileElement[0].files[0]);
    });
  }

  avatarChanged(file) {
    this.file = file;
    this.fileName = file.name;

    this.onAvatarChanged({
      $event: {
        avatar: file
      }
    });
  }
}

AvatarEditController.$inject = ['$element'];

export default {
  template: require('./avatar.edit.html'),
  bindings: {
    user: '<',
    onAvatarChanged: '&'
  },
  controller: AvatarEditController
};