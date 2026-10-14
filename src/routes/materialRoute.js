import { Router } from "express";
import { createMaterial, allMaterial , updateMaterial} from "../controller/matiersController.js";
import verifyToken from "../middlewares/verifyToken.js";

const route = Router();

route.post("/newMaterial", verifyToken, createMaterial)
route.get("/all", verifyToken, allMaterial);
route.post("/update/:reference", verifyToken, updateMaterial)

export default route;
