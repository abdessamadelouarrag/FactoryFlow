import productRepository from "../repositories/productRepository.js";
import materialRepository from "../repositories/materialRepository.js";
import productionOrderRepository from "../repositories/productionOrderRepository.js";
import { ServiceError, requiredText, quantity } from "./serviceError.js";

async function verifyComposition(composition) {
    if (!Array.isArray(composition) || !composition.length) throw new ServiceError(400, "La composition est obligatoire !");
    const result = [];
    const materials = new Set();
    for (const line of composition) {
        const identifier = requiredText(line?.material, "La matiere est obligatoire dans chaque ligne !");
        const quantityPerUnit = quantity(line.quantityPerUnit, {
            positive: true, message: "La quantite par unite doit etre strictement positive !"
        });
        const material = await materialRepository.findByIdentifier(identifier);
        if (!material) throw new ServiceError(404, "Matiere premiere introuvable !");
        const id = material._id.toString();
        if (materials.has(id)) throw new ServiceError(400, "La composition ne doit pas contenir de matieres en doublon !");
        materials.add(id);
        result.push({ material: material._id, quantityPerUnit });
    }
    return result;
}

async function saveProduct(operation) {
    try {
        return await operation();
    } catch (error) {
        if (error.code === 11000) throw new ServiceError(409, "La reference du produit est deja utilisee !");
        if (error.name === "ValidationError" || error.name === "CastError") {
            throw new ServiceError(400, "Les informations du produit sont invalides !");
        }
        throw error;
    }
}

export async function createProduct(data = {}) {
    const message = "Obligation de reference, name et composition !";
    const reference = requiredText(data.reference, message).toUpperCase();
    const name = requiredText(data.name, message);
    if (await productRepository.findByReference(reference)) throw new ServiceError(409, "La reference du produit est deja utilisee !");
    const composition = await verifyComposition(data.composition);
    return saveProduct(() => productRepository.create({ reference, name, composition }));
}

export async function allProduct() {
    return productRepository.findAll();
}

export async function getProduct(reference) {
    reference = requiredText(reference, "La reference est obligatoire !").toUpperCase();
    const product = await productRepository.findDetailsByReference(reference);
    if (!product) throw new ServiceError(404, "Produit introuvable !");
    return product;
}

export async function updateProduct(reference, data = {}) {
    reference = requiredText(reference, "La reference est obligatoire !").toUpperCase();
    const name = requiredText(data.name, "Obligation de name et composition !");
    if (!await productRepository.findByReference(reference)) throw new ServiceError(404, "Produit introuvable !");
    const composition = await verifyComposition(data.composition);
    const product = await saveProduct(() => productRepository.updateByReference(reference, { name, composition }));
    if (!product) throw new ServiceError(404, "Produit introuvable !");
    return product;
}

export async function deleteProduct(reference) {
    reference = requiredText(reference, "La reference est obligatoire !").toUpperCase();
    const product = await productRepository.findByReference(reference);
    if (!product) throw new ServiceError(404, "Produit introuvable !");
    if (await productionOrderRepository.existsByProductId(product._id)) {
        throw new ServiceError(409, "Ce produit est utilise dans un ordre de production !");
    }
    if (!await productRepository.deleteByReference(reference)) throw new ServiceError(404, "Produit introuvable !");
}
