import { ArcGISPluginConfig } from "./ArcGISPluginConfig";
import { AttributeDefaultConfig } from "./ArcGISConfig";
import { ObservationAttrs, Attachment } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import { User } from '@ngageoint/mage.service/lib/entities/users/entities.users'
import { FormFieldType } from '@ngageoint/mage.service/lib/entities/events/entities.events.forms'
import { Geometry, Point, LineString, Polygon } from 'geojson'
import { ArcObservation, ArcAttachment } from './ArcObservation'
import { ArcGeometry, ArcObject, ArcPoint, ArcPolyline, ArcPolygon } from './ArcObject'
import { EventTransform } from './EventTransform'

/**
 * Class that transforms observations into a json string that can then be sent to an arcgis server.
 */
export class ObservationsTransformer {

    /**
     * ArcGIS configuration.
     */
    private _config: ArcGISPluginConfig

    /**
     * Used to log to the console.
     */
    private _console: Console

    /**
     * Initialized flag
     */
    private _initialized: boolean = false

    /**
     * Default values
     */
    private _defaults: { [attribute: string]: AttributeDefaultConfig[] } = {}

    /**
     * Omit attributes
     */
    private _omit: string[] = []

    /**
     * Constructor.
     * @param config The plugins configuration.
     * @param console Used to log to the console.
     */
    constructor(config: ArcGISPluginConfig, console: Console) {
        this._config = config
        this._console = console
    }

    /**
     * Initialize configuration settings
     */
    private init() {
        if (!this._initialized) {
            this._initialized = true
            if (this._config.attributes != null) {
                for (const attributes of Object.entries(this._config.attributes)) {
                    const attribute = attributes[0]
                    const attributeConfig = attributes[1]
                    const defaults = attributeConfig.defaults
                    if (defaults != null && defaults.length > 0) {
                        this._defaults[attribute] = defaults
                    }
                    if (attributeConfig.omit) {
                        this._omit.push(attribute)
                    }
                }
            }
        }
    }

    /**
     * Converts the specified observation into an ArcObservation that can be sent to an arcgis server.
     * @param observation The observation to convert.
     * @param transform The Event transform.
     * @param user The MAGE user.
     * @returns The ArcObservation of the observation.
     */
    transform(observation: ObservationAttrs, transform: EventTransform, user: User | null): ArcObservation {
        this.init()

        const arcObject = {} as ArcObject

        this.observationToAttributes(observation, transform, user, arcObject)

        if (observation.geometry != null) {
            const geometry = observation.geometry
            const arcGeometry = this.geometryToArcGeometry(geometry)
            this._console.info('ArcGIS new ' + geometry.type + ' at ' + JSON.stringify(arcGeometry) + ' with id ' + observation.id)
            arcObject.geometry = arcGeometry
        }

        let formIds: { [name: string]: number } = {}
        if (observation.properties != null) {
            formIds = this.propertiesToAttributes(observation.properties, transform, arcObject)
        }

        const arcObservation = this.createObservation(observation)
        if (this._config.geometryType != null) {
            this.addAttribute(this._config.geometryType, arcObservation.esriGeometryType, arcObject)
        }
        this.addDefaults(arcObject)

        arcObservation.createdAt = new Date(observation.createdAt).getTime()
        arcObservation.lastModified = new Date(observation.lastModified).getTime()
        arcObservation.object = arcObject
        arcObservation.attachments = this.attachments(observation.attachments, formIds, transform)

        this.removeOmissions(arcObject)

        return arcObservation
    }

    /**
     * Creates a base ArcObservation with id and geometry type.
     * @param observation The observation to convert.
     * @returns The ArcObservation of the observation.
     */
    createObservation(observation: ObservationAttrs): ArcObservation {
        const arcObservation = {} as ArcObservation
        arcObservation.id = observation.id
        arcObservation.esriGeometryType = this.esriGeometryType(observation)
        return arcObservation
    }

    /**
     * Converts a mage geometry type to an esri geometry type.
     * @param mageGeometryType The mage geometry type.
     * @returns The esri geometry type.
     */
    mageTypeToEsriType(mageGeometryType: string): string {
        let esriGeometryType = ''

        switch (mageGeometryType) {
            case 'Point':
                esriGeometryType = 'esriGeometryPoint'
                break;
            case 'LineString':
                esriGeometryType = 'esriGeometryPolyline'
                break;
            case 'Polygon':
                esriGeometryType = 'esriGeometryPolygon'
                break;
            default:
                break;
        }

        return esriGeometryType;
    }

