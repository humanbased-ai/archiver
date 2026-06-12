import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

import express, { Express, Request, Response, NextFunction } from "express";
import { CustomError } from "./utils/CustomError";
import { AppError } from "./utils/AppError";
// import { sendErrorDev, sendErrorProd } from "./utils/errorHandler";
import larkRouter, { sendLarkMessage } from "./routes/lark";

const app: Express = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  // TODO 跨域 域名设置
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(express.json());

app.use("/lark", larkRouter);

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(404, `Can't find ${req.originalUrl} on this server!`));
});

app.use(
  (
    err: Error | CustomError,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const statusCode = err instanceof CustomError ? err.statusCode : 500;
    const message = err.message || "Internal Server Error";
    const chat_id = err instanceof CustomError ? err.chat_id : undefined;
    res.status(statusCode).json({
      error: {
        message: message,
        status: statusCode,
        chat_id: chat_id,
      },
    });
    if (chat_id) {
      sendLarkMessage({ chat_id, message: `Error: ${message}` });
    }
  }
);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

process.on("unhandledRejection", (err: Error) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  if (err instanceof CustomError && err.chat_id) {
    sendLarkMessage({
      chat_id: err.chat_id,
      message: `Unhandled Rejection: ${err.message}`,
    }).catch(console.error);
  }
  process.exit(1);
});

process.on("uncaughtException", (err: Error) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});
