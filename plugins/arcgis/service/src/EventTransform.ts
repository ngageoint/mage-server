import { ArcGISPluginConfig, FieldAttributesFormConfig } from "./types/ArcGISPluginConfig"
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

        if (this.mageEvent != null) {

            let formAttributes: FieldAttributesFormConfig | null = null;
            if (config.fieldAttributes) {
                formAttributes =
                    config.fieldAttributes[this.mageEvent.name] || config.fieldAttributes[this.mageEvent.id];
            }

            // Initialize active form active fields
            for (const form of this.mageEvent.activeForms) {
                this.initializeFields(form, formAttributes);
            }

            // Initialize active form archived fields
            this.initializeArchivedFields(this.mageEvent.activeForms, formAttributes);

            // Initialize archived form fields
            for (const form of this.mageEvent.archivedForms) {
                this.initializeFields(form, formAttributes);
            }
        }
    }

    /**
     * Initialize the form fields.
     * @param {Form} form The form.
     * @param {FieldAttributesFormConfig | null} formAttributes Form attributes override mappings
     */
    private initializeFields(form: Form, formAttributes: FieldAttributesFormConfig | null) {

        const fields = new FormFields(form);

        let fieldAttributes: { [fieldTitle: string]: string } | null = null;
        if (formAttributes) {
            fieldAttributes = formAttributes[form.name] || formAttributes[form.id];
        }

        for (const field of form.fields) {
            let attribute = field.name;
            if (form.archived || !field.archived) {
                attribute = this.initializeField(field.name, field.title, fields.id, fieldAttributes);
            }
            fields.setField(field.name, attribute, field.archived);
        }

        this.formFields.set(form.id, fields);
    }

    /**
     * Initialize the archived form fields.
     * @param {Form[]} forms MAGE event form definitions
     * @param {FieldAttributesFormConfig | null} formAttributes Form attributes override mappings
     */
    private initializeArchivedFields(forms: Form[], formAttributes: FieldAttributesFormConfig | null) {

        for (const formFields of this.formFields.values()) {

            let fieldAttributes: { [fieldTitle: string]: string } | null = null;
            if (formAttributes) {
                fieldAttributes = formAttributes[formFields.name] || formAttributes[formFields.id];
            }

            for (const fieldName of formFields.archivedFields) {
                let fieldTitle = fieldName;
                const form = forms.find((form) => form.id === formFields.id);
                if (form) {
                    const formField = form.fields.find((field) => field.name === fieldName);
                    if (formField) {
                        fieldTitle = formField.title;
                    }
                }
                const attribute = this.initializeField(fieldName, fieldTitle, formFields.id, fieldAttributes);
                formFields.setField(fieldName, attribute);
            }
        }
    }

    /**
     * Initialize the form field.
     * @param {string} fieldName The form field name.
     * @param {string} fieldTitle The form field title.
     * @param {number} formId The form ID.
     * @param {{ [fieldTitle: string]: string } | null} fieldAttributes Field attributes override mappings
     * @returns {string} attribute name
     */
    private initializeField(fieldName: string,
                             fieldTitle: string,
                             formId: number,
                             fieldAttributes: { [fieldTitle: string]: string } | null): string {

        let attribute = null;

        if (fieldAttributes != null) {
            attribute = fieldAttributes[fieldTitle];
        }

        if (attribute == null) {
            attribute = `form${formId}_${fieldName}`;
        }

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
 * Mapping between form field names and ArcGIS attributes.
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
     * Form field mapping between form field names and ArcGIS attribute names.
     */
    fields: Map<string, string> = new Map();

    /**
     * Archived form field names
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
     * Set the form field name to an ArcGIS attribute.
     * @param {string} name The form field name.
     * @param {string} attribute The ArcGIS attribute name.
     * @param {boolean} [archived] Archived field flag.
     */
    setField(name: string, attribute: string, archived?: boolean) {
        this.fields.set(name, attribute);
        if (archived) {
            this.archivedFields.add(name);
        }
    }

    /**
     * Get the ArcGIS attribute for the form field name.
     * @param {string} name The form field name.
     * @returns {string | undefined} The arc attribute.
     */
    getField(name: string): string | undefined {
        return this.fields.get(name);
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
