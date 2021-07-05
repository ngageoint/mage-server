const util = require('util')
  , Field = require('./field')
  , Media = require('../../validation/media');

function AttachmentField(fieldDefinition, form) {
  AttachmentField.super_.call(this, fieldDefinition, form[fieldDefinition.name]);
}

util.inherits(AttachmentField, Field);

AttachmentField.prototype.validate = function() {
  const error = AttachmentField.super_.prototype.validate.call(this);
  if (error) return error;

  if (!this.value) return;

  if (!Array.isArray(this.value)) {
    return { error: 'value', message: `${this.definition.title} must be an Array` }
  }

  if (this.definition.min != null && this.value.length < this.definition.min) {
    return { error: 'min', message: `${this.definition.title} must contain at least ${this.definition.min} ${this.definition.min > 1 ? 'attachments' : 'attachment'}` }
  }

  if (this.definition.max != null && this.value.length > this.definition.max) {
    return { error: 'max', message: `${this.definition.title} cannot contain more than ${this.definition.max} ${this.definition.max > 1 ? 'attachments' : 'attachment'}` }
  }

  const validType = this.value.some(attachment => {
    const media = new Media(attachment.type)
    return media.validate(this.definition.restrictedAttachmentTypes);
  });

  if (!validType) {
    return { error: 'type', message: `${this.definition.title} cannot contain media of ${this.definition.restrictedAttachmentTypes.length > 1 ? 'types' : 'type'} '${this.definition.restrictedAttachmentTypes.join(',')}' ` }
  }
};

module.exports = AttachmentField;
