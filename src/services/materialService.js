import materialRepository from "../repositories/materialRepository.js";
import { ServiceError, requiredText } from "./serviceError.js";

function validate(data) {
    const message = "obligation de tout les champs !";
    const name = requiredText(data.name, message);
    const unit = requiredText(data.unit, message);
    if (unit.length > 3) throw new ServiceError(400, "L'unite doit contenir au maximum 3 caracteres !");
    return { name, unit };
}

export async function createMaterial(data = {}) {
    const reference = requiredText(data.reference, "obligation de tout les champs !").toUpperCase();
    const fields = validate(data);
    if (await materialRepository.findByReference(reference)) {
        throw new ServiceError(400, "Deja il ya une matier avec se refernce !");
    }
    try {
        return await materialRepository.create({ reference, ...fields });
    } catch (error) {
        if (error.code === 11000) throw new ServiceError(400, "Deja il ya une matier avec se refernce !");
        throw error;
    }
}

export async function allMaterial() {
    return materialRepository.findAll();
}

export async function updateMaterial(reference, data = {}) {
    reference = requiredText(reference, "obliagation de reference !").toUpperCase();
    const fields = validate(data);
    if (!await materialRepository.findByReference(reference)) throw new ServiceError(400, "il ya aucun reference !");
    await materialRepository.updateByReference(reference, fields);
    return { reference, ...fields };
}
