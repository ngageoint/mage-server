export type Login = {
  device: LoginDevice;
  id: string;
  timestamp: Date;
  user: { id: string; displayName: string };
};

export type LoginDevice = {
  appVersion: string;
  id: string;
  registered: boolean;
  uid: number | string;
  userAgent: string;
  userId: string;
  iconClass: string;
};

export type LoginPage = {
  logins: Login[];
  next: string | null;
  prev: string | null;
};

export type LoginFilter = {
  user?: { id: string } | null;
  device?: { id: string } | null;
  deviceIds?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
};

export type LoginSearchResults = {
  active: boolean;
  allPhones: string;
  displayName: string;
  enabled: boolean;
  id: string;
  username: string;
};
