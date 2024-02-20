import { FeatureServiceConfig, AttributeConfig } from "./ArcGISConfig"

/**
 * Contains various configuration values used by the plugin.
 */
export interface ArcGISPluginConfig {

  /**
   * When true, the plugin will process new observations and send them to a configured ArcGIS server.
   */
  enabled: boolean

  /**
   * Query the database for new observations to process at the given
   * repeating time interval in seconds.
   */
  intervalSeconds: number

  /**
   * The interval in seconds to wait before trying to see if we have FeatureLayerProcessors ready
   * to be used.
   */
  startupIntervalSeconds: number

  /**
   * If there are pending updates to observation this is the interval in seconds the processor will wait
   * before running again.
   */
  updateIntervalSeconds: number

  /**
   * Limit processing to the given number of observations during one
   * interval.  This may be necessary so we do not overload an ArcGIS feature layer.
   */
  batchSize: number

  /**
   * The feature services to send new observations to.
   */
  featureServices: FeatureServiceConfig[]

  /**
   * The time tolerance in milliseconds to consider an attachment last modified time equal
   * to or after an observation last modified time.
   */
  attachmentModifiedTolerance: number

  /**
   * Default length of ArcGIS created text fields from MAGE form text fields
   */
  textFieldLength: number

  /**
   * Default length of ArcGIS created text fields from MAGE form text areas
   */
  textAreaFieldLength: number

  /**
   * The field name to save and query the observation id to and from the ArcGIS server.
   */
  observationIdField: string

  /**
   * The separator between the observation id and the event id when combined into one field.
   */
  idSeparator: string

  /**
  * The event id field attribute name.
  */
  eventIdField?: string

  /**
  * The last edited date field attribute name on the ArcGIS server.
  */
  lastEditedDateField?: string

  /**
   * The event name field attribute name.
   */
  eventNameField?: string

  /**
   * The user id field attribute name.
   */
  userIdField?: string

  /**
   * The username field attribute name.
   */
  usernameField?: string

  /**
   * The user display name field attribute name.
   */
  userDisplayNameField?: string

  /**
   * The device id field attribute name.
   */
  deviceIdField?: string

  /**
   * The created at field attribute name.
   */
  createdAtField?: string

  /**
   * The last modified field attribute name from MAGE observations (may be the same as lastEditedDateField if editable).
   */
  lastModifiedField?: string

  /**
   * The Esri geometry type attribute name.
   */
  geometryType?: string

  /**
   * Override mappings between event form fields and ArcGIS attributes as: { event: { form: { field: attribute } } }
   */
  fieldAttributes?: any

  /**
   * The attribute configurations.
   */
  attributes?: { [attribute: string]: AttributeConfig }

}

export const defaultArcGISPluginConfig = Object.freeze<ArcGISPluginConfig>({
  enabled: true,
  intervalSeconds: 60,
  startupIntervalSeconds: 1,
  updateIntervalSeconds: 1,
  batchSize: 100,
  featureServices: [],
  attachmentModifiedTolerance: 5000,
  textFieldLength: 100,
  textAreaFieldLength: 256,
  observationIdField: 'description',
  idSeparator: '-',
  // eventIdField: 'event_id',
  lastEditedDateField: 'last_edited_date',
  eventNameField: 'event_name',
  userIdField: 'user_id',
  usernameField: 'username',
  userDisplayNameField: 'user_display_name',
  deviceIdField: 'device_id',
  createdAtField: 'created_at',
  lastModifiedField: 'last_modified',
  geometryType: 'geometry_type',
  fieldAttributes: {},
  attributes: {
    'symbolid': {
      defaults: [
        {
          value: 3,
          condition: [
            { attribute:'geometry_type', values: ['esriGeometryPolyline'] }
          ]
        },
        {
          value: 1,
          condition: [
            { attribute:'geometry_type', values: ['esriGeometryPolygon'] }
          ]
        }
      ]
    }
  }
})
