module.exports = function fileUpload() {
  var directive = {
    restrict: "A",
    template: require('./file-upload.directive.html'),
    scope: {
      type: '@',
      url: '@',
      icon: '@',
      placeholder: '@',
      allowUpload: '=',
      preview: '=',
      uploadId: '=',
      uploadFileFormName: '=',
      defaultImageUrl: '='
    },
    controller: require('./file-upload.controller')
  };

  return directive;
};
