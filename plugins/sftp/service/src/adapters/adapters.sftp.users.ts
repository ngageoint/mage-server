import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    _id: [{ type: mongoose.Schema.Types.ObjectId }],
    active: { type: Boolean, required: true }
});

export interface UserDoc extends mongoose.Document {
    username: string;
    _id: mongoose.Types.ObjectId;
    active: boolean;
}

export class MongooseUsersRepository {
    readonly model: mongoose.Model<UserDoc>;

    constructor(connection: mongoose.Connection) {
        this.model = connection.model<UserDoc>('users', UserSchema);
    }

    async findUserById(userId: string | undefined): Promise<UserDoc | null> {
        if (!userId) {
            return null;
        }
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const user = await this.model.findOne({ _id: userObjectId }).exec();
        return user ? (user.toJSON() as UserDoc) : null;
    }
}
