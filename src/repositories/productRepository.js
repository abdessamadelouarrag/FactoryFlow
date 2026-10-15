import Product from "../models/Product.js";

const materialPath = "composition.material";
const materialFields = "reference name unit";

export default {
    async findByReference(reference) {
        return Product.findOne({ reference });
    },

    async findDetailsByReference(reference) {
        return Product.findOne({ reference }).populate(materialPath, materialFields);
    },

    async findAll() {
        return Product.find().populate(materialPath, materialFields);
    },

    async create(data) {
        const product = await Product.create(data);
        await product.populate(materialPath, materialFields);
        return product;
    },

    async updateByReference(reference, data) {
        return Product.findOneAndUpdate(
            { reference },
            { $set: data },
            { new: true, runValidators: true }
        ).populate(materialPath, materialFields);
    },

    async deleteByReference(reference) {
        return Product.findOneAndDelete({ reference });
    }
};
