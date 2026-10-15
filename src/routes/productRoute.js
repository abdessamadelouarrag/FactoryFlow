import { Router } from "express";
import { createProduct, allProduct, getProduct, updateProduct, deleteProduct } from "../controller/productController.js";
import verifyToken from "../middlewares/verifyToken.js";

const route = Router();

route.post("/newProduct", verifyToken, createProduct);
route.get("/all", verifyToken, allProduct);
route.get("/:reference", verifyToken, getProduct);
route.put("/update/:reference", verifyToken, updateProduct);
route.delete("/delete/:reference", verifyToken, deleteProduct);

export default route;
