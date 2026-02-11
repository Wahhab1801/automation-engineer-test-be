import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../src/models/user.model.js';
import ShiftModel from '../src/models/shifts.model.js';
import LocationModel from '../src/models/location.model.js';

dotenv.config();

const cleanDb = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test_db';

    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB for cleanup...');

        console.log('Deleting all Users...');
        await UserModel.deleteMany({});

        console.log('Deleting all Shifts...');
        await ShiftModel.deleteMany({});

        console.log('Deleting all Locations...');
        await LocationModel.deleteMany({});

        console.log('Database cleanup complete!');
    } catch (error) {
        console.error('Error cleaning database:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

cleanDb();
