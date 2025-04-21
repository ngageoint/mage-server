import { ArcGISPluginConfig } from "./types/ArcGISPluginConfig";
import { FeatureServiceConfig, FeatureLayerConfig } from "./types/ArcGISConfig";
import { MageEvent, MageEventId, MageEventRepository } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { Layer, Field } from "./types/AddLayersRequest";
import { Form, FormField, FormFieldType, FormId } from '@ngageoint/mage.service/lib/entities/events/entities.events.forms';
import { ObservationsTransformer } from "./ObservationsTransformer";
import { LayerInfoResult, LayerField } from "./types/LayerInfoResult";
import FormData from 'form-data';
import { request } from '@esri/arcgis-rest-request';
import { ArcGISIdentityService } from "./ArcGISService";

/**
 * Administers hosted feature services such as layer creation and updates.
 */
export class FeatureServiceAdmin {
	private _config: ArcGISPluginConfig;
	private _identityService: ArcGISIdentityService;
	private _console: Console;

	/**
	 * Constructor.
	 * @param {ArcGISPluginConfig} config The plugins configuration.
	 * @param {ArcGISIdentityService} identityService The identity service.
	 * @param {Console} console Used to log to the console.
	 */
	constructor(config: ArcGISPluginConfig, identityService: ArcGISIdentityService, console: Console) {
		this._config = config;
		this._identityService = identityService;
		this._console = console;
	}

	/**
	 * Create the layer
	 * @param {FeatureServiceConfig} service feature service
	 * @param {FeatureLayerConfig} featureLayer feature layer
	 * @param {number} nextId next service layer id
	 * @param {MageEventRepository} eventRepo event repository
	 * @returns {Promise<number>} layer id
	 */
	async createLayer(service: FeatureServiceConfig, featureLayer: FeatureLayerConfig, nextId: number, eventRepo: MageEventRepository): Promise<number> {
		// TODO: Is this function needed? This allows the server to create a feature layer on the arcgis server.
		this._console.info('FeatureServiceAdmin createLayer()');
		const layer = { type: 'Feature Layer' } as Layer;

		const layerIdentifier = featureLayer.layer;
		const layerIdentifierNumber = Number(layerIdentifier);
		if (isNaN(layerIdentifierNumber)) {
			layer.name = String(layerIdentifier);
			layer.id = nextId;
		} else {
			layer.id = layerIdentifierNumber;
		}

		const events = await this.layerEvents(featureLayer, eventRepo);

		if (layer.name == null) {
			layer.name = this.layerName(events);
		}

		if (featureLayer.geometryType != null) {
			layer.geometryType = featureLayer.geometryType;
		} else {
			layer.geometryType = 'esriGeometryPoint';
		}

		layer.fields = this.fields(events);

		// TODO What other layer properties are needed or required?
		// https://developers.arcgis.com/rest/services-reference/online/add-to-definition-feature-service-.htm#GUID-63F2BD08-DCF4-485D-A3E6-C7116E17DDD8

		this.create(service, layer);

		return layer.id;
	}

	/**
	 * Update the layer fields
	 * @param {FeatureServiceConfig} service feature service
	 * @param {FeatureLayerConfig} featureLayer feature layer
	 * @param {LayerInfoResult} layerInfo layer info
	 * @param {MageEventRepository} eventRepo event repository
	 */
	async updateLayer(service: FeatureServiceConfig, featureLayer: FeatureLayerConfig, layerInfo: LayerInfoResult, eventRepo: MageEventRepository): Promise<Field[]> {
		this._console.info('FeatureServiceAdmin updateLayer()');
		const events = await this.layerEvents(featureLayer, eventRepo);
		const promises = [];

		const eventFields = this.fields(events);

		const layerFields = layerInfo.fields;

		const layerFieldSet = new Set();
		for (const field of layerFields) {
			layerFieldSet.add(field.name);
		}

		const addFields = [];
		for (const field of eventFields) {
			if (!layerFieldSet.has(field.name)) {
				addFields.push(field);
				const layerField = {} as LayerField;
				layerField.name = field.name;
				layerField.editable = true;
				layerFields.push(layerField);
			}
		}

		if (addFields.length > 0) {
			promises.push(this.addFields(service, featureLayer, addFields));
		}

		const eventFieldSet = new Set();
		for (const field of eventFields) {
			eventFieldSet.add(field.name);
		}

		const deleteFields = [];
		const remainingFields = [];
		for (const field of layerFields) {
			if (field.editable && !eventFieldSet.has(field.name)) {
				deleteFields.push(field);
			} else {
				remainingFields.push(field);
			}
		}

		if (deleteFields.length > 0) {
			layerInfo.fields = remainingFields;
			promises.push(this.deleteFields(service, featureLayer, deleteFields));
		}
		await Promise.all(promises);
		return eventFields;
	}

