import mongoose from "mongoose";
import Stock from "../models/Stock.js";
import Material from "../models/Material.js";


export async function createStock(req, res, next) {
    try {
        const { material, quantityInitial } = req.body;

        if (!material) {
            return res.status(400).json({
                message_error: "La matière première est obligatoire !"
            });
        }

        let materialDoc = null;
        if (mongoose.isValidObjectId(material)) {
            materialDoc = await Material.findById(material);
        }
        if (!materialDoc) {
            materialDoc = await Material.findOne({ reference: String(material).toUpperCase() });
        }

        if (!materialDoc) {
            return res.status(404).json({
                message_error: "Matière première introuvable !"
            });
        }

        const existingStock = await Stock.findOne({ material: materialDoc._id });
        if (existingStock) {
            return res.status(400).json({
                message_error: "Un stock existe déjà pour cette matière première !"
            });
        }

        const initQty = quantityInitial !== undefined ? Number(quantityInitial) : 0;
        if (isNaN(initQty) || initQty < 0) {
            return res.status(400).json({
                message_error: "La quantité initiale doit être un nombre positif ou nul !"
            });
        }

        const userId = req.user?.sub || req.body.createdBy;
        if (!userId) {
            return res.status(400).json({
                message_error: "L'utilisateur créateur (createdBy) est obligatoire !"
            });
        }

        const newStock = await Stock.create({
            material: materialDoc._id,
            quantityInitial: initQty,
            quantityCurrent: initQty,
            createdBy: userId
        });

        const populatedStock = await Stock.findById(newStock._id)
            .populate("material", "reference name unit")
            .populate("createdBy", "name email");

        return res.status(201).json({
            message_creation: "Stock initialisé avec succès",
            stock: populatedStock
        });
    } catch (error) {
        next(error);
    }
}


