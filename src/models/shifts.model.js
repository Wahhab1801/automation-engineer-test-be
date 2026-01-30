import mongoose from "mongoose";
import "./user.model.js";
import "./location.model.js";
import { SHIFT_STATUS, SHIFT_TYPES } from "../services/shift/constants.js";

const ShiftSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    role: { type: String, required: true },
    typeOfShift: [
      {
        type: String,
        enum: [
          SHIFT_TYPES.WEEKEND,
          SHIFT_TYPES.WEEKDAY,
          SHIFT_TYPES.EVENING,
          SHIFT_TYPES.MORNING,
          SHIFT_TYPES.NIGHT,
        ],
        required: true,
      },
    ],

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    startTime: { type: Date, required: true },
    finishTime: { type: Date, required: true },
    numOfShiftsPerDay: { type: Number, default: 1 },

    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },

    status: {
      type: String,
      enum: [
        SHIFT_STATUS.SCHEDULED,
        SHIFT_STATUS.IN_PROGRESS,
        SHIFT_STATUS.COMPLETED,
        SHIFT_STATUS.CANCELLED,
      ],
      default: "Scheduled",
    },

    clockInTime: { type: Date, default: null },
    clockOutTime: { type: Date, default: null },

    date: { type: Date, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Shift", ShiftSchema);