	/**
	 * Get the Mage layer events
	 * @param {FeatureLayerConfig} layer feature layer
	 * @param {MageEventRepository} eventRepo event repository
	 * @returns {Promise<MageEvent[]>} Mage layer events
	 */
	private async layerEvents(layer: FeatureLayerConfig, eventRepo: MageEventRepository): Promise<MageEvent[]> {
		const layerEventIds: Set<MageEventId> = new Set();
		if (layer.eventIds != null) {
			for (const layerEventId of layer.eventIds) {
				layerEventIds.add(layerEventId);
			}
		}

		let mageEvents;
		if (layerEventIds.size > 0) {
			mageEvents = await eventRepo.findAll();
		} else {
			mageEvents = await eventRepo.findActiveEvents();
		}

		const events: MageEvent[] = [];
		for (const mageEvent of mageEvents) {
			if (layerEventIds.size === 0 || layerEventIds.has(mageEvent.id)) {
				const event = await eventRepo.findById(mageEvent.id);
				if (event != null) {
					events.push(event);
				}
			}
		}

		return events;
	}

	/**
	 * Create a layer name
	 * @param {MageEvent[]} events layer events
	 * @returns {string} layer name
	 */
	private layerName(events: MageEvent[]): string {
		let layerName = '';
		for (let i = 0; i < events.length; i++) {
			if (i > 0) {
				layerName += ', ';
			}
			layerName += events[i].name;
		}
		return layerName;
	}

	/**
	 * Builder the layer fields
	 * @param {MageEvent[]} events layer events
	 * @returns {Field[]} fields
	 */
	private fields(events: MageEvent[]): Field[] {
		const fields: Field[] = [];

		fields.push(this.createTextField(this._config.observationIdField));
		if (this._config.eventIdField != null) {
			fields.push(this.createIntegerField(this._config.eventIdField));
		}
		if (this._config.eventNameField != null) {
			fields.push(this.createTextField(this._config.eventNameField));
		}
		if (this._config.userIdField != null) {
			fields.push(this.createTextField(this._config.userIdField));
		}
		if (this._config.usernameField != null) {
			fields.push(this.createTextField(this._config.usernameField));
		}
		if (this._config.userDisplayNameField != null) {
			fields.push(this.createTextField(this._config.userDisplayNameField));
		}
		if (this._config.deviceIdField != null) {
			fields.push(this.createTextField(this._config.deviceIdField));
		}
		if (this._config.createdAtField != null) {
			fields.push(this.createDateTimeField(this._config.createdAtField));
		}
		if (this._config.lastModifiedField != null) {
			fields.push(this.createDateTimeField(this._config.lastModifiedField));
		}
		if (this._config.geometryType != null) {
			fields.push(this.createTextField(this._config.geometryType));
		}

		const fieldNames = new Set<string>();
		for (const field of fields) {
			fieldNames.add(field.name);
		}

		this.eventsFields(events, fields, fieldNames);

		return fields;
	}

