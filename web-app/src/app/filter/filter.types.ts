import { User } from "@ngageoint/mage.web-core-lib/user";
import { filterChanges } from "../event/event.types";

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
  url: string;
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
