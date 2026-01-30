import mongoose from "mongoose";
import process from "node:process";

export default async function connectDB() {
  const url = process.env.MONGO_URI;
  try {
    await mongoose.connect(url);
    console.log(`Database connected`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
