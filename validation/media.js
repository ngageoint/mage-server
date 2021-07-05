class Media {
  static mimetypes = {
    image: ['image/png', 'image/jpg', 'image/jpeg'],
    video: ['video/mp4'],
    audio: ['audio/mp4']
  };

  constructor(mimetype) {
    this.mimetype = mimetype
  }

  validate(restrictions) {
    if (this.mimetype) {
      const invalid = restrictions.some(restriction => {
        const mimetypes = Media.mimetypes[restriction]
        return !mimetypes || mimetypes.some(mimetype => mimetype === this.mimetype)
      });

      return !invalid;
    } else {
      return false;
    }
  }
}

module.exports = Media;