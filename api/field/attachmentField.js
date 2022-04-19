const util = require('util')
  , Field = require('./field')
  , Media = require('../../validation/media');

function AttachmentField(fieldDefinition, observationForm, observation) {
  AttachmentField.super_.call(this, fieldDefinition, observationForm[fieldDefinition.name]);

  this.observationForm = observationForm;
  this.attachments = observation.attachments || [];
}

util.inherits(AttachmentField, Field);

AttachmentField.prototype.validate = function() {
  const fieldValue = this.value || [];
  if (!Array.isArray(fieldValue)) {
    return { error: 'value', message: `${this.definition.title} must be an Array` }
  }

  const observationFormId = this.observationForm._id ? this.observationForm._id.toString() : null
  const attachments = this.attachments.filter(attachment => {
    return attachment.observationFormId.toString() === observationFormId && attachment.fieldName === this.definition.name;
  });

  const add = fieldValue.reduce((count, attachment) => { return attachment.action === 'add' ? count + 1 : count }, 0);
  const remove = fieldValue.reduce((count, attachment) => { return attachment.action === 'delete' ? count + 1 : count }, 0)
  const attachmentCount = attachments.length + add - remove;

  if (this.definition.min != null && attachmentCount < this.definition.min) {
    return { error: 'min', message: `${this.definition.title} must contain at least ${this.definition.min} ${this.definition.min > 1 ? 'attachments' : 'attachment'}` }
  }

  if (this.definition.max != null && attachmentCount > this.definition.max) {
    return { error: 'max', message: `${this.definition.title} cannot contain more than ${this.definition.max} ${this.definition.max > 1 ? 'attachments' : 'attachment'}` }
  }

  const addAttachments = fieldValue.filter(attachment => attachment.action === 'add');
  if (addAttachments.length) {
    const invalidAttachments = addAttachments.filter(attachment => {
      const media = new Media(attachment.contentType);
      return !media.validate(this.definition.allowedAttachmentTypes);
    });

    if (invalidAttachments.length != 0) {
      return { error: 'type', message: `${this.definition.title} fields contains invalid attachment ${invalidAttachments.length > 1 ? 'types' : 'type'} ${invalidAttachments.map(attachment => attachment.contentType).join(', ')} ` }
    }
  }
};

module.exports = AttachmentField;
