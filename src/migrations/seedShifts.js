// migrations/seed.js
import mongoose from "mongoose";
import * as process from "node:process";
import dotenv from "dotenv";
import Shift from "../models/shifts.model.js";

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("DB connected");

    await Shift.deleteMany({});

    const users = [
      mongoose.Types.ObjectId("6876ecb642df0376491dd254"),
      mongoose.Types.ObjectId("6876ecdb42df0376491dd25b"),
    ];

    const locations = [
      mongoose.Types.ObjectId("6876ec09d260b087559e5ffd"), // The Willow
      mongoose.Types.ObjectId("6876ec09d260b087559e5fff"), // Clippers House
      mongoose.Types.ObjectId("6876ec09d260b087559e6001"), // Old Trafford
      mongoose.Types.ObjectId("6876ec09d260b087559e6003"), // MediaCityUK
      mongoose.Types.ObjectId("6876ec09d260b087559e6005"), // Piccadilly
    ];

    const seedData = [];
    const start = new Date("2025-06-17");
    const end = new Date("2025-09-01");

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const count = Math.random() < 0.5 ? 1 : 2;
      const todays = users.sort(() => 0.5 - Math.random()).slice(0, count);

      todays.forEach((userId) => {
        const locationId =
          locations[Math.floor(Math.random() * locations.length)];

        const dow = d.getDay();
        const typeOfShift =
          dow === 0 || dow === 6 ? ["Weekends"] : ["Weekdays"];

        seedData.push({
          title: "Short Day",
          role: "Support Worker",
          typeOfShift,
          user: userId,
          startTime: "13:00",
          finishTime: "18:00",
          numOfShiftsPerDay: 1,
          location: locationId,
          date: new Date(d),
        });
      });
    }

    await Shift.insertMany(seedData);
    console.log(`Inserted ${seedData.length} shifts.`);
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
