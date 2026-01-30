import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger/swaggerConfig.js";
import authRouter from "./routes/authentication.router.js";
import shiftsRouter from "./routes/shifts.router.js";
import workerRouter from "./routes/worker.router.js";
import locationRouter from "./routes/location.router.js";
import { errorHandlerMiddleware } from "./middlewares/error-handler.middleware.js";
import connectDB from "./db.js";
import mongoose from "mongoose";

if (process.env.NODE_ENV !== "test") {
  await connectDB();
}

const app = express();

const port = process.env.PORT || 8001;

//middlewares
app.use(express.json());
app.use(cors());
//api endpoints
app.use("/api/user", authRouter);
app.use("/api/shifts", shiftsRouter);
app.use("/api/workers", workerRouter);
app.use("/api/locations", locationRouter);
// Swagger Docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandlerMiddleware);

app.listen(port, () => console.log(`Listening on localhost:${port}`));

const gracefulShutdown = async (signal) => {
  console.log(`${signal}: Shutting down gracefully...`);
  await mongoose.disconnect();
};

process.on("SIGUSR2", async () => {
  await gracefulShutdown("SIGUSR2");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await gracefulShutdown("SIGTERM");
  process.exit(0);
});

process.on("SIGINT", async () => {
  await gracefulShutdown("SIGINT");
  process.exit(0);
});

process.on("uncaughtException", async (error) => {
  await gracefulShutdown("uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
  await gracefulShutdown("unhandled rejection");
  process.exit(1);
});

export { app };
