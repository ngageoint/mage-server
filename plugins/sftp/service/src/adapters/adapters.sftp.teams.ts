import mongoose from 'mongoose';
import { Team } from '@ngageoint/mage.service/lib/entities/teams/entities.teams';

// Define the Mongoose schema for Team
const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    teamEventId: { type: Number, required: true, unique: true },
    userIds: [ String ]
});

export interface TeamDoc extends mongoose.Document {
    name: string;
    teamEventId: number;
    userIds: String[];
}

const TEAM_MODEL_NAME = 'teams';

// mongoose.Model -> toolbox that knows how to do CRUD operations on Mongo
export function TeamModel(connection: mongoose.Connection, collectionName: string): mongoose.Model<TeamDoc> {
    return connection.model<TeamDoc>(TEAM_MODEL_NAME, TeamSchema, collectionName);
}

export class MongooseTeamsRepository {
    readonly model: mongoose.Model<TeamDoc>;

    constructor(model: mongoose.Model<TeamDoc>) {
        this.model = model;
    }

    async findTeamsByUserId(userId: string): Promise<TeamDoc[]> {
        const teams = await this.model.find({ userIds: userId });
        return teams.map(team => team.toJSON() as TeamDoc);
    }

    narf() {
        console.log(`NARF: First: ${mongoose.connection.readyState}`)
        const db = mongoose.connection;

        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function() {
        console.log('Connected to MongoDB');
        });

        db.on('disconnected', function() {
        console.log('Disconnected from MongoDB');
        });
    }
}
