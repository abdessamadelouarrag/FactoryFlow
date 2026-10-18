import ProductionOrder from "../models/ProductionOrder.js";
import mongoose from "mongoose";

export default {
    isValidId(id) {
        return mongoose.isObjectIdOrHexString(id);
    },

    async create(data) {
        return ProductionOrder.create(data);
    },

    async findById(id, session) {
        const query = ProductionOrder.findById(id);
        return session ? query.session(session) : query;
    },

    async findAll(filter = {}) {
        return ProductionOrder.find(filter).sort({ createdAt: -1 });
    },

    async transition(id, previousStatus, changes, session) {
        return ProductionOrder.findOneAndUpdate(
            { _id: id, status: previousStatus },
            { $set: changes },
            { new: true, runValidators: true, session }
        );
    },

    async existsByProductId(productId) {
        return ProductionOrder.exists({ product: productId });
    }
};