    /**
     * Determine the observation Esri geometry type.
     * @param observation The observation.
     * @returns The Esri geometry type.
     */
    private esriGeometryType(observation: ObservationAttrs): string {

        let esriGeometryType = ''

        if (observation.geometry != null) {
            esriGeometryType = this.mageTypeToEsriType(observation.geometry.type);
        }

        return esriGeometryType
    }

    /**
     * Converts and adds observation values to ArcObject attributes.
     * @param observation The observation to convert.
     * @param transform The Event transform.
     * @param user The MAGE user.
     * @param arcObject The converted ArcObject.
     */
    private observationToAttributes(observation: ObservationAttrs, transform: EventTransform, user: User | null, arcObject: ArcObject) {
        let observationIdValue = observation.id
        if (this._config.eventIdField == null) {
            observationIdValue += this._config.idSeparator + observation.eventId
        } else {
            this.addAttribute(this._config.eventIdField, observation.eventId, arcObject)
        }
        this.addAttribute(this._config.observationIdField, observationIdValue, arcObject)
        const mageEvent = transform.mageEvent
        if (this._config.eventNameField != null && mageEvent != null) {
            this.addAttribute(this._config.eventNameField, mageEvent.name, arcObject)
        }
        if (this._config.userIdField != null && observation.userId != null) {
            this.addAttribute(this._config.userIdField, observation.userId, arcObject)
        }
        if (user != null) {
            if (this._config.usernameField != null) {
                this.addAttribute(this._config.usernameField, user.username, arcObject)
            }
            if (this._config.userDisplayNameField != null) {
                this.addAttribute(this._config.userDisplayNameField, user.displayName, arcObject)
            }
        }
        if (this._config.deviceIdField != null && observation.deviceId != null) {
            this.addAttribute(this._config.deviceIdField, observation.deviceId, arcObject)
        }
        if (this._config.createdAtField != null) {
            this.addAttribute(this._config.createdAtField, observation.createdAt, arcObject)
        }
        if (this._config.lastModifiedField != null) {
            this.addAttribute(this._config.lastModifiedField, observation.lastModified, arcObject)
        }
    }

    /**
     * Converts an observation geometry to an ArcGeometry.
     * @param geometry The observation geometry to convert.
     * @returns The converted ArcGeometry.
     */
    private geometryToArcGeometry(geometry: Geometry): ArcGeometry {

        var arcGeometry = {} as ArcGeometry

        switch (geometry.type) {
            case 'Point':
                arcGeometry = this.pointToArcPoint(geometry as Point)
                break;
            case 'LineString':
                arcGeometry = this.lineStringToArcPolyline(geometry as LineString)
                break;
            case 'Polygon':
                arcGeometry = this.polygonToArcPolygon(geometry as Polygon)
                break;
            default:
                break;
        }

        arcGeometry.spatialReference = { wkid: 4326 }

        return arcGeometry
    }

    /**
     * Converts an observation Point to an ArcPoint.
     * @param point The observation Point to convert.
     * @returns The converted ArcPoint.
     */
    private pointToArcPoint(point: Point): ArcPoint {
        const arcPoint = {} as ArcPoint
        arcPoint.x = point.coordinates[0]
        arcPoint.y = point.coordinates[1]
        return arcPoint
    }

    /**
     * Converts an observation LineString to an ArcPolyline.
     * @param lineString The observation LineString to convert.
     * @returns The converted ArcPolyline.
     */
    private lineStringToArcPolyline(lineString: LineString): ArcPolyline {
        const arcPolyline = {} as ArcPolyline
        arcPolyline.paths = [lineString.coordinates]
        return arcPolyline
    }

    /**
     * Converts an observation Polygon to an ArcPolygon.
     * @param polygon The observation Polygon to convert.
     * @returns The converted ArcPolygon.
     */
    private polygonToArcPolygon(polygon: Polygon): ArcPolygon {
        const arcPolygon = {} as ArcPolygon
        arcPolygon.rings = polygon.coordinates
        return arcPolygon
    }

