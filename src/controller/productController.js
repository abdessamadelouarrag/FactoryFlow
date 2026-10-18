import * as productService from "../services/productService.js";
import { controllerError } from "../middlewares/errorHandler.js";

export async function createProduct(req, res, next) {
    try {
        const product = await productService.createProduct(req.body);
        return res.status(201).json({ message_creation: "Vous avez cree un nouveau produit ...", info_product: product });
    } catch (error) { return controllerError(error, res, next); }
}

export async function allProduct(req, res, next) {
    try {
        const products = await productService.allProduct();
        return res.status(200).json({ allProduct: products });
    } catch (error) { return controllerError(error, res, next); }
}

export async function getProduct(req, res, next) {
    try {
        const product = await productService.getProduct(req.params.reference);
        return res.status(200).json({ info_product: product });
    } catch (error) { return controllerError(error, res, next); }
}

export async function updateProduct(req, res, next) {
    try {
        const product = await productService.updateProduct(req.params.reference, req.body);
        return res.status(200).json({ message_update: "Vous avez modifie les informations du produit ...", info_product: product });
    } catch (error) { return controllerError(error, res, next); }
}

export async function deleteProduct(req, res, next) {
    try {
        await productService.deleteProduct(req.params.reference);
        return res.status(200).json({ message_succes: "Produit supprime avec succes" });
    } catch (error) { return controllerError(error, res, next); }
}
