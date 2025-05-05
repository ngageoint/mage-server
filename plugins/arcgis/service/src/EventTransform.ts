import { ArcGISPluginConfig } from "./types/ArcGISPluginConfig"
import { MageEvent } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { Form, FormId } from '@ngageoint/mage.service/lib/entities/events/entities.events.forms'

/**
 * Contains information used to transform observations from a single event.
 */
export class EventTransform {

    /**
     * The MAGE event.
     */
    mageEvent: MageEvent | null;

    /**
     * Form field mappings between form ids and form fields.
     */
    formFields: Map<number, FormFields> = new Map();

    /**
     * Creates a new instance of EventTransform.
     * @param {ArcGISPluginConfig} config The plugins configuration.
     * @param {MageEvent | null} mageEvent The MAGE Event.
     */
    constructor(config: ArcGISPluginConfig, mageEvent: MageEvent | null) {
        this.mageEvent = mageEvent;
        this.initialize(config);
    }

    /**
     * Initialize the event fields.
     * @param {ArcGISPluginConfig} config The plugins configuration.
     */
    private initialize(config: ArcGISPluginConfig) {

        const allFields = new Set<string>();

        allFields.add(config.observationIdField);
        if (config.eventIdField != null) {
            allFields.add(config.eventIdField);
        }
        if (config.eventNameField != null) {
            allFields.add(config.eventNameField);
        }
        if (config.userIdField != null) {
            allFields.add(config.userIdField);
        }
        if (config.usernameField != null) {
            allFields.add(config.usernameField);
        }
        if (config.userDisplayNameField != null) {
            allFields.add(config.userDisplayNameField);
        }
        if (config.deviceIdField != null) {
            allFields.add(config.deviceIdField);
        }
        if (config.createdAtField != null) {
            allFields.add(config.createdAtField);
        }
        if (config.lastModifiedField != null) {
            allFields.add(config.lastModifiedField);
        }
        if (config.geometryType != null) {
            allFields.add(config.geometryType);
        }

        if (this.mageEvent != null) {

            const formAttributes = this.configValue(config.fieldAttributes, this.mageEvent.name, this.mageEvent.id);

            // Initialize active form active fields
            for (const form of this.mageEvent.activeForms) {
                this.initializeFields(form, allFields, formAttributes);
            }

            // Initialize active form archived fields
            this.initializeArchivedFields(allFields, formAttributes);

            // Initialize archived form fields
            for (const form of this.mageEvent.archivedForms) {
                this.initializeFields(form, allFields, formAttributes);
            }

        }

    }

    /**
     * Initialize the form fields.
     * @param {Form} form The form.
     * @param {Set<string>} allFields Used to build and track all event fields.
     * @param {any} formAttributes Form attributes override mappings
     */
    private initializeFields(form: Form, allFields: Set<string>, formAttributes: any) {

        const fields = new FormFields(form);

        const fieldAttributes = this.configValue(formAttributes, fields.name, fields.id);

        for (const field of form.fields) {

            let attribute = field.title;
            if (form.archived || !field.archived) {
                attribute = this.initializeField(attribute, fields.name, allFields, fieldAttributes);
            }

            fields.set(field.title, attribute, field.archived);
        }

        this.formFields.set(form.id, fields);
    }

    /**
     * Initialize the archived form fields.
     * @param {Set<string>} allFields Used to build and track all event fields.
     * @param {any} formAttributes Form attributes override mappings
     */
    private initializeArchivedFields(allFields: Set<string>, formAttributes: any) {

        for (const fields of this.formFields.values()) {

            const fieldAttributes = this.configValue(formAttributes, fields.name, fields.id)

            for (const field of fields.archivedFields) {
                const attribute = this.initializeField(field, fields.name, allFields, fieldAttributes)
                fields.set(field, attribute)
            }

        }

    }

    /**
     * Retrieve a config value by name or id.
     * @param {any} config The configuration.
     * @param {string} name Configuration name.
     * @param {number} id Configuration id.
     * @returns {any} configuration value
     */
    private configValue(config: any, name: string, id: number): any {
        let value = null;
        if (config != null) {
            value = config[name]
            if (!value) {
                value = config[id]
            }
        }
        return value;
    }

    /**
     * Initialize the form field.
     * @param {string} field The field.
     * @param {string} formName The form name.
     * @param {Set<string>} allFields Used to build and track all event fields.
     * @param {any} fieldAttributes Field attributes override mappings
     * @returns {string} attribute name
     */
    private initializeField(field: string, formName: string, allFields: Set<string>, fieldAttributes: any): string {

        let attribute = null;

        if (fieldAttributes != null) {
            attribute = fieldAttributes[field];
        }

        if (attribute == null) {

            attribute = field;

            if (allFields.has(attribute)) {
                attribute = formName + '_' + attribute;
            }

        }

        allFields.add(attribute);

        return attribute;
    }

    /**
     * Get the form fields for the form id.
     * @param {number} id The form id.
     * @returns {FormFields | undefined} The form fields.
     */
    get(id: number): FormFields | undefined {
        return this.formFields.get(id);
    }

}

/**
 * Mapping between form field titles and arc attributes.
 */
export class FormFields {

    /**
     * Form name
     */
    name: string;

    /**
     * Form id
     */
    id: FormId;

    /**
     * Form archived flag
     */
    archived: boolean;

    /**
     * Form field mapping between titles and arc atrribute fields.
     */
    fields: Map<string, string> = new Map();

    /**
     * Archived form fields
     */
    archivedFields: Set<string> = new Set();

    /**
     * Creates a new instance of FormFields
     * @param {Form} form - The form.
     */
    constructor(form: Form) {
        this.name = form.name;
        this.id = form.id;
        this.archived = form.archived;
    }

    /**
     * Set the form field title to an arc attribute.
     * @param {string} title The form field title.
     * @param {string} attribute The arc attribute.
     * @param {boolean} [archived] Archived field flag.
     */
    set(title: string, attribute: string, archived?: boolean) {
        this.fields.set(title, attribute);
        if (archived) {
            this.archivedFields.add(title);
        }
    }

    /**
     * Get the arc attribute for the form field title.
     * @param {string} title The form field title.
     * @returns {string | undefined} The arc attribute.
     */
    get(title: string): string | undefined {
        return this.fields.get(title);
    }

    /**
     * Is the form field archived.
     * @param {string} title The form field title.
     * @returns {boolean} True if archived.
     */
    isArchived(title: string): boolean {
        return this.fields.has(title);
    }

}
