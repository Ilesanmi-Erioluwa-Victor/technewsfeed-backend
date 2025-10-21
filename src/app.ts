import express from "express";
import cors from "cors";
import { errorHandler } from "@/middlewares/errorHandler";
import newsRoutes from "@/routes/News/newsRoute";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1/news", newsRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", service: "Tech News API" });
});

app.use(errorHandler);

export default app;
