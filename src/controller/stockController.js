import stockRepository from "../repositories/stockRepository.js";
import materialRepository from "../repositories/materialRepository.js";


export async function createStock(req, res, next) {
    try {
        const { material, quantityInitial } = req.body;

        if (!material) {
            return res.status(400).json({
                message_error: "La matière première est obligatoire !"
            });
        }

        const materialDoc = await materialRepository.findByIdentifier(material);

        if (!materialDoc) {
            return res.status(404).json({
                message_error: "Matière première introuvable !"
            });
        }

        const existingStock = await stockRepository.findByMaterialId(materialDoc._id);
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

        const populatedStock = await stockRepository.create({
            material: materialDoc._id,
            quantityInitial: initQty,
            quantityCurrent: initQty,
            createdBy: userId
        });

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
        const stocks = await stockRepository.findAll();

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

        const stock = await stockRepository.findByIdentifier(id, { populate: true });

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

        const stock = await stockRepository.findById(id);

        if (!stock) {
            return res.status(404).json({
                message_error: "Stock introuvable !"
            });
        }

        const updatedStock = await stockRepository.updateQuantity(stock, newQty);

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

        const stock = await stockRepository.findByIdentifier(id);

        if (!stock) {
            return res.status(404).json({
                message_error: "Stock introuvable pour enregistrer l'entrée !"
            });
        }

        // Incrémentation du stock disponible
        const updatedStock = await stockRepository.updateQuantity(stock, stock.quantityCurrent + entryQty);

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

        if (!stockRepository.isValidId(id)) {
            return res.status(400).json({
                message_error: "Identifiant de stock invalide !"
            });
        }

        const deletedStock = await stockRepository.deleteById(id);

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
