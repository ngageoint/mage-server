import { MageEventId } from "@ngageoint/mage.service/lib/entities/events/entities.events";

/**
 * Contains an arc feature service url and layers.
 */
export interface FeatureServiceConfig {

    /**
     * The url to the arc feature service.
     */
    url: string

    /**
    * Serialized ArcGISIdentityManager
    */
    identityManager: string

    /**
     * The feature layers.
     */
    layers: FeatureLayerConfig[]
}

/**
 * Contains an arc feature layer and the event ids that sync to it.
 */
export interface FeatureLayerConfig {

    /**
     * The layer name.
     */
    layer: string | number

    /**
     * The geometry type for new layers
     */
    geometryType?: string

    /**
     * The event ids that sync to this arc feature layer.
     */
    eventIds?: MageEventId[]
}


/**
 * Attribute configurations
 */
export interface AttributeConfig {

    /**
     * String value concatenation.
     */
    concatenation?: AttributeConcatenationConfig

    /**
     * Value mappings
     */
    mappings?: { [value: string]: unknown }

    /**
     * Default values
     */
    defaults?: AttributeDefaultConfig[]

    /**
     * Omit the attribute (including count suffix versions) from ArcGIS adds and updates
     */
    omit?: boolean

}

/**
 * Same string attribute concatenation configuration.
 */
export interface AttributeConcatenationConfig {

    /**
     * Delimiter used to combine two string values.
     */
    delimiter: string

    /**
     * Combine attribute values from multiple same forms.
     */
    sameForms?: boolean

    /**
     * Combine attribute values from different forms.
     */
    differentForms?: boolean

}

/**
 * Attribute default value configuration.
 */
export interface AttributeDefaultConfig {

    /**
     * Default value.
     */
    value: unknown

    /**
     * Conditional attribute equality values when the default applies.
     */
    condition?: AttributeValueConfig[]

}

/**
 * Attribute value configuration.
 */
export interface AttributeValueConfig {

    /**
     * Attribute name.
     */
    attribute: string

    /**
     * Attribute values.
     */
    values: unknown[]

}
