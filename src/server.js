import "dotenv/config";
import app from "./app.js";
import { connectDb } from "./config/db.js";

async function startServer() {
    await connectDb();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`FactoryFlow: http://localhost:${port} | Swagger: /api-docs`));
}

startServer().catch(error => {
    console.error("Impossible de demarrer FactoryFlow:", error);
    process.exitCode = 1;
});
