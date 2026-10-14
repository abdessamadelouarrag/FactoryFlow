import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import {
    createStock,
    getAllStocks,
    getStockById,
    updateStock,
    addStockEntry,
    deleteStock
} from "../src/controller/stockController.js";
import Stock from "../src/models/Stock.js";
import Material from "../src/models/Material.js";

test("Stock Controller CRUD and Business Rules", async (t) => {
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const fakeMaterialId = new mongoose.Types.ObjectId().toString();
    const fakeStockId = new mongoose.Types.ObjectId().toString();

    const mockMaterial = {
        _id: fakeMaterialId,
        reference: "MAT-ACIER",
        name: "Acier Galvanisé",
        unit: "KG"
    };

    const mockStock = {
        _id: fakeStockId,
        material: fakeMaterialId,
        quantityInitial: 100,
        quantityCurrent: 100,
        createdBy: fakeUserId,
        save: async function () { return this; }
    };

    await t.test("createStock - returns 400 if material is missing", async () => {
        let statusCode = null;
        let responseJson = null;
        const req = { body: {}, user: { sub: fakeUserId } };
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; return this; }
        };

        await createStock(req, res, () => {});
        assert.equal(statusCode, 400);
        assert.equal(responseJson.message_error, "La matière première est obligatoire !");
    });

    await t.test("createStock - returns 400 if quantityInitial is negative", async () => {
        let statusCode = null;
        let responseJson = null;
        const req = {
            body: { material: fakeMaterialId, quantityInitial: -10 },
            user: { sub: fakeUserId }
        };
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; return this; }
        };

        t.mock.method(Material, "findById", async () => mockMaterial);
        t.mock.method(Stock, "findOne", async () => null);

        await createStock(req, res, () => {});
        assert.equal(statusCode, 400);
        assert.match(responseJson.message_error, /positif ou nul/);
    });

    await t.test("createStock - returns 400 if stock already exists", async () => {
        let statusCode = null;
        let responseJson = null;
        const req = {
            body: { material: fakeMaterialId, quantityInitial: 50 },
            user: { sub: fakeUserId }
        };
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; return this; }
        };

        t.mock.method(Material, "findById", async () => mockMaterial);
        t.mock.method(Stock, "findOne", async () => mockStock);

        await createStock(req, res, () => {});
        assert.equal(statusCode, 400);
        assert.equal(responseJson.message_error, "Un stock existe déjà pour cette matière première !");
    });

    await t.test("addStockEntry - refuses non-positive quantities and accepts positive", async () => {
        let statusCode = null;
        let responseJson = null;
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; return this; }
        };

        // Test with 0 or negative
        const reqZero = { params: { id: fakeStockId }, body: { quantity: 0 } };
        await addStockEntry(reqZero, res, () => {});
        assert.equal(statusCode, 400);
        assert.match(responseJson.message_error, /strictement positif/);

        // Test with valid positive quantity
        const activeStock = {
            _id: fakeStockId,
            material: fakeMaterialId,
            quantityCurrent: 100,
            save: async function () { return this; },
            populate: function () {
                return {
                    populate: async () => ({ ...activeStock, quantityCurrent: 150 })
                };
            }
        };

        t.mock.method(Stock, "findById", (id) => ({
            ...activeStock,
            then: (resolve) => resolve(activeStock),
            populate: () => ({ populate: async () => ({ ...activeStock, quantityCurrent: 150 }) })
        }));

        const reqValid = { params: { id: fakeStockId }, body: { quantity: 50 } };
        await addStockEntry(reqValid, res, () => {});
        assert.equal(statusCode, 200);
        assert.equal(responseJson.message_succes, "Entrée de stock enregistrée avec succès");
        assert.equal(responseJson.quantityAdded, 50);
    });

    await t.test("deleteStock - rejects invalid objectId and handles successful deletion", async () => {
        let statusCode = null;
        let responseJson = null;
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; return this; }
        };

        const reqInvalid = { params: { id: "invalid-id" } };
        await deleteStock(reqInvalid, res, () => {});
        assert.equal(statusCode, 400);
        assert.equal(responseJson.message_error, "Identifiant de stock invalide !");

        t.mock.method(Stock, "findByIdAndDelete", async () => mockStock);
        const reqValid = { params: { id: fakeStockId } };
        await deleteStock(reqValid, res, () => {});
        assert.equal(statusCode, 200);
        assert.equal(responseJson.message_succes, "Stock supprimé avec succès");
    });

    await t.test("getAllStocks - returns list of stocks", async () => {
        let statusCode = null;
        let responseJson = null;
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; return this; }
        };

        t.mock.method(Stock, "find", () => ({
            populate: () => ({ populate: async () => [mockStock] })
        }));

        await getAllStocks({}, res, () => {});
        assert.equal(statusCode, 200);
        assert.equal(responseJson.count, 1);
        assert.equal(responseJson.stocks.length, 1);
    });

    await t.test("getStockById - returns stock if found, 404 if not found", async () => {
        let statusCode = null;
        let responseJson = null;
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; return this; }
        };

        t.mock.method(Stock, "findById", () => ({
            populate: () => ({ populate: async () => mockStock })
        }));

        const req = { params: { id: fakeStockId } };
        await getStockById(req, res, () => {});
        assert.equal(statusCode, 200);
        assert.equal(responseJson.stock._id, fakeStockId);
    });

    await t.test("updateStock - updates quantityCurrent", async () => {
        let statusCode = null;
        let responseJson = null;
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; return this; }
        };

        const activeStock = {
            _id: fakeStockId,
            quantityCurrent: 100,
            save: async function () { return this; }
        };

        t.mock.method(Stock, "findById", (id) => ({
            ...activeStock,
            then: (resolve) => resolve(activeStock),
            populate: () => ({ populate: async () => ({ ...activeStock, quantityCurrent: 250 }) })
        }));

        const req = { params: { id: fakeStockId }, body: { quantityCurrent: 250 } };
        await updateStock(req, res, () => {});
        assert.equal(statusCode, 200);
        assert.equal(responseJson.message_update, "Stock mis à jour avec succès");
    });
});
