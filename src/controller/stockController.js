import * as stockService from "../services/stockService.js";
import { controllerError } from "../middlewares/errorHandler.js";

export async function createStock(req, res, next) {
    try {
        const stock = await stockService.createStock(req.body, req.user?.sub);
        return res.status(201).json({ message_creation: "Stock initialisé avec succès", stock });
    } catch (error) { return controllerError(error, res, next); }
}

export async function getAllStocks(req, res, next) {
    try {
        const stocks = await stockService.getAllStocks();
        return res.status(200).json({ count: stocks.length, stocks });
    } catch (error) { return controllerError(error, res, next); }
}

export async function getStockById(req, res, next) {
    try {
        const stock = await stockService.getStockById(req.params.id);
        return res.status(200).json({ stock });
    } catch (error) { return controllerError(error, res, next); }
}

export async function updateStock(req, res, next) {
    try {
        const stock = await stockService.updateStock(req.params.id, req.body);
        return res.status(200).json({ message_update: "Stock mis à jour avec succès", stock });
    } catch (error) { return controllerError(error, res, next); }
}

export async function addStockEntry(req, res, next) {
    try {
        const result = await stockService.addStockEntry(req.params.id, req.body);
        return res.status(200).json({ message_succes: "Entrée de stock enregistrée avec succès", ...result });
    } catch (error) { return controllerError(error, res, next); }
}

export async function deleteStock(req, res, next) {
    try {
        await stockService.deleteStock(req.params.id);
        return res.status(200).json({ message_succes: "Stock supprimé avec succès" });
    } catch (error) { return controllerError(error, res, next); }
}

export const allStocks = getAllStocks;
