import mongoose from 'mongoose'

export declare const Model: mongoose.Model<UserDocument>
export function getUserById(id: mongoose.Types.ObjectId): Promise<UserDocument | null>
export function getUserById(id: mongoose.Types.ObjectId, callback: (err: null | any, result: UserDocument | null) => any): void
