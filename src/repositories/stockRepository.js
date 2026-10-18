import mongoose from "mongoose";
import Stock from "../models/Stock.js";
import materialRepository from "./materialRepository.js";

function populateStock(query) {
    return query.populate("material", "reference name unit")
        .populate("createdBy", "name email");
}

const stockRepository = {
    async consume(materialId, quantity, session) {
        return Stock.findOneAndUpdate(
            { material: materialId, quantityCurrent: { $gte: quantity } },
            { $inc: { quantityCurrent: -quantity } },
            { new: true, runValidators: true, session }
        );
    },

    isValidId(id) {
        return mongoose.isValidObjectId(id);
    },

    async findById(id) {
        if (!stockRepository.isValidId(id)) return null;
        return Stock.findById(id);
    },

    async findDetailsById(id) {
        return populateStock(Stock.findById(id));
    },

    async findByMaterialId(materialId) {
        return Stock.findOne({ material: materialId });
    },

    async findByIdentifier(identifier, { populate = false } = {}) {
        const resolveQuery = query => populate ? populateStock(query) : query;

        if (stockRepository.isValidId(identifier)) {
            const stock = await resolveQuery(Stock.findById(identifier));
            if (stock) return stock;

            const materialStock = await resolveQuery(Stock.findOne({ material: identifier }));
            if (materialStock) return materialStock;
        }

        const material = await materialRepository.findByReference(String(identifier).toUpperCase());
        if (!material) return null;

        return resolveQuery(Stock.findOne({ material: material._id }));
    },

    async findAll() {
        return populateStock(Stock.find());
    },

    async create(data) {
        const stock = await Stock.create(data);
        return stockRepository.findDetailsById(stock._id);
    },

    async updateQuantity(stock, quantity) {
        stock.quantityCurrent = quantity;
        await stock.save();
        return stockRepository.findDetailsById(stock._id);
    },

    async incrementQuantity(id, quantity) {
        return populateStock(Stock.findOneAndUpdate(
            { _id: id, quantityCurrent: { $lte: Number.MAX_VALUE - quantity } },
            { $inc: { quantityCurrent: quantity } },
            { new: true, runValidators: true }
        ));
    },

    async deleteById(id) {
        return Stock.findByIdAndDelete(id);
    }
};

export default stockRepository;
