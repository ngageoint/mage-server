class Media {
  static mimetypes = {
    image: ['image/png', 'image/jpg', 'image/jpeg'],
    video: ['video/mp4','video/quicktime'],
    audio: ['audio/mp4']
  };

  constructor(mimetype) {
    this.mimetype = mimetype
  }

  validate(allowedTypes) {
    // if there are no defined allowed types, all are allowed
    if (allowedTypes.length == 0) {
      return true
    }
    if (this.mimetype) {
      const valid = allowedTypes.some(allowed => {
        const mimetypes = Media.mimetypes[allowed];
        return mimetypes && mimetypes.some(mimetype => mimetype === this.mimetype)
      });

      return valid;
    } else {
      return false;
    }
  }
}

module.exports = Media;