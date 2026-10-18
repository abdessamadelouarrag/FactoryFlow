import * as materialService from "../services/materialService.js";
import { controllerError } from "../middlewares/errorHandler.js";

export async function createMaterial(req, res, next) {
    try {
        const material = await materialService.createMaterial(req.body);
        return res.status(201).json({
            message_creation: "vous avez créer une nouvelle materiel ...",
            info_Materiel: { reference: material.reference, name: material.name }
        });
    } catch (error) { return controllerError(error, res, next); }
}

export async function allMaterial(req, res, next) {
    try {
        const materials = await materialService.allMaterial();
        return res.status(200).json({ allMaterial: materials });
    } catch (error) { return controllerError(error, res, next); }
}

export async function updateMaterial(req, res, next) {
    try {
        const material = await materialService.updateMaterial(req.params.reference, req.body);
        return res.status(200).json({
            message_update: "vous aves modifier les info de material...", info_Materiel: material
        });
    } catch (error) { return controllerError(error, res, next); }
}
