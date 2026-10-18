import orders from "../repositories/productionOrderRepository.js";
import stocks from "../repositories/stockRepository.js";
import users from "../repositories/userRepository.js";
import transactions from "../repositories/transactionRepository.js";
import { getProduct } from "./productService.js";
import { ServiceError, quantity, requiredText } from "./serviceError.js";

async function actor(userId) {
    const user = await users.findById(userId);
    if (!user) throw new ServiceError(401, "Utilisateur introuvable !");
    return user;
}

function checkAccess(user, order) {
    if (user.role !== "ADMIN" && String(order.assignedOperator) !== String(user._id)) {
        throw new ServiceError(403, "Cet ordre est assigne a un autre operateur !");
    }
}

async function findOrder(id, session) {
    if (!orders.isValidId(id)) throw new ServiceError(400, "Identifiant d'ordre invalide !");
    const order = await orders.findById(id, session);
    if (!order) throw new ServiceError(404, "Ordre de production introuvable !");
    return order;
}

export async function createOrder(data = {}, userId) {
    const user = await actor(userId);
    if (user.role !== "ADMIN") throw new ServiceError(403, "Seul un administrateur peut planifier un ordre !");
    const reference = requiredText(data.productReference, "La reference du produit est obligatoire !");
    const count = quantity(data.quantity, { positive: true, message: "La quantite doit etre strictement positive !" });
    const operatorId = requiredText(data.assignedOperator, "L'operateur est obligatoire !");
    const operator = await users.findById(operatorId);
    if (!operator || operator.role !== "OPERATOR") throw new ServiceError(400, "Operateur invalide !");
    const product = await getProduct(reference);
    const compositionSnapshot = product.composition.map(line => {
        const material = line.material;
        if (!material || !material.reference) throw new ServiceError(409, "Une matiere du produit est introuvable !");
        quantity(line.quantityPerUnit * count, { positive: true, message: "La quantite totale de matiere doit etre finie !" });
        return {
            rawMaterial: material._id, reference: material.reference, name: material.name,
            unit: material.unit, quantityPerUnit: line.quantityPerUnit
        };
    });
    return orders.create({
        product: product._id, productReference: product.reference, productName: product.name,
        quantity: count, compositionSnapshot, assignedOperator: operator._id, createdBy: user._id, status: "PLANNED"
    });
}

export async function listOrders(userId) {
    const user = await actor(userId);
    return orders.findAll(user.role === "ADMIN" ? {} : { assignedOperator: user._id });
}

export async function getOrder(id, userId) {
    const user = await actor(userId);
    const order = await findOrder(id);
    checkAccess(user, order);
    return order;
}

export async function startOrder(id, userId) {
    if (!orders.isValidId(id)) throw new ServiceError(400, "Identifiant d'ordre invalide !");
    const user = await actor(userId);
    return transactions.run(async session => {
        const order = await findOrder(id, session);
        checkAccess(user, order);
        if (order.status !== "PLANNED") throw new ServiceError(409, "Seul un ordre planifie peut demarrer !");
        for (const line of order.compositionSnapshot) {
            const required = quantity(line.quantityPerUnit * order.quantity, {
                positive: true, message: "La quantite totale de matiere doit etre finie !"
            });
            if (!await stocks.consume(line.rawMaterial, required, session)) {
                throw new ServiceError(409, `Stock insuffisant pour ${line.reference} !`);
            }
        }
        const updated = await orders.transition(id, "PLANNED", {
            status: "IN_PROGRESS", startedBy: user._id, startedAt: new Date()
        }, session);
        if (!updated) throw new ServiceError(409, "L'ordre a deja ete modifie !");
        return updated;
    });
}

export async function completeOrder(id, userId) {
    const user = await actor(userId);
    const order = await findOrder(id);
    checkAccess(user, order);
    if (order.status !== "IN_PROGRESS") throw new ServiceError(409, "Seul un ordre en cours peut etre termine !");
    const updated = await orders.transition(id, "IN_PROGRESS", {
        status: "COMPLETED", completedBy: user._id, completedAt: new Date()
    });
    if (!updated) throw new ServiceError(409, "L'ordre a deja ete modifie !");
    return updated;
}

export async function cancelOrder(id, userId) {
    const user = await actor(userId);
    const order = await findOrder(id);
    checkAccess(user, order);
    if (order.status !== "PLANNED") throw new ServiceError(409, "Seul un ordre planifie peut etre annule !");
    const updated = await orders.transition(id, "PLANNED", {
        status: "CANCELLED", cancelledBy: user._id, cancelledAt: new Date()
    });
    if (!updated) throw new ServiceError(409, "L'ordre a deja ete modifie !");
    return updated;
}
