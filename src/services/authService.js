import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import userRepository from "../repositories/userRepository.js";
import revokedTokenRepository from "../repositories/revokedTokenRepository.js";
import { ServiceError, requiredText } from "./serviceError.js";

export async function register(data = {}) {
    const message = "obligation de tout les champs !";
    const name = requiredText(data.name, message);
    const email = requiredText(data.email, message).toLowerCase();
    requiredText(data.password, message);
    const password = data.password;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ServiceError(400, "Email invalide !");
    if (await userRepository.findByEmail(email)) throw new ServiceError(400, "email deja utiliser !");
    const users = await userRepository.findAll();
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        return await userRepository.create({ name, email, password: hashedPassword, role: users.length ? "OPERATOR" : "ADMIN" });
    } catch (error) {
        if (error.code === 11000) throw new ServiceError(400, "email deja utiliser !");
        throw error;
    }
}

export async function login(data = {}) {
    const email = requiredText(data.email, "obligation des chams !").toLowerCase();
    requiredText(data.password, "obligation des chams !");
    const password = data.password;
    const user = await userRepository.findByEmail(email);
    if (!user || !await bcrypt.compare(password, user.password)) {
        throw new ServiceError(400, "email ou mot de passe incorrect");
    }
    if (!process.env.SECRET_KEY) throw new ServiceError(500, "La cle JWT SECRET_KEY est introuvable");
    const token = jwt.sign({ sub: user._id.toString() }, process.env.SECRET_KEY, { expiresIn: "1d", jwtid: randomUUID() });
    return { token, user };
}

export async function logout(tokenHash, claims) {
    const revokedToken = { tokenHash };
    if (typeof claims.exp === "number") revokedToken.expiresAt = new Date(claims.exp * 1000);
    await revokedTokenRepository.revoke(revokedToken);
}

export async function verifyAccessToken(token) {
    if (!process.env.SECRET_KEY) throw new ServiceError(500, "La cle JWT SECRET_KEY est introuvable");
    let claims;
    try {
        claims = jwt.verify(token, process.env.SECRET_KEY, { algorithms: ["HS256"] });
    } catch {
        throw new ServiceError(401, "Token invalide ou expire");
    }
    if (!claims || typeof claims.sub !== "string" || !claims.sub.trim()) throw new ServiceError(401, "Token invalide");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    if (await revokedTokenRepository.existsByHash(tokenHash)) throw new ServiceError(401, "Token invalide ou deconnecte");
    return { claims, tokenHash };
}
