import { verifyAccessToken } from "../services/authService.js";
import { controllerError } from "./errorHandler.js";

export async function verifyToken(req, res, next) {
    const authorization = req.headers.authorization;
    const bearer = typeof authorization === "string" ? authorization.match(/^Bearer\s+(\S+)$/i) : null;
    if (!bearer) return res.status(401).json({ message_error: "Token requis : Authorization: Bearer <token>" });
    try {
        const { claims, tokenHash } = await verifyAccessToken(bearer[1]);
        req.tokenHash = tokenHash;
        req.user = claims;
        return next();
    } catch (error) { return controllerError(error, res, next); }
}

export default verifyToken;