    /**
     * Converts and adds observation properties to ArcObject attributes.
     * @param properties The observation properties to convert.
     * @param transform The Event transform.
     * @param arcObject The converted ArcObject.
     * @return form ids map
     */
    private propertiesToAttributes(properties: { [name: string]: any }, transform: EventTransform, arcObject: ArcObject): { [name: string]: number } {
        let formIds: { [name: string]: number } = {}
        for (const property in properties) {
            const value = properties[property]
            if (property == 'forms') {
                formIds = this.formsToAttributes(value, transform, arcObject)
            } else {
                this.addAttribute(property, value, arcObject)
            }
        }
        return formIds
    }

    /**
     * Converts and adds observation property forms data to ArcObject attributes.
     * @param forms The observation property forms to convert.
     * @param transform The Event transform.
     * @param arcObject The converted ArcObject.
     * @return form ids map
     */
    private formsToAttributes(forms: [{ [name: string]: any }], transform: EventTransform, arcObject: ArcObject): { [name: string]: number } {

        const formIds: { [id: string]: number } = {}
        const formIdCount: { [id: number]: number } = {}

        const mageEvent = transform.mageEvent

        for (let i = 0; i < forms.length; i++) {
            const form = forms[i]
            const formId = form['formId']
            const id = form['id']
            let fields = null
            let formCount = 1
            if (formId != null && id != null) {
                formIds[id] = formId
                let count = formIdCount[formId]
                if (count == null) {
                    count = 0
                }
                formCount = count + 1
                formIdCount[formId] = formCount
                fields = transform.get(formId)
            }
            for (const formProperty in form) {
                let value = form[formProperty]
                if (value != null) {
                    if (mageEvent != null && formId != null) {
                        const field = mageEvent.formFieldFor(formProperty, formId)
                        if (field != null && field.type !== FormFieldType.Attachment) {
                            let title = field.title
                            if (fields != undefined) {
                                const fieldTitle = fields.get(title)
                                if (fieldTitle != undefined) {
                                    title = fieldTitle
                                }
                            }
                            if (field.type == FormFieldType.Geometry) {
                                value = this.geometryToArcGeometry(value)
                            }
                            this.addFormAttribute(title, formCount, value, arcObject)
                        }
                    } else {
                        this.addFormAttribute(formProperty, formCount, value, arcObject)
                    }
                }
            }
        }

        return formIds
    }

    /**
     * Add an ArcObject attribute for a form field.
     * @param name The attribute name.
     * @param count The form count.
     * @param value The attribute value.
     * @param arcObject The converted ArcObject.
     */
    private addFormAttribute(name: string, count: number, value: any, arcObject: ArcObject) {

        if (count > 1 && this._config.attributes != null) {
            const concat = this._config.attributes[name]?.concatenation
            if (concat != null && (concat.sameForms == null || concat.sameForms)) {
                count = 1
            }
        }

        const attribute = this.appendCount(name, count)
        this.addAttribute(attribute, value, arcObject)
    }

    /**
     * Add an ArcObject attribute.
     * @param name The attribute name.
     * @param value The attribute value.
     * @param arcObject The converted ArcObject.
     */
    private addAttribute(name: string, value: any, arcObject: ArcObject) {

        if (value != null) {

            if (arcObject.attributes == null) {
                arcObject.attributes = {}
            }

            let attribute = ObservationsTransformer.replaceSpaces(name)

            if (Object.prototype.toString.call(value) === '[object Date]') {
                value = new Date(value).getTime()
            }

            let config = null
            if (this._config.attributes != null) {
                config = this._config.attributes[name]
            }

            if (config?.mappings != null) {
                const fieldValue = config.mappings[value]
                if (fieldValue != null) {
                    value = fieldValue
                }
            }

            let existingValue = arcObject.attributes[attribute]
            if (existingValue !== undefined) {

                const concat = config?.concatenation
                if (concat != null && (concat.differentForms == null || concat.differentForms)) {

                    let delimiter = concat.delimiter
                    if (delimiter == null) {
                        delimiter = ', '
                    }
                    value = existingValue + delimiter + value

                } else {

                    let baseKey = attribute
                    let count = 1
                    const countIndex = attribute.lastIndexOf('_')
                    if (countIndex != -1) {
                        const countString = attribute.substring(countIndex + 1)
                        if (countString != null && countString !== '') {
                            const countNumber = Number(countString)
                            if (!isNaN(countNumber)) {
                                baseKey = attribute.substring(0, countIndex)
                                count = countNumber
                            }
                        }
                    }
                    do {
                        count += 1
                        attribute = this.appendCount(baseKey, count)
                    } while (arcObject.attributes[attribute] !== undefined)

                }

            }

            arcObject.attributes[attribute] = value
        }

    }

