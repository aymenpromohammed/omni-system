import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "6mb" }));
app.use(express.urlencoded({ extended: true, limit: "6mb" }));

app.use("/api", router);

// Serve static frontend files dynamically to prevent issues where FRONTEND_DIST is evaluated before being defined in environment variables
app.use((req, res, next) => {
  const frontendDist = process.env["FRONTEND_DIST"];
  if (frontendDist) {
    const distPath = path.resolve(frontendDist);
    express.static(distPath)(req, res, next);
  } else {
    next();
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.sendStatus(404);
    return;
  }
  const frontendDist = process.env["FRONTEND_DIST"];
  if (frontendDist) {
    const distPath = path.resolve(frontendDist);
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        next();
      }
    });
  } else {
    next();
  }
});

export default app;
