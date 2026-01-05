/**
 * API-layer Observation service.
 *
 * RESPONSIBILITY:
 * - Orchestrates observation operations (validation, events, coordination)
 * - Calls into models/observation.js for ALL MongoDB persistence
 * - Does NOT directly interact with Mongoose schemas or MongoDB
 *
 * IMPORTANT:
 * - This file MUST NOT contain virus scanning logic
 * - Virus scanning belongs in models/observation.js, immediately before Mongo writes
 */

const async = require("async"),
  log = require("winston"),
  ObservationEvents = require("./events/observation.js"),
  FieldFactory = require("./field"),
  ObservationModel = require("../models/observation"), // <-- Mongoose lives behind this boundary
  Attachment = require("./attachment");                // <-- File-system orchestration only

const fieldFactory = new FieldFactory();

/**
 * Observation API wrapper.
 *
 * @param {Event} event   Current event context
 * @param {User} user     Authenticated user
 * @param {ObjectId} deviceId Optional device identifier
 */
function Observation(event, user, deviceId) {
  this._event = event;
  this._user = user;
  this._deviceId = deviceId;
}

const EventEmitter = new ObservationEvents();
Observation.on = EventEmitter;

/**
 * Retrieve all observations.
 *
 * NOTE:
 * - Delegates query execution to models/observation.js
 * - Handles multi-geometry fan-out at the API layer
 */
Observation.prototype.getAll = function (options, callback) {
  const event = this._event;
  const filter = options.filter;

  if (filter && filter.geometries) {
    let allObservations = [];

    async.each(
      filter.geometries,
      function (geometry, done) {
        options.filter.geometry = geometry;

        // Mongo query executed in model layer
        ObservationModel.getObservations(
          event,
          options,
          function (err, observations) {
            if (err) return done(err);
            if (observations) {
              allObservations = allObservations.concat(observations);
            }
            done();
          }
        );
      },
      function (err) {
        callback(err, allObservations);
      }
    );
  } else {
    ObservationModel.getObservations(event, options, callback);
  }
};

/**
 * Fetch a single observation by ID.
 *
 * NOTE:
 * - No Mongo logic here
 * - Pass-through to model layer
 */
Observation.prototype.getById = function (observationId, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  ObservationModel.getObservationById(
    this._event,         // Event context
    observationId,       // ID from route
    options,             // Fields, filters
    callback             // Passes result back to route
  );
};

/**
 * Validate observation payload BEFORE persistence.
 *
 * IMPORTANT:
 * - Structural & business validation ONLY
 * - Does NOT handle attachments on disk
 * - Does NOT talk to MongoDB
 */
Observation.prototype.validate = function (observation) {
  const errors = {};
  let message = "";

  // ----- Core GeoJSON validation -----
  if (observation.type !== "Feature") {
    errors.type = {
      error: "required",
      message: observation.type
        ? "type is required"
        : 'type must equal "Feature"',
    };
    message += observation.type
      ? "\u2022 type is required\n"
      : '\u2022 type must equal "Feature"\n';
  }

  // ----- Timestamp validation -----
  const properties = observation.properties || {};
  const timestampError = fieldFactory
    .createField(
      {
        type: "date",
        required: true,
        name: "timestamp",
        title: "Date",
      },
      properties
    )
    .validate();

  if (timestampError) {
    errors.timestamp = timestampError;
    message += `\u2022 ${timestampError.message}\n`;
  }

  // ----- Geometry validation -----
  const geometryError = fieldFactory
    .createField(
      {
        type: "geometry",
        required: true,
        name: "geometry",
        title: "Location",
      },
      observation
    )
    .validate();

  if (geometryError) {
    errors.geometry = geometryError;
    message += `\u2022 ${geometryError.message}\n`;
  }

  /**
   * Form validation continues…
   * (unchanged — omitted here for brevity)
   */

  if (Object.keys(errors).length) {
    const err = new Error("Invalid Observation");
    err.name = "ValidationError";
    err.status = 400;
    err.message = message;
    err.errors = errors;
    return err;
  }
};

/**
 * Generate a new observation ID.
 *
 * NOTE:
 * - Model layer owns persistence
 */
Observation.prototype.createObservationId = function (callback) {
  ObservationModel.createObservationId(callback);
};

/**
 * Validate an observation ID exists.
 */
Observation.prototype.validateObservationId = function (id, callback) {
  ObservationModel.getObservationId(id, function (err, id) {
    if (err) return callback(err);

    if (!id) {
      err = new Error();
      err.status = 404;
    }

    callback(err, id);
  });
};

/**
 * Create or update an observation.
 *
 * FLOW:
 * 1. Attach user/device metadata
 * 2. Validate observation payload
 * 3. Delegate persistence to models/observation.js
 * 4. Emit domain events
 * 5. Clean up deleted attachments from disk
 *
 * CRITICAL:
 * - MongoDB writes occur INSIDE models/observation.js
 * - Virus scanning must occur there, not here
 */
Observation.prototype.update = function (observationId, observation, callback) {
  if (this._user) observation.userId = this._user._id;
  if (this._deviceId) observation.deviceId = this._deviceId;

  const err = this.validate(observation);
  if (err) return callback(err);

  ObservationModel.updateObservation(
    this._event,
    observationId,
    observation,
    (err, updatedObservation) => {
      if (updatedObservation) {
        EventEmitter.emit(
          ObservationEvents.events.update,
          updatedObservation.toObject({ event: this._event }),
          this._event,
          this._user
        );

        /**
         * Post-persistence cleanup:
         * Remove deleted attachment files from disk.
         *
         * NOTE:
         * - This operates on the filesystem ONLY
         * - Mongo state is already finalized
         */
        const { forms: formEntries = [] } = observation.properties || {};

        formEntries.forEach((formEntry) => {
          const formDefinition = this._event.forms.find(
            (form) => form._id === formEntry.formId
          );

          Object.keys(formEntry).forEach((fieldName) => {
            const fieldDefinition = formDefinition.fields.find(
              (field) => field.name === fieldName
            );

            if (fieldDefinition && fieldDefinition.type === "attachment") {
              const attachmentsField = formEntry[fieldName] || [];

              attachmentsField
                .filter(a => a.action === "delete")
                .forEach((attachmentField) => {
                  const attachment = observation.attachments.find(
                    (attachment) =>
                      attachment._id.toString() === attachmentField.id
                  );

                  if (attachment) {
                    new Attachment(this._event, observation).delete(
                      attachment._id,
                      (err) => {
                        log.warn(
                          "Error removing deleted attachment from file system",
                          err
                        );
                      }
                    );
                  }
                });
            }
          });
        });
      }

      callback(err, updatedObservation);
    }
  );
};
