import mongoose from "mongoose";
import Stock from "../models/Stock.js";
import Material from "../models/Material.js";


export async function createStock(req, res, next) {
    try {
        const { material, quantityInitial } = req.body;

        if (!material) {
            return res.status(400).json({
                message_error: "La matière première est obligatoire !"
            });
        }

        let materialDoc = null;
        if (mongoose.isValidObjectId(material)) {
            materialDoc = await Material.findById(material);
        }
        if (!materialDoc) {
            materialDoc = await Material.findOne({ reference: String(material).toUpperCase() });
        }

        if (!materialDoc) {
            return res.status(404).json({
                message_error: "Matière première introuvable !"
            });
        }

        const existingStock = await Stock.findOne({ material: materialDoc._id });
        if (existingStock) {
            return res.status(400).json({
                message_error: "Un stock existe déjà pour cette matière première !"
            });
        }

        const initQty = quantityInitial !== undefined ? Number(quantityInitial) : 0;
        if (isNaN(initQty) || initQty < 0) {
            return res.status(400).json({
                message_error: "La quantité initiale doit être un nombre positif ou nul !"
            });
        }

        const userId = req.user?.sub || req.body.createdBy;
        if (!userId) {
            return res.status(400).json({
                message_error: "L'utilisateur créateur (createdBy) est obligatoire !"
            });
        }

        const newStock = await Stock.create({
            material: materialDoc._id,
            quantityInitial: initQty,
            quantityCurrent: initQty,
            createdBy: userId
        });

        const populatedStock = await Stock.findById(newStock._id)
            .populate("material", "reference name unit")
            .populate("createdBy", "name email");

        return res.status(201).json({
            message_creation: "Stock initialisé avec succès",
            stock: populatedStock
        });
    } catch (error) {
        next(error);
    }
}


export async function getAllStocks(req, res, next) {
    try {
        const stocks = await Stock.find()
            .populate("material", "reference name unit")
            .populate("createdBy", "name email");

        return res.status(200).json({
            count: stocks.length,
            stocks: stocks
        });
    } catch (error) {
        next(error);
    }
}


export async function getStockById(req, res, next) {
    try {
        const { id } = req.params;

        let stock = null;
        if (mongoose.isValidObjectId(id)) {
            // Recherche directe par ID de stock
            stock = await Stock.findById(id)
                .populate("material", "reference name unit")
                .populate("createdBy", "name email");

            // Si non trouvé, tester si l'ID correspond à l'ObjectId de la matière première
            if (!stock) {
                stock = await Stock.findOne({ material: id })
                    .populate("material", "reference name unit")
                    .populate("createdBy", "name email");
            }
        }

        if (!stock) {
            const material = await Material.findOne({ reference: String(id).toUpperCase() });
            if (material) {
                stock = await Stock.findOne({ material: material._id })
                    .populate("material", "reference name unit")
                    .populate("createdBy", "name email");
            }
        }

        if (!stock) {
            return res.status(404).json({
                message_error: "Stock introuvable !"
            });
        }

        return res.status(200).json({
            stock: stock
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Modifier la quantité actuelle du stock
 * PUT /api/stock/update/:id
 */
export async function updateStock(req, res, next) {
    try {
        const { id } = req.params;
        const { quantityCurrent } = req.body;

        if (quantityCurrent === undefined) {
            return res.status(400).json({
                message_error: "La quantité actuelle (quantityCurrent) est obligatoire !"
            });
        }

        const newQty = Number(quantityCurrent);
        if (isNaN(newQty) || newQty < 0) {
            return res.status(400).json({
                message_error: "La quantité actuelle doit être un nombre positif ou nul !"
            });
        }

        let stock = null;
        if (mongoose.isValidObjectId(id)) {
            stock = await Stock.findById(id);
        }

        if (!stock) {
            return res.status(404).json({
                message_error: "Stock introuvable !"
            });
        }

        stock.quantityCurrent = newQty;
        await stock.save();

        const updatedStock = await Stock.findById(stock._id)
            .populate("material", "reference name unit")
            .populate("createdBy", "name email");

        return res.status(200).json({
            message_update: "Stock mis à jour avec succès",
            stock: updatedStock
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Enregistrer une entrée de stock (règle métier: quantité strictement positive)
 * POST /api/stock/entry/:id
 */
export async function addStockEntry(req, res, next) {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        if (quantity === undefined) {
            return res.status(400).json({
                message_error: "La quantité d'entrée est obligatoire !"
            });
        }

        const entryQty = Number(quantity);
        if (isNaN(entryQty) || entryQty <= 0) {
            return res.status(400).json({
                message_error: "La quantité d'entrée doit être un nombre strictement positif !"
            });
        }

        let stock = null;
        if (mongoose.isValidObjectId(id)) {
            stock = await Stock.findById(id);
            if (!stock) {
                stock = await Stock.findOne({ material: id });
            }
        }

        if (!stock) {
            const material = await Material.findOne({ reference: String(id).toUpperCase() });
            if (material) {
                stock = await Stock.findOne({ material: material._id });
            }
        }

        if (!stock) {
            return res.status(404).json({
                message_error: "Stock introuvable pour enregistrer l'entrée !"
            });
        }

        // Incrémentation du stock disponible
        stock.quantityCurrent += entryQty;
        await stock.save();

        const updatedStock = await Stock.findById(stock._id)
            .populate("material", "reference name unit")
            .populate("createdBy", "name email");

        return res.status(200).json({
            message_succes: "Entrée de stock enregistrée avec succès",
            quantityAdded: entryQty,
            stock: updatedStock
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Supprimer une fiche de stock
 * DELETE /api/stock/delete/:id
 */
export async function deleteStock(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message_error: "Identifiant de stock invalide !"
            });
        }

        const deletedStock = await Stock.findByIdAndDelete(id);

        if (!deletedStock) {
            return res.status(404).json({
                message_error: "Stock introuvable !"
            });
        }

        return res.status(200).json({
            message_succes: "Stock supprimé avec succès"
        });
    } catch (error) {
        next(error);
    }
}

// Aliases pour flexibilité d'appel
export const allStocks = getAllStocks;
