import * as service from "../services/productionOrderService.js";
import { controllerError } from "../middlewares/errorHandler.js";

export async function createOrder(req, res, next) {
    try {
        const order = await service.createOrder(req.body, req.user.sub);
        return res.status(201).json({ order });
    } catch (error) { return controllerError(error, res, next); }
}

export async function listOrders(req, res, next) {
    try {
        const orders = await service.listOrders(req.user.sub);
        return res.status(200).json({ count: orders.length, orders });
    } catch (error) { return controllerError(error, res, next); }
}

export async function getOrder(req, res, next) {
    try {
        const order = await service.getOrder(req.params.id, req.user.sub);
        return res.status(200).json({ order });
    } catch (error) { return controllerError(error, res, next); }
}

export async function startOrder(req, res, next) {
    try {
        const order = await service.startOrder(req.params.id, req.user.sub);
        return res.status(200).json({ order });
    } catch (error) { return controllerError(error, res, next); }
}

export async function completeOrder(req, res, next) {
    try {
        const order = await service.completeOrder(req.params.id, req.user.sub);
        return res.status(200).json({ order });
    } catch (error) { return controllerError(error, res, next); }
}

export async function cancelOrder(req, res, next) {
    try {
        const order = await service.cancelOrder(req.params.id, req.user.sub);
        return res.status(200).json({ order });
    } catch (error) { return controllerError(error, res, next); }
}
