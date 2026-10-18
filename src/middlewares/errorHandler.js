import { ServiceError } from "../services/serviceError.js";

export function controllerError(error, res, next) {
    if (error instanceof ServiceError) return res.status(error.status).json({ message_error: error.message });
    return next(error);
}

export default function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);
    if (error instanceof ServiceError) return res.status(error.status).json({ message_error: error.message });
    if (error.type === "entity.parse.failed") return res.status(400).json({ message_error: "JSON invalide" });
    if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ message_error: "Les informations sont invalides !" });
    }
    if (error.code === 11000) return res.status(409).json({ message_error: "Cette ressource existe deja !" });
    console.error(error);
    return res.status(500).json({ message_error: "Erreur interne du serveur" });
}
