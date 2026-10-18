import assert from "node:assert/strict";
import { test } from "node:test";
import * as service from "../../src/services/stockService.js";
import stocks from "../../src/repositories/stockRepository.js";
import materials from "../../src/repositories/materialRepository.js";

test("stock creation uses the authenticated creator and defaults quantity to zero", async t => {
    t.mock.method(materials, "findByIdentifier", async () => ({ _id: "material" }));
    t.mock.method(stocks, "findByMaterialId", async () => null);
    t.mock.method(stocks, "create", async data => data);
    assert.deepEqual(await service.createStock({ material: "MAT-ACIER", createdBy: "other-user" }, "authenticated-user"), {
        material: "material", quantityInitial: 0, quantityCurrent: 0, createdBy: "authenticated-user"
    });
});

test("stock creation rejects missing material, existing stock and invalid quantities", async t => {
    t.mock.method(materials, "findByIdentifier", async () => null);
    await assert.rejects(service.createStock({ material: "UNKNOWN" }, "user"), { status: 404 });
    t.mock.method(materials, "findByIdentifier", async () => ({ _id: "material" }));
    t.mock.method(stocks, "findByMaterialId", async () => null);
    for (const quantityInitial of [-1, Infinity, null, true, ""]) {
        await assert.rejects(service.createStock({ material: "MAT", quantityInitial }, "user"), { status: 400 });
    }
    t.mock.method(stocks, "findByMaterialId", async () => ({ _id: "stock" }));
    await assert.rejects(service.createStock({ material: "MAT" }, "user"), { status: 400 });
});

test("stock entries accept only positive finite quantities and add to current stock", async t => {
    const stock = { _id: "stock", quantityCurrent: 100 };
    t.mock.method(stocks, "findByIdentifier", async () => stock);
    const update = t.mock.method(stocks, "incrementQuantity", async (id, amount) => {
        assert.equal(id, stock._id);
        return { ...stock, quantityCurrent: stock.quantityCurrent + amount };
    });
    for (const quantity of [0, -1, Infinity, null, true, ""]) {
        await assert.rejects(service.addStockEntry("stock", { quantity }), { status: 400 });
    }
    assert.equal(update.mock.callCount(), 0);
    const result = await service.addStockEntry("stock", { quantity: "25" });
    assert.equal(result.quantityAdded, 25);
    assert.equal(result.stock.quantityCurrent, 125);
});

test("stock update accepts zero and rejects unknown stock", async t => {
    t.mock.method(stocks, "findById", async () => ({ _id: "stock" }));
    t.mock.method(stocks, "updateQuantity", async (stock, quantityCurrent) => ({ ...stock, quantityCurrent }));
    assert.equal((await service.updateStock("stock", { quantityCurrent: 0 })).quantityCurrent, 0);
    t.mock.method(stocks, "findById", async () => null);
    await assert.rejects(service.updateStock("missing", { quantityCurrent: 10 }), { status: 404 });
});

test("stock entries report a conflict when the record disappears before the increment", async t => {
    t.mock.method(stocks, "findByIdentifier", async () => ({ _id: "stock", quantityCurrent: 10 }));
    t.mock.method(stocks, "incrementQuantity", async () => null);
    await assert.rejects(service.addStockEntry("stock", { quantity: 5 }), { status: 409 });
});

test("stock deletion distinguishes invalid identifiers from missing stock", async t => {
    await assert.rejects(service.deleteStock("invalid"), { status: 400 });
    t.mock.method(stocks, "deleteById", async () => null);
    await assert.rejects(service.deleteStock("507f1f77bcf86cd799439011"), { status: 404 });
});