	/**
	 * Create a field
	 * @param {string} name field name
	 * @param {FormFieldType} type form field type
	 * @param {boolean} [integer] integer flag when numeric
	 * @returns {Field} field
	 */
	private createField(name: string, type: FormFieldType, integer?: boolean): Field {
		const field = this.initField(type, integer) as Field;
		if (field != null) {
			field.name = ObservationsTransformer.replaceSpaces(name);
			field.alias = field.name;
			field.editable = true;
		}
		return field;
	}

	/**
	 * Create a text field
	 * @param {string} name field name
	 * @returns {Field} field
	 */
	private createTextField(name: string): Field {
		return this.createField(name, FormFieldType.Text);
	}

	/**
	 * Create a numeric field
	 * @param {string} name field name
	 * @param {boolean} [integer] integer flag
	 * @returns {Field} field
	 */
	private createNumericField(name: string, integer?: boolean): Field {
		return this.createField(name, FormFieldType.Numeric, integer);
	}

	/**
	 * Create an integer field
	 * @param {string} name field name
	 * @returns {Field} field
	 */
	private createIntegerField(name: string): Field {
		return this.createNumericField(name, true);
	}

	/**
	 * Create a date time field
	 * @param {string} name field name
	 * @returns {Field} field
	 */
	private createDateTimeField(name: string): Field {
		return this.createField(name, FormFieldType.DateTime);
	}

	/**
	 * Build fields from the layer events
	 * @param {MageEvent[]} events layer events
	 * @param {Field[]} fields created fields
	 * @param {Set<string>} fieldNames set of all field names
	 */
	private eventsFields(events: MageEvent[], fields: Field[], fieldNames: Set<string>) {
		const forms = new Set<FormId>();

		for (const event of events) {
			this.eventFields(event, forms, fields, fieldNames);
		}
	}

	/**
	 * Build fields from the layer event
	 * @param {MageEvent} event layer event
	 * @param {Set<FormId>} forms set of processed forms
	 * @param {Field[]} fields created fields
	 * @param {Set<string>} fieldNames set of all field names
	 */
	private eventFields(event: MageEvent, forms: Set<FormId>, fields: Field[], fieldNames: Set<string>) {
		for (const form of event.activeForms) {
			if (!forms.has(form.id)) {
				forms.add(form.id);

				for (const formField of form.fields) {
					if (!formField.archived) {
						this.createFormField(form, formField, fields, fieldNames);
					}
				}
			}
		}
	}

	/**
	 * Build a field from the form field
	 * @param {Form} form form
	 * @param {FormField} formField form field
	 * @param {Field[]} fields created fields
	 * @param {Set<string>} fieldNames set of all field names
	 */
	private createFormField(form: Form, formField: FormField, fields: Field[], fieldNames: Set<string>) {
		const field = this.initField(formField.type);

		if (field != null) {
			const sanitizedName = ObservationsTransformer.replaceSpaces(formField.title);
			const sanitizedFormName = ObservationsTransformer.replaceSpaces(form.name);
			const name = `${sanitizedFormName}_${sanitizedName}`.toLowerCase();

			fieldNames.add(name);

			field.name = name;
			field.alias = field.name;
			field.editable = true;
			field.defaultValue = formField.value;

			fields.push(field);
		}
	}

	/**
	 * Initialize a field by type
	 * @param {FormFieldType} type form field type
	 * @param {boolean} [integer] numeric integer field type
	 * @returns {Field | null} field or null
	 */
	private initField(type: FormFieldType, integer?: boolean): Field | null {
		const field = {} as Field;

		switch (type) {
			case FormFieldType.CheckBox:
			case FormFieldType.Dropdown:
			case FormFieldType.Email:
			case FormFieldType.MultiSelectDropdown:
			case FormFieldType.Password:
			case FormFieldType.Radio:
			case FormFieldType.Text:
				field.type = 'esriFieldTypeString';
				field.actualType = 'nvarchar';
				field.sqlType = 'sqlTypeNVarchar';
				field.length = this._config.textFieldLength;
				break;
			case FormFieldType.TextArea:
				field.type = 'esriFieldTypeString';
				field.actualType = 'nvarchar';
				field.sqlType = 'sqlTypeNVarchar';
				field.length = this._config.textAreaFieldLength;
				break;
			case FormFieldType.DateTime:
				field.type = 'esriFieldTypeDate';
				field.sqlType = 'sqlTypeOther';
				field.length = 10;
				break;
			case FormFieldType.Numeric:
				if (integer) {
					field.type = 'esriFieldTypeInteger';
					field.actualType = 'int';
					field.sqlType = 'sqlTypeInteger';
				} else {
					field.type = 'esriFieldTypeDouble';
					field.actualType = 'float';
					field.sqlType = 'sqlTypeFloat';
				}
				break;
			case FormFieldType.Geometry:
			case FormFieldType.Attachment:
			case FormFieldType.Hidden:
			default:
				break;
		}

		return field.type != null ? field : null;
	}

