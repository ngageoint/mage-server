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
    }
    iconClass?: string;
}