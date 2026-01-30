import mongoose from "mongoose";

const CoordinateSchema = new mongoose.Schema({
  longitude: { type: Number, required: true },
  latitude: { type: Number, required: true },
  useRotaCloud: { type: Boolean, default: true },
});

const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    postCode: { type: String },
    distance: { type: Number, default: 0 },
    constituency: { type: String },
    adminDistrict: { type: String },
    address: { type: String },
    cordinates: { type: CoordinateSchema, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Location", LocationSchema);
