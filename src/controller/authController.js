import * as authService from "../services/authService.js";
import { controllerError } from "../middlewares/errorHandler.js";

export async function register(req, res, next) {
    try {
        const user = await authService.register(req.body);
        return res.status(201).json({
            message_succes: "utilisateur est cree ...",
            user: { name: user.name, email: user.email }
        });
    } catch (error) { return controllerError(error, res, next); }
}

export async function login(req, res, next) {
    try {
        const { token, user } = await authService.login(req.body);
        return res.status(200).json({
            message_login: "login...", token,
            info_user: { name: user.name, email: user.email }
        });
    } catch (error) { return controllerError(error, res, next); }
}

export async function logout(req, res, next) {
    try {
        await authService.logout(req.tokenHash, req.user);
        return res.status(200).json({ message_succes: "Deconnexion reussie" });
    } catch (error) { return controllerError(error, res, next); }
}
