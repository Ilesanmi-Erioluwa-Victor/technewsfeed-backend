import express from "express";
import cors from "cors";
import { errorHandler } from "@/middlewares/errorHandler";
import newsRoutes from "@/routes/News/newsRoute";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/news", newsRoutes);
app.use(errorHandler);

export default app;
