import { User } from "@ngageoint/mage.web-core-lib/user";
import { filterChanges } from "../event/event.types";
import { AttachmentAction } from "../observation/observation-edit/observation-edit-attachment/observation-edit-attachment-action";

export type FormField = {
  name: string;
  id: number;
  title: string;
  type: string;
  required: boolean;
  allowedAttachmentTypes: string[];
  choices: string[];
  value: any;
};
export type Form = {
  name: string;
  primaryFeedField: string;
  secondaryFeedField: string;
  id: number;
  color: string;
  default: boolean;
  fields: FormField[];
  userFields: string[];
  archived: boolean;
  min: number;
  max: number;
};

export type FormProperties = {
  formId: number;
  id: string;
  [name: string]: any;
};

export type Team = {
  name?: string;
  id?: number;
  acl?: Record<string, { role: string; permissions: string[] }>;
  description?: string;
  teamEventId?: number;
  userIds?: string[];
  __v?: number;
};

export type TeamById = Record<string, Team>;

export type Style = {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
};

export type Layer = {
  name: string;
  id: number;
  state: string;
  type: string;
  url: string;
  __v: number;
};

export type Event = {
  name: string;
  id: number;
  acl?: Record<string, { role: string; permissions: string[] }>;
  description: string;
  feedIds: string[];
  forms: Form[];
  layers: Layer[];
  style: Style;
  teams: Team[];
};

export type FilterChoice = {
  filter: string | number;
  label: string;
};

export type IntervalOptions = {
  endDate?: Date;
  startDate?: Date;
  localTime?: Boolean;
};

export type SearchInterval = {
    start: string;
    end: string;
}

export type Interval = {
  choice?: FilterChoice;
  options?: IntervalOptions;
};

export const AttachmentProcessingStatus = Object.freeze({
  Pending: 'pending',
  Success: 'success',
  Rejected: 'rejected',
  Error: 'error'
} as const)

export type AttachmentProcessingStatus = (typeof AttachmentProcessingStatus)[keyof typeof AttachmentProcessingStatus]

export type Attachment = {
  contentType: string;
  fieldName: string;
  id: string;
  lastModified: Date;
  name: string;
  observationFormId: string;
  oriented: boolean;
  relativePath: string;
  size: number;
  url?: string; // Should have '?'
  processingStatus?: AttachmentProcessingStatus;
  processingMessage?: string
  processingHook?: string
  action?: AttachmentAction
  // TODO: never actually assigned anywhere in the codebase - appears to be
  // vestigial/dead code from an incomplete cache-busting feature. Left
  // loosely typed rather than guessing at an intended shape.
  synced?: any
};

export type Observation = {
  id: string;
  attachments: Attachment[];
  createdAt: Date;
  deviceId: string;
  eventId: number;
  favoriteUserIds: string[];
  geometry: { type: string; coordinates: number[] };
  lastModified: Date;
  properties: { forms: FormProperties[]; timestamp: Date };
  state: {
    id: string;
    name: string;
    url: string;
    userId: string;
  };
  style: Style;
  type: string;
  url: string;
  user: User;
  userId: string;
  important: { desciption: string; timestamp: Date; user: User };
};

export type Filter = {
  event?: Event;
  teams?: Team[];
  users?: User[];
  forms?: Form[];
  intervalChoice?: FilterChoice;
  timeInterval?: Interval;
  actionFilter?: string;
};

export type Changes = {
  event?: filterChanges;
  teams?: filterChanges;
  users?: filterChanges;
  forms?: filterChanges;
  timeInterval?: Interval;
  actionFilter?: string;
  intervalChoice?: FilterChoice;
};
