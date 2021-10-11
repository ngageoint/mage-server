"use strict";

const log = require('winston')
  , ObjectID = require('mongodb').ObjectID;

exports.id = 'attachment-form-field';

async function createAttachmentField(db) {
  const collection = await db.collection('events');
  const formCounterCollection = await db.collection('counters');
  const events = await collection.find().toArray();
  for (const event of events) {
    log.info(`creating attachment fields for event ${event.name}`);

    event.forms.forEach(form => {
      let id = 0;
      const fields = form.fields.slice() || [];
      if (fields.length) {
        id = fields.sort((a, b) => b.id - a.id)[0].id + 1;
      }

      // Attachment field will be first, add one to every other field id
      fields.forEach(field => field.id = ++field.id);

      fields.push({
        id: 0,
        name: `field${id}`,
        required: false,
        type: 'attachment',
        title: 'Attachments',
        choices: [],
        allowedAttachmentTypes: ['image', 'video', 'audio']
      });

      log.info('adding attachment field to form', fields[fields.length - 1]);

      form.fields = fields;
    });

    if (event.forms.length === 0) {
      log.info(`Event ${event.name} has no forms`);

      const observationCollection = await db.collection(`observations${event._id}`);
      const count = await observationCollection.count({attachments: { $exists: true, $ne: [] } })
      if (count > 0) {
        log.info(`Event ${event.name} has no forms, but does contain attachments, create new form w/ attachment field`);

        const counter = await formCounterCollection.findOneAndUpdate({ _id: 'form' }, { $inc: { sequence: 1 } }, { upsert: true, returnOriginal: false });

        // Create a new form for this event that would allow users to submit attachments
        event.forms = [{
          _id: counter.value.sequence,
          name: event.name,
          color: '#1E88E5',
          userFields: [],
          archived: false,
          default: false,
          fields: [{
            id: 1,
            name: 'field1',
            required: false,
            type: 'attachment',
            title: 'Attachments',
            choices: [],
            allowedAttachmentTypes: ['image', 'video', 'audio']
          }]
        }];
      }
    }

    await collection.findOneAndUpdate({ _id: event._id }, event);
  }
}

async function updateEventAttachments(db, event) {
  const collectionName = `observations${event._id}`;
  log.info(`updating observations ${collectionName}`);

  const collection = await db.collection(collectionName);
  const observations = await collection.find().toArray();
  log.info(`found ${observations.length} in collection`)
  for (const observation of observations) {
    // Add _id to observation form, if exists
    const observationFormId = new ObjectID();
    if (observation.properties.forms && observation.properties.forms.length) {
      const observationForm = observation.properties.forms[0];
      observationForm._id = observationFormId;
    }

    const attachments = observation.attachments || [];
    if (attachments.length) {
      // observation has attachments, add to form if exists, create if not
      let observationForm;
      if (observation.properties.forms && observation.properties.forms.length) {
        observationForm = observation.properties.forms[0];
      } else {
        observationForm = {
          _id: observationFormId,
          formId: event.forms[0]._id
        }
        observation.properties.forms = [observationForm];
      }

      const form = event.forms.find(form => form._id === observationForm.formId);
      const attachmentField = form.fields.find(field => field.type === 'attachment');
      attachments.forEach(attachment => {
        attachment.observationFormId = observationFormId;
        attachment.fieldName = attachmentField.name;
      });
    }

    log.info('updating observation attachments', observation.attachments);

    await collection.findOneAndUpdate({_id: observation._id}, observation);
  }
}

async function updateAttachments(db) {
  const collection = await db.collection('events');
  const events = await collection.find().toArray();
  for (const event of events) {
    await updateEventAttachments(db, event);
  }
}

exports.up = async function (done) {
  await createAttachmentField(this.db);
  await updateAttachments(this.db);

  done();
}

exports.down = function (done) {
  done();
}