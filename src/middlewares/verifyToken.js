import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import revokedTokenRepository from "../repositories/revokedTokenRepository.js";

export async function verifyToken(req, res, next) {
    const authorization = req.headers.authorization;
    const bearer = typeof authorization === "string"
        ? authorization.match(/^Bearer\s+(\S+)$/i)
        : null;

    if (!bearer) {
        return res.status(401).json({
            message_error: "Token requis : Authorization: Bearer <token>"
        });
    }

    if (!process.env.SECRET_KEY) {
        return res.status(500).json({
            message_error: "La cle JWT SECRET_KEY est introuvable"
        });
    }

    let decoded;
    try {
        decoded = jwt.verify(bearer[1], process.env.SECRET_KEY, {
            algorithms: ["HS256"]
        });
    } catch {
        return res.status(401).json({
            message_error: "Token invalide ou expire"
        });
    }

    if (!decoded || typeof decoded.sub !== "string" || !decoded.sub.trim()) {
        return res.status(401).json({
            message_error: "Token invalide"
        });
    }

    const tokenHash = createHash("sha256").update(bearer[1]).digest("hex");
    try {
        if (await revokedTokenRepository.existsByHash(tokenHash)) {
            return res.status(401).json({
                message_error: "Token invalide ou deconnecte"
            });
        }
    } catch (error) {
        return next(error);
    }

    req.tokenHash = tokenHash;
    req.user = decoded;
    next();
}

export default verifyToken;
