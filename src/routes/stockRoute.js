import { Router } from "express";
import {
    createStock,
    getAllStocks,
    getStockById,
    updateStock,
    addStockEntry,
    deleteStock
} from "../controller/stockController.js";
import verifyToken from "../middlewares/verifyToken.js";

const route = Router();

route.post("/newStock", verifyToken, createStock);
route.get("/all", verifyToken, getAllStocks);
route.get("/:id", verifyToken, getStockById);
route.put("/update/:id", verifyToken, updateStock);
route.post("/entry/:id", verifyToken, addStockEntry);
route.delete("/delete/:id", verifyToken, deleteStock);

export default route;
