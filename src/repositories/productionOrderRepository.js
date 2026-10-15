import ProductionOrder from "../models/ProductionOrder.js";

export default {
    async existsByProductId(productId) {
        return ProductionOrder.exists({ product: productId });
    }
};
