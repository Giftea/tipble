import express from "express";
import cors from "cors";
import router from "./routes.js";

const PORT = process.env.PORT ?? 3001;

export function startServer(): void {
  const app = express();
  app.use(
    cors({
      origin: ["http://localhost:3000", "https://tipble.vercel.app", "*"],
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "x-seed-phrase"],
    }),
  );

  app.use(express.json());
  app.use("/api", router);
  app.listen(PORT, () => console.log("🦞 Tipble API → http://localhost:3001"));
}
