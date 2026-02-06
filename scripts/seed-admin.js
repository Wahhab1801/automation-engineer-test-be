import 'dotenv/config';
import mongoose from 'mongoose';
import { registerUser } from '../src/services/authentication/index.js';
import UserModel from '../src/models/user.model.js';

const seedAdmin = async () => {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test_db';

    // Hardcode credentials as requested
    if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = '9b293424-6013-435a-b9c2-902095034876';
    }

    // Use environment variables for credentials
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'StrongPass123!';

    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        try {
            // Create user using the backend service (hashes password, saves to DB)
            await registerUser('Super Admin User', adminEmail, adminPassword);
            console.log('Super Admin User created via backend service');
        } catch (error) {
            if (error.errorCode === 'USER_EXISTS' || error.message.includes('User already exists')) {
                console.log('Super Admin User already exists');
            } else {
                throw error;
            }
        }

        // Manual update of the role to admin directly in MongoDB
        const user = await UserModel.findOne({ email: adminEmail });
        if (user) {
            user.role = 'admin';
            await user.save();
            console.log('User role manually updated to admin');
        }

    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};

seedAdmin();
