import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";
import { logger } from "./utils/logger";

const PORT = Number(process.env.PORT || 4000);

export const server = app.listen(PORT, () => {
  logger.info(`Merit Circle Backend server running on port ${PORT}`);
});
