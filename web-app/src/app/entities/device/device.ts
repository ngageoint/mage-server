export type Device = {
  uid?: string;
  registered?: boolean;
  appVersion?: string;
  userAgent?: string;
  id?: string;
  description?: string;
  user?: {
    displayName: string;
    id: string;
  };
  iconClass?: string;
};

export type DeviceRequest = {
  uid?: string;
  description?: string;
  userId?: string | null;
  registered?: boolean;
};

export function platformLabel(device: Device | null | undefined): string {
  if (!device) return 'Unknown';
  if (device.appVersion === 'Web Client') return 'Web';
  const userAgent = (device.userAgent || '').toLowerCase();
  if (userAgent.includes('android')) return 'Android';
  if (userAgent.includes('ios')) return 'iOS';
  return 'Unknown';
}

export function deviceIconName(device: Device | null | undefined): string {
  if (!device) return 'smartphone';
  if (device.appVersion === 'Web Client') return 'computer';
  const userAgent = (device.userAgent || '').toLowerCase();
  if (userAgent.includes('android')) return 'android';
  if (userAgent.includes('ios')) return 'ios';
  return 'smartphone';
}
