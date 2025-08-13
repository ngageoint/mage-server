import { User } from "core-lib-src/user";

export type LoginPage = {
  logins: Login[];
  next: string;
  prev: string;
};

export type Login = {
  device: Device;
  id: string;
  timestamp: Date;
  user: User;
};

export type LoginSearchResults = {
  active: boolean;
  allPhones: string;
  displayName: string;
  enabled: boolean;
  id: string;
  username: string;
};

export type Device = {
  appVersion: string;
  id: string;
  registered: boolean;
  uid: number | string;
  userAgent: string;
  userId: string;
  iconClass: string;
};

export type LoginFilter = {
  user?: User | null;
  deviceIds?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
};

export type Sort = {
  displayName: number;
  _id: number;
}

export type UserFilter = {
  pageSize: number;
  pageIndex: number;
  sort: Sort;
  active?: boolean;
  enabled?: boolean;
}

export type PageLinks = {
  next: string | null;
  prev: string | null;
}

export type PageInfo = {
  totalCount: number;
  pageSize: number;
  pageIndex: number;
  items: User[];
  links: PageLinks;
}

export type Category = {
  countFilter: Record<string, any>;
  userFilter: UserFilter;
  searchFilter: string;
  userCount: number;
  pageInfo: PageInfo;
}

export type UsersResponse = {
  all: Category;
  active: Category;
  inactive: Category;
  disabled: Category;
}
export type DeviceUser = {
  displayName: string;
  id: string;
};

export type DeviceSort = {
  userAgent: number;
  _id: number;
};

export type DeviceFilter = {
  limit: number;
  sort: DeviceSort;
  registered?: boolean;
};

export type DevicePageLinks = {
  base: string;
  context: string;
  next: string | null;
  prev: string | null;
  self: string;
};

export type DevicePageInfo = {
  links: DevicePageLinks;
  limit: number;
  size: number;
  start: number;
  devices: Device[];
};

export type DeviceCategory = {
  countFilter: Record<string, any>;
  deviceFilter: DeviceFilter;
  searchFilter: string;
  deviceCount: number;
  pageInfo: DevicePageInfo;
};

export type DevicesResponse = {
  all: DeviceCategory;
  registered: DeviceCategory;
  unregistered: DeviceCategory;
};
