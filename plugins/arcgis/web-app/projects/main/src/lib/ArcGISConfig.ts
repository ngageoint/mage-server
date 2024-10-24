/**
 * Contains an arc feature service url and layers.
 */
export interface FeatureServiceConfig {

    /**
     * The url to the arc feature service.
     */
    url: string

    /**
     * Username and password for ArcGIS authentication
     */
    auth?: ArcGISAuthConfig

    /**
     * Create layers that don't exist
     */
    createLayers?: boolean

    /**
     * The administration url to the arc feature service.
     */
    adminUrl?: string

    /**
     * Administration access token
     */
    adminToken?: string

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
     * Access token
     */
    token?: string // TODO - can this be removed? Will Layers have a token too?
    /**
     * The event ids or names that sync to this arc feature layer.
     */
    events?: (number|string)[]

    /**
     * Add layer fields from form fields
     */
    addFields?: boolean

    /**
     * Delete editable layer fields missing from form fields
     */
    deleteFields?: boolean

}

export enum AuthType {
    Token = 'token',
    UsernamePassword = 'usernamePassword',
    OAuth = 'oauth'
  }
  

/**
 * Contains token-based authentication configuration.
 */
export interface TokenAuthConfig {
    type: AuthType.Token
    token: string
    authTokenExpires?: string
}

/**
 * Contains username and password for ArcGIS server authentication.
 */
export interface UsernamePasswordAuthConfig {
    type: AuthType.UsernamePassword
    /**
     * The username for authentication.
     */
    username: string

    /**
     * The password for authentication.
     */
    password: string
}

/**
 * Contains OAuth authentication configuration.
 */
export interface OAuthAuthConfig {
    type: AuthType.OAuth
    /**
     * The Client Id for OAuth
     */
    clientId: string
    /**
     * The redirectUri for OAuth
     */
    redirectUri?: string

    /**
     * The temporary auth token for OAuth
     */
    authToken?: string

        /**
     * The expiration date for the temporary token
     */
    authTokenExpires?: string

    /**
     * The Refresh token for OAuth
     */
    refreshToken?: string

    /**
     * The expiration date for the Refresh token
     */
    refreshTokenExpires?: string
}

/**
 * Union type for authentication configurations.
 */
export type ArcGISAuthConfig = 
    | TokenAuthConfig
    | UsernamePasswordAuthConfig
    | OAuthAuthConfig

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
    mappings?: { [value: string]: any }

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
    value: any

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
    values: any[]

}
