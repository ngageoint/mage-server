export enum DevicePermission {
  CREATE_DEVICE = 'CREATE_DEVICE',
  READ_DEVICE = 'READ_DEVICE',
  UPDATE_DEVICE = 'UPDATE_DEVICE',
  DELETE_DEVICE = 'DELETE_DEVICE'
}

export enum UsersPermission {
  CREATE_USER = 'CREATE_USER',
  READ_USER = 'READ_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  UPDATE_USER_ROLE = 'UPDATE_USER_ROLE',
  UPDATE_USER_PASSWORD = 'UPDATE_USER_PASSWORD'
}

export enum RolePermission {
  CREATE_ROLE = 'CREATE_ROLE',
  READ_ROLE = 'READ_ROLE',
  UPDATE_ROLE = 'UPDATE_ROLE',
  DELETE_ROLE = 'DELETE_ROLE'
}

export enum MageEventPermission {
  READ_EVENT_ALL = 'READ_EVENT_ALL',
  READ_EVENT_USER = 'READ_EVENT_USER',
  CREATE_EVENT = 'CREATE_EVENT',
  UPDATE_EVENT = 'UPDATE_EVENT',
  DELETE_EVENT = 'DELETE_EVENT'
}

export enum LayerPermission {
  READ_LAYER_ALL = 'READ_LAYER_ALL',
  READ_LAYER_EVENT = 'READ_LAYER_EVENT',
  UPDATE_LAYER = 'UPDATE_LAYER',
  CREATE_LAYER = 'CREATE_LAYER',
  DELETE_LAYER = 'DELETE_LAYER',
}

export enum ObservationPermission {
  READ_OBSERVATION_ALL = 'READ_OBSERVATION_ALL',
  READ_OBSERVATION_EVENT = 'READ_OBSERVATION_EVENT',
  READ_OBSERVATION_TEAM = 'READ_OBSERVATION_TEAM',
  READ_OBSERVATION_USER = 'READ_OBSERVATION_USER',
  UPDATE_OBSERVATION_ALL = 'UPDATE_OBSERVATION_ALL',
  UPDATE_OBSERVATION_EVENT = 'UPDATE_OBSERVATION_EVENT',
  UPDATE_OBSERVATION_TEAM = 'UPDATE_OBSERVATION_TEAM',
  UPDATE_OBSERVATION_USER = 'UPDATE_OBSERVATION_USER',
  CREATE_OBSERVATION = 'CREATE_OBSERVATION',
  DELETE_OBSERVATION = 'DELETE_OBSERVATION'
}

export enum LocationPermission {
  READ_LOCATION_ALL = 'READ_LOCATION_ALL',
  READ_LOCATION_EVENT = 'READ_LOCATION_EVENT',
  READ_LOCATION_TEAM = 'READ_LOCATION_TEAM',
  READ_LOCATION_USER = 'READ_LOCATION_USER',
  UPDATE_LOCATION_ALL = 'UPDATE_LOCATION_ALL',
  UPDATE_LOCATION_EVENT = 'UPDATE_LOCATION_EVENT',
  UPDATE_LOCATION_TEAM = 'UPDATE_LOCATION_TEAM',
  UPDATE_LOCATION_USER = 'UPDATE_LOCATION_USER',
  CREATE_LOCATION = 'CREATE_LOCATION',
  DELETE_LOCATION = 'DELETE_LOCATION'
}

export enum TeamPermission {
  CREATE_TEAM = 'CREATE_TEAM',
  READ_TEAM = 'READ_TEAM',
  UPDATE_TEAM = 'UPDATE_TEAM',
  DELETE_TEAM = 'DELETE_TEAM'
}

export enum SettingPermission {
  READ_SETTINGS = 'READ_SETTINGS',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  MAP_SETTINGS_READ = 'MAP_SETTINGS_READ',
  MAP_SETTINGS_UPDATE = 'MAP_SETTINGS_UPDATE',
}

export enum FeedsPermission {
  FEEDS_LIST_SERVICE_TYPES = 'FEEDS_LIST_SERVICE_TYPES',
  FEEDS_CREATE_SERVICE = 'FEEDS_CREATE_SERVICE',
  FEEDS_LIST_SERVICES = 'FEEDS_LIST_SERVICES',
  FEEDS_LIST_TOPICS = 'FEEDS_LIST_TOPICS',
  FEEDS_CREATE_FEED = 'FEEDS_CREATE_FEED',
  FEEDS_LIST_ALL = 'FEEDS_LIST_ALL',
  FEEDS_FETCH_CONTENT = 'FEEDS_FETCH_CONTENT',
}

export enum StaticIconPermission {
  STATIC_ICON_WRITE = 'STATIC_ICON_WRITE',
}

export enum ExportPermission {
  READ_EXPORT = 'READ_EXPORT',
  DELETE_EXPORT = 'DELETE_EXPORT',
}

export const allPermissions = Object.freeze({
  ...DevicePermission,
  ...UsersPermission,
  ...RolePermission,
  ...MageEventPermission,
  ...LayerPermission,
  ...ObservationPermission,
  ...LocationPermission,
  ...TeamPermission,
  ...SettingPermission,
  ...FeedsPermission,
  ...StaticIconPermission,
  ...ExportPermission,
})

export type AnyPermission =
  | DevicePermission
  | UsersPermission
  | RolePermission
  | MageEventPermission
  | LayerPermission
  | ObservationPermission
  | LocationPermission
  | TeamPermission
  | SettingPermission
  | FeedsPermission
  | StaticIconPermission
  | ExportPermission

const allPermissionsList = Object.freeze(Object.values(allPermissions))

export function getPermissions(): readonly string[] {
  return allPermissionsList
}
