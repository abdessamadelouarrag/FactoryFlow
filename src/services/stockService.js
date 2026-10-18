import stockRepository from "../repositories/stockRepository.js";
import materialRepository from "../repositories/materialRepository.js";
import { ServiceError, quantity, requiredText } from "./serviceError.js";

export async function createStock(data = {}, userId) {
    const identifier = requiredText(data.material, "La matière première est obligatoire !");
    const material = await materialRepository.findByIdentifier(identifier);
    if (!material) throw new ServiceError(404, "Matière première introuvable !");
    if (await stockRepository.findByMaterialId(material._id)) {
        throw new ServiceError(400, "Un stock existe déjà pour cette matière première !");
    }
    const initial = quantity(data.quantityInitial === undefined ? 0 : data.quantityInitial, {
        message: "La quantité initiale doit être un nombre positif ou nul !"
    });
    const createdBy = userId || data.createdBy;
    if (!createdBy) throw new ServiceError(400, "L'utilisateur créateur (createdBy) est obligatoire !");
    try {
        return await stockRepository.create({ material: material._id, quantityInitial: initial, quantityCurrent: initial, createdBy });
    } catch (error) {
        if (error.code === 11000) throw new ServiceError(400, "Un stock existe déjà pour cette matière première !");
        throw error;
    }
}

export async function getAllStocks() {
    return stockRepository.findAll();
}

export async function getStockById(id) {
    const stock = await stockRepository.findByIdentifier(id, { populate: true });
    if (!stock) throw new ServiceError(404, "Stock introuvable !");
    return stock;
}

export async function updateStock(id, data = {}) {
    if (data.quantityCurrent === undefined) throw new ServiceError(400, "La quantité actuelle (quantityCurrent) est obligatoire !");
    const current = quantity(data.quantityCurrent, { message: "La quantité actuelle doit être un nombre positif ou nul !" });
    const stock = await stockRepository.findById(id);
    if (!stock) throw new ServiceError(404, "Stock introuvable !");
    return stockRepository.updateQuantity(stock, current);
}

export async function addStockEntry(id, data = {}) {
    if (data.quantity === undefined) throw new ServiceError(400, "La quantité d'entrée est obligatoire !");
    const added = quantity(data.quantity, { positive: true, message: "La quantité d'entrée doit être un nombre strictement positif !" });
    const stock = await stockRepository.findByIdentifier(id);
    if (!stock) throw new ServiceError(404, "Stock introuvable pour enregistrer l'entrée !");
    quantity(stock.quantityCurrent + added, { message: "La quantité totale doit être finie !" });
    const updated = await stockRepository.incrementQuantity(stock._id, added);
    if (!updated) throw new ServiceError(409, "Le stock a ete supprime ou sa quantite totale depasse la limite !");
    return { stock: updated, quantityAdded: added };
}

export async function deleteStock(id) {
    if (!stockRepository.isValidId(id)) throw new ServiceError(400, "Identifiant de stock invalide !");
    if (!await stockRepository.deleteById(id)) throw new ServiceError(404, "Stock introuvable !");
}
