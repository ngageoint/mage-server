import { User } from "@ngageoint/mage.web-core-lib/user";
import { Event } from "../filter/filter.types";

export type MemberPage = {
    items: User[];
    pageIndex: number;
    pageSize: number;
    totalCount: number;
  };
  
export type filterChanges = { added?: any[]; updated?: any[]; removed?: any[] };

export type EventById = Record<string, Event>;