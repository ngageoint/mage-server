import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    teamEventId: { type: Number, required: true, unique: true },
    userIds: [{ type: mongoose.Schema.Types.ObjectId }]
});

export interface TeamDoc extends mongoose.Document {
    name: string;
    teamEventId: number;
    userIds: mongoose.Types.ObjectId[];
}

export function TeamModel(connection: mongoose.Connection, collectionName: string): mongoose.Model<TeamDoc> {
    return connection.model<TeamDoc>('Team', TeamSchema, collectionName);
}

export class MongooseTeamsRepository {
    readonly model: mongoose.Model<TeamDoc>;

    constructor(model: mongoose.Model<TeamDoc>) {
        this.model = model;
    }

    async findTeamsByUserId(userId: string): Promise<TeamDoc[]> {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const teams = await this.model.find({ userIds: userObjectId });
        return teams.map(team => team.toJSON() as TeamDoc);
    }
}
