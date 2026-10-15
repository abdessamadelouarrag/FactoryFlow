import mongoose from "mongoose";
import Material from "../models/Material.js";

const materialRepository = {
    async findByReference(reference) {
        return Material.findOne({ reference });
    },

    async findByIdentifier(identifier) {
        if (mongoose.isValidObjectId(identifier)) {
            const material = await Material.findById(identifier);
            if (material) return material;
        }

        return materialRepository.findByReference(String(identifier).toUpperCase());
    },

    async findAll() {
        return Material.find();
    },

    async create(data) {
        return Material.create(data);
    },

    async updateByReference(reference, data) {
        return Material.updateOne({ reference }, { $set: data }, { runValidators: true });
    }
};

export default materialRepository;
