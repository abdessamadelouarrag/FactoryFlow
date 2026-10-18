import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { fileURLToPath } from "node:url";
import authRoute from "./routes/authRoute.js";
import materialRoute from "./routes/materialRoute.js";
import stockRoute from "./routes/stockRoute.js";
import productRoute from "./routes/productRoute.js";
import productionOrderRoute from "./routes/productionOrderRoute.js";
import errorHandler from "./middlewares/errorHandler.js";

export const openapi = YAML.load(fileURLToPath(new URL("../docs/openapi.yaml", import.meta.url)));
const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/openapi.json", (req, res) => res.json(openapi));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use("/api/auth", authRoute);
app.use("/api/material", materialRoute);
app.use("/api/stock", stockRoute);
app.use("/api/product", productRoute);
app.use("/api/production-orders", productionOrderRoute);
app.use((req, res) => res.status(404).json({ message_error: "Route introuvable" }));
app.use(errorHandler);

export default app;
