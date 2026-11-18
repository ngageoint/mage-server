import { MageEvent } from "@ngageoint/mage.web-core-lib/event"
import { User } from "core-lib-src/user"
import { Condition, ObservationFieldFilter } from "../entities/observation/filter/entities.observation.filter"
import { Form, FormField } from "../entities/event/entities.event"

export const ExportFormat = {
  KML: 'kml',
  CSV: 'csv',
  GEOJSON: 'geojson',
  GEOPACKAGE: 'geopackage'
} as const
export type ExportFormat = typeof ExportFormat[keyof typeof ExportFormat]

export const ExportStatus = {
  Running: 'Running',
  Completed: 'Completed',
  Failed: 'Failed'
} as const
export type ExportStatus = typeof ExportStatus[keyof typeof ExportStatus]

export interface ExportObservationFilter {
  startDate?: string,
  endDate?: string,
  includeAttachments?: boolean,
  favorites?: boolean,
  important?: boolean,
  hasAttachments?: boolean,
  userIsAnyOf?: string[],
  teamIsAnyOf?: string[],
  fieldFilter?: ObservationFieldFilter,
  projection?: ExportFormProjection[]
}

export interface ExportLocationFilter {
  startDate?: string,
  endDate?: string,
  userIsAnyOf?: string[],
  teamIsAnyOf?: string[]
}

export interface ExportFilter {
  observations?: ExportObservationFilter,
  locations?: ExportLocationFilter
}

export interface Export {
  id: string,
  url: string,
  user?: User,
  exportType: string,
  status: ExportStatus,
  options: {
    event?: MageEvent
    filter?: ExportFilter
  },
  summary?: {
    observations?: {
      count: number,
      startTimestamp: string,
      endTimestamp: string
    },
    locations?: {
      count: number,
      startTimestamp: string,
      endTimeStamp: string
    }
  }
}

export interface ExportFormProjection {
  formId: number,
  fields: string[]
}

export interface ExportRequest {
  format: ExportFormat,
  observations?: {
    startDate?: string,
    endDate?: string,
    includeAttachments?: boolean,
    favorites?: boolean,
    important?: boolean,
    hasAttachments?: boolean,
    users?: string[],
    teams?: string[],
    keyword?: string,
    condition?: Condition,
    projection?: ExportFormProjection[]
  },
  locations?: {
    startDate?: string,
    endDate?: string,
    users?: string[],
    teams?: string[]
  }
}

export interface FormProjection {
  form: Form,
  selected: boolean,
  selectedCount: number,
  fieldProjections: FieldProjection[]
}

export interface FieldProjection {
  field: FormField,
  selected: boolean
}

