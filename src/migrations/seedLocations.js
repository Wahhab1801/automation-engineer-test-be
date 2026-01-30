import mongoose from "mongoose";
import * as process from "node:process";
import dotenv from "dotenv";
import Location from "../models/location.model.js";

dotenv.config();

const locationData = [
  {
    name: "The Willow",
    postCode: "RH2 7EN",
    distance: 0,
    constituency: "South East",
    adminDistrict: "Surrey",
    cordinates: {
      longitude: -0.181425,
      latitude: 51.231602,
      useRotaCloud: true,
    },
  },
  {
    name: "Clippers House, Clippers Quay",
    postCode: "M50 3XP",
    distance: 0,
    constituency: "Salford and Eccles",
    adminDistrict: "Salford",
    cordinates: {
      longitude: -2.286226,
      latitude: 53.466921,
      useRotaCloud: true,
    },
  },
  {
    name: "Old Trafford Stadium",
    postCode: "M16 0RA",
    distance: 0,
    constituency: "Stretford and Urmston",
    adminDistrict: "Trafford",
    cordinates: {
      longitude: -2.291032,
      latitude: 53.462559,
      useRotaCloud: true,
    },
  },
  {
    name: "MediaCityUK",
    postCode: "M50 3UQ",
    distance: 0,
    constituency: "Salford and Eccles",
    adminDistrict: "City of Salford",
    cordinates: {
      longitude: -2.2994,
      latitude: 53.4721,
      useRotaCloud: true,
    },
  },
  {
    name: "Manchester Piccadilly Station",
    postCode: "M1 2AP",
    distance: 0,
    constituency: "Manchester Central",
    adminDistrict: "Manchester",
    cordinates: {
      longitude: -2.235117,
      latitude: 53.48117,
      useRotaCloud: true,
    },
  },
];

async function seedLocations() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("DB Connected for Locations");

    await Location.deleteMany({});
    const inserted = await Location.insertMany(locationData);
    console.log("Seeded Locations:", inserted);
    process.exit(0);
  } catch (err) {
    console.error("Location seed error:", err);
    process.exit(1);
  }
}

seedLocations();
