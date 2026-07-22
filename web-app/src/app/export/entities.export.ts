import { MageEvent } from "@ngageoint/mage.web-core-lib/event"
import { User } from "core-lib-src/user"

export enum ExportFormat {
  KML = 'kml',
  CSV = 'csv',
  GEOJSON = 'geojson',
  GEOPACKAGE = 'geopackage'
}

export enum ExportStatus {
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed'
}

export interface Export {
  id: any,
  user?: User,
  physicalPath: string,
  filename?: string,
  exportType: string,
  url: string,
  status: ExportStatus,
  options: {
    event?: MageEvent
    filter?: any,
    projection?: any
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
  observations: boolean,
  locations: boolean,
  includeAttachments?: boolean,
  favorites?: boolean,
  important?: boolean,
  startDate?: string,
  endDate?: string,
  projection?: ExportFormProjection[]
}

export interface FormProjection {
  form: any,
  selected: boolean,
  selectedCount: number,
  fieldProjections: FieldProjection[]
}

export interface FieldProjection {
  field: any,
  selected: boolean
}

export interface ExportTimeOption {
  all?: boolean,
  custom?: boolean,
  value: number,
  label: string,
  key: string
}
