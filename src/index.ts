import dotenv from "dotenv";
import app from "./app";
import logger from "@/utils/logger";
import { env } from "@/config/env";

dotenv.config();

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
