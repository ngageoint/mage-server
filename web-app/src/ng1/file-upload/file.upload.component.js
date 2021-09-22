class FileUploadController {
  constructor($element, $timeout) {
    this.$element = $element;
    this.$timeout = $timeout;
  }

  $onInit() {
    this.uploadImageMissing = true;

    if (!this.type) this.type = 'detail';
    if (!this.placeholder) this.placeholder = 'Choose a file...';
  }

  $postLink() {
    const img = this.$element.find('img');
    img.on('load', () => {
      this.uploadImageMissing = false;
    });

    img.on('error', () => {
      this.$timeout(() => {
        this.uploadImageMissing = true;
      });

      if (this.defaultImageUrl) {
        // TODO not sure this will work
        $(this).attr('src', this.defaultImageUrl);
      }
    });

    const self = this;
    this.$element.find(':file').bind('change', function() {
      self.$timeout(() => {
        self.onFile.call(self, this.files[0]);
      });
    });
  }

  $onChanges(changes) {
    if (changes.allowUpload && changes.allowUpload.currentValue === true) {
      this.upload();
    }

    if (changes.url && changes.url.currentValue !== this.url) {
      this.uploadImageMissing = false;
      this.$element.find('.preview').html(['<img class="preview-image" src="', this.icon || this.url, '"/>'].join(''));
    }
  }

  onFile(file) {
    this.file = file;

    const element = $(this.$element.find('.upload-file')[0]);
    if (this.preview) {
      this.previewFile(this.file, element);
    }

    this.onUploadFile({
      $event: {
        id: this.uploadId,
        url: this.url,
        file: this.file
      }
    });

    this.upload();
  }

  previewFile(file, element) {
    if (window.FileReader) {
      const reader = new FileReader();

      reader.onload = (theFile => {
        return e => {
          this.$timeout(() => {
            this.uploadImageMissing = false;
          });

          element.find('.preview').html(['<img class="preview-image" src="', e.target.result,'" title="', theFile.name, '"/>'].join(''));
        };
      })(file);

      reader.readAsDataURL(file);
    }
  }

  uploadProgress(e) {
    if (e.lengthComputable) {
      this.$timeout(() => {
        this.uploading = true;
        this.uploadProgress = (e.loaded/e.total) * 100;
      });
    }
  }

  uploadComplete(response) {
    this.$timeout(() => {
      this.file = null;
      this.uploading = false;

      this.onUploadComplete({
        $event: {
          id: this.uploadId,
          url: this.url,
          response: response
        }
      });
    });
  }

  uploadFailed(response) {
    this.$timeout(() => {
      this.file = null;
      this.uploading = false;

      this.onUploadFailed({
        $event: {
          id: this.uploadId,
          url: this.url,
          response: response
        }
      });
    });
  }

  upload() {
    if (!this.url || !this.allowUpload || !this.file) return;

    const formData = new FormData();
    formData.append(this.uploadFileFormName, this.file);

    const self = this;
    jQuery.ajax({
      url: this.url,
      type: 'POST',
      xhr: () => {
        const myXhr = jQuery.ajaxSettings.xhr();
        if (myXhr.upload) {
          myXhr.upload.addEventListener('progress', e => {
            self.uploadProgress(e);
          }, false);
        }
        return myXhr;
      },
      success: response => {
        this.uploadComplete(response);
      },
      error: response => {
        this.uploadFailed(response);
      },
      data: formData,
      cache: false,
      contentType: false,
      processData: false
    });
  }
}

FileUploadController.$inject = ['$element', '$timeout'];

export default {
  template: require('./file.upload.html'),
  bindings: {
    type: '@',
    url: '@',
    icon: '@',
    placeholder: '@',
    allowUpload: '<',
    preview: '<',
    uploadId: '<',
    uploadFileFormName: '<',
    defaultImageUrl: '<',
    onUploadFile: '&',
    onUploadComplete: '&',
    onUploadFailed: '&'
  },
  controller: FileUploadController
};