	/**
	 * Create the feature layer
	 * @param {FeatureServiceConfig} service feature service
	 * @param {Layer} layer layer
	 */
	private async create(service: FeatureServiceConfig, layer: Layer) {
		const url = this.adminUrl(service) + 'addToDefinition';

		this._console.info('ArcGIS feature service addToDefinition (create feature layer) url ' + url);

		const form = new FormData();
		form.append('addToDefinition', JSON.stringify(layer));

		const identityManager = await this._identityService.signin(service);
		await request(url, {
			authentication: identityManager,
			httpMethod: 'POST',
			params: form
		}).catch((error) => this._console.error('FeatureServiceAdmin create() error ' + error));
	}

	/**
	 * Add fields to the layer
	 * @param {FeatureLayerConfig} service feature service
	 * @param {FeatureLayerConfig} featureLayer feature layer
	 * @param {Field[]} fields fields to add
	 */
	private async addFields(service: FeatureServiceConfig, featureLayer: FeatureLayerConfig, fields: Field[]) {
		const layer = { fields: fields } as Layer;

		const url = this.adminUrl(service) + featureLayer.layer.toString() + '/addToDefinition';

		this._console.info('ArcGIS feature layer addToDefinition (add fields) url ' + url);

		try {
			const identityManager = await this._identityService.signin(service);
			await request(url, {
				authentication: identityManager,
				params: {
					addToDefinition: layer,
					f: "json"
				}
			}).catch((error) => {
				this._console.error('Error in addFields: ' + error);
			});
		} catch (error) {
			this._console.error('FeatureServiceAdmin addFields() error ' + error);
		}
	}

	/**
	 * Delete fields from the layer
	 * @param {FeatureServiceConfig} service feature service
	 * @param {FeatureLayerConfig} featureLayer feature layer
	 * @param {LayerField[]} fields fields to delete
	 */
	private async deleteFields(service: FeatureServiceConfig, featureLayer: FeatureLayerConfig, fields: LayerField[]) {
		const deleteFields = [];
		for (const layerField of fields) {
			const field = {} as Field;
			field.name = layerField.name;
			deleteFields.push(field);
		}

		const layer = {} as Layer;
		layer.fields = deleteFields;

		const url = this.adminUrl(service) + featureLayer.layer.toString() + '/deleteFromDefinition';

		this._console.info('ArcGIS feature layer deleteFromDefinition (delete fields) url ' + url);

		try {
			const identityManager = await this._identityService.signin(service);
			await request(url, {
				authentication: identityManager,
				httpMethod: 'POST',
				params: {
					deleteFromDefinition: layer,
					f: 'json'
				}
			}).catch((error) => this._console.error('FeatureServiceAdmin deleteFields() error ' + error));
		} catch (error) {
			this._console.error('FeatureServiceAdmin deleteFields() error ' + error);
		}
	}

	/**
	 * Get the administration url
	 * @param {FeatureServiceConfig} service feature service
	 * @returns {string} url
	 */
	private adminUrl(service: FeatureServiceConfig): string {
		let url = service.url.replace('/services/', '/admin/services/');
		if (!url.endsWith('/')) {
			url += '/';
		}

		return url;
	}
}