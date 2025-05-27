import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    userIds: [{ type: mongoose.Schema.Types.ObjectId }],
    id: { type: String, required: true },
    acl: { type: Object, required: true }
});

export interface TeamDoc extends mongoose.Document {
    name: string;
    id: mongoose.Types.ObjectId;
    userIds: mongoose.Types.ObjectId[];
    teamEventId?: string;
}

export class MongooseTeamsRepository {
    readonly model: mongoose.Model<TeamDoc>;

    constructor(connection: mongoose.Connection) {
        this.model = connection.model<TeamDoc>('teams', TeamSchema);
    }

    async findTeamsByUserId(userId: string | undefined): Promise<TeamDoc[]> {
        if (!userId) {
            return [];
        }
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const teams = await this.model.find({ userIds: userObjectId }).exec();
        return teams.map(team => team.toJSON() as TeamDoc);
    }
}
