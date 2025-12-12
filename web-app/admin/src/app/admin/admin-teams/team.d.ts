import { ObjectId } from 'mongodb';

export interface Team {
    id: ObjectId;
    name: string;
    description: string;
    teamEventId: number | string;
    users: ObjectId[];
    acl: Records<ObjectId, string>;
    permissions?: string[];
}

export interface TeamAcl {
    [userId: string]: {
        role: 'OWNER' | 'MANAGER' | 'GUEST';
        permissions: string[];
    };
}

export type TeamMemberRole = 'OWNER' | 'MANAGER' | 'GUEST';