    /**
     * Add ArcObject attribute defaults.
     * @param arcObject The converted ArcObject.
     */
    private addDefaults(arcObject: ArcObject) {

        for (const attributeDefaults of Object.entries(this._defaults)) {
            const attribute = attributeDefaults[0]
            if (arcObject.attributes[attribute] == null) {
                const defaults = attributeDefaults[1]
                for (const attributeDefault of defaults) {
                    let setDefault = true
                    const condition = attributeDefault.condition
                    if (condition != null && condition.length > 0) {
                        for (const valueConfig of condition) {
                            const value = arcObject.attributes[valueConfig.attribute]
                            const values = valueConfig.values
                            if (values.length == 0) {
                                setDefault = value == null
                            } else {
                                setDefault = values.includes(value)
                            }
                            if (!setDefault) {
                                break
                            }
                        }
                    }
                    if (setDefault) {
                        arcObject.attributes[attribute] = attributeDefault.value
                        break
                    }
                }
            }
        }

    }

    /**
     * Transform observation attachments.
     * @param attachments The observation attachments.
     * @param formIds Form ids map.
     * @param transform The Event transform.
     * @return  The converted ArcAttachments.
     */
    private attachments(attachments: readonly Attachment[], formIds: { [name: string]: number }, transform: EventTransform): ArcAttachment[] {

        const arcAttachments: ArcAttachment[] = []

        const mageEvent = transform.mageEvent

        for (const attachment of attachments) {

            if (attachment.contentLocator != null) {

                let fieldName = attachment.fieldName
                if (mageEvent != null) {
                    const formId = formIds[attachment.observationFormId]
                    if (formId != null) {
                        const field = mageEvent.formFieldFor(fieldName, formId)
                        if (field != null) {
                            fieldName = field.title
                        }
                    }
                }

                const arcAttachment = {} as ArcAttachment
                arcAttachment.field = ObservationsTransformer.replaceSpaces(fieldName)
                if (attachment.lastModified != null) {
                    arcAttachment.lastModified = new Date(attachment.lastModified).getTime()
                }
                if (attachment.size != null) {
                    arcAttachment.size = attachment.size
                }
                if (attachment.name != null) {
                    const extensionIndex = attachment.name.lastIndexOf('.')
                    if (extensionIndex != -1) {
                        arcAttachment.name = attachment.name.substring(0, extensionIndex)
                    } else {
                        arcAttachment.name = attachment.name
                    }
                } else {
                    arcAttachment.name = attachment.id
                }
                arcAttachment.contentLocator = attachment.contentLocator

                arcAttachments.push(arcAttachment)
            }
        }

        return arcAttachments
    }

    /**
     * Replace spaces in the name with underscores.
     * @param name The name.
     * @return name with replaced spaces.
     */
    static replaceSpaces(name: string): string {
        return name.replace(/ /g, '_')
    }

    /**
     * Append a count to a name for additional duplicate field names.
     * @param name The name.
     * @param count The count.
     * @return name with count.
     */
    private appendCount(name: string, count: number): string {
        let value = name
        if (count > 1) {
            value += '_' + count
        }
        return value
    }

    /**
     * Remove ArcObject attribute omissions.
     * @param arcObject The converted ArcObject.
     */
    private removeOmissions(arcObject: ArcObject) {

        const attributes = arcObject.attributes
        const attributeKeys = Object.keys(attributes)

        for (const omit of this._omit) {
            const regex = new RegExp('^' + omit + '(_\\d+)?$')
            var regexAttributes = attributeKeys.filter((name) => regex.test(name))
            for (const attribute of regexAttributes) {
                delete attributes[attribute]
            }
        }

    }

}