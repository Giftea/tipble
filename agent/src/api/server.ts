import express from "express"
import cors from "cors"
import router from "./routes.js"

export function startServer(): void {
  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use("/api", router)
  app.listen(3001, () =>
    console.log("🦞 Tipble API → http://localhost:3001")
  )
}
