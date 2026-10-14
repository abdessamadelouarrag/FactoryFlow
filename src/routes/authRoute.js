import { Router } from "express";
import { register, login, logout } from "../controller/authController.js";
import verifyToken from "../middlewares/verifyToken.js";

const route = Router();

route.post("/createUser", register);
route.post("/login", login)
route.post("/logout", verifyToken, logout);

route.get("/me", verifyToken, (req, res) => {
    return res.status(200).json({ user: req.user });
});

export default route;
