export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
}

export interface UserPhone {
    type: string;
    number: string;
}

export interface UserIcon {
    color?: string;
    contentType?: string;
    size?: number;
    text?: string;
    type: 'create' | 'upload' | 'none';
}

export interface User {
    id: string;
    username: string;
    displayName: string;
    active: boolean;
    enabled: boolean;
    authentication: any;
    createdAt?: string;
    lastUpdated?: string;
    role: Role;
    email?: string;
    avatarUrl?: string;
    icon?: UserIcon | File | null;
    iconUrl?: string;
    phones: UserPhone[];
    recentEventIds?: number[];
    [key: string]: any;
}
