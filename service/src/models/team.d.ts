export { Team as TeamModel };
export function userHasAclPermission(team: any, userId: any, permission: any): any;
export function getTeamById(id: any, options: any, callback: any): void;
export function getMembers(teamId: any, options: any): Promise<{
    pageSize: any;
    pageIndex: any;
    items: User.UserDocument[];
} | null>;
export function getNonMembers(teamId: any, options: any): Promise<{
    pageSize: any;
    pageIndex: any;
    items: User.UserDocument[];
} | null>;
export function teamsForUserInEvent(user: any, event: any, callback: any): void;
export function count(options: any, callback: any): void;
export function getTeams(options: any, callback: any): void;
export function createTeam(team: any, user: any, callback: any): void;
export function createTeamForEvent(event: any, user: any, callback: any): void;
export function getTeamForEvent(event: any): mongoose.DocumentQuery<mongoose.Document | null, mongoose.Document>;
export function updateTeam(id: any, update: any, callback: any): void;
export function deleteTeam(team: any, callback: any): void;
export function addUser(team: any, user: any, callback: any): void;
export function removeUser(team: any, user: any, callback: any): void;
export function updateUserInAcl(teamId: any, userId: any, role: any, callback: any): any;
export function updateUserInAclForEventTeam(eventId: any, userId: any, role: any, callback: any): void;
export function removeUserFromAcl(teamId: any, userId: any, callback: any): void;
export function removeUserFromAclForEventTeam(eventId: any, userId: any, callback: any): void;
export function removeUserFromAllAcls(user: any, callback: any): void;
declare var Team: mongoose.Model<mongoose.Document>;
import mongoose = require("mongoose");
import User from './user'