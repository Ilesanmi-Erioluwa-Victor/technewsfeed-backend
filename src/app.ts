import express from "express";
import cors from "cors";
import { errorHandler } from "@/middlewares/errorHandler";
import apiRouter from "./api";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRouter);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", service: "Tech News API" });
});

app.use(errorHandler);

export default app;
