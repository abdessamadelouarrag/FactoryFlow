import assert from "node:assert/strict";
import { test } from "node:test";
import * as service from "../../src/services/productService.js";
import products from "../../src/repositories/productRepository.js";
import materials from "../../src/repositories/materialRepository.js";
import orders from "../../src/repositories/productionOrderRepository.js";

const input = { reference: " prd-table ", name: " Table ", composition: [{ material: "MAT-ACIER", quantityPerUnit: "2" }] };

test("product creation resolves material references and normalizes quantities", async t => {
    t.mock.method(products, "findByReference", async () => null);
    t.mock.method(materials, "findByIdentifier", async () => ({ _id: "material-1" }));
    t.mock.method(products, "create", async data => data);
    assert.deepEqual(await service.createProduct(input), {
        reference: "PRD-TABLE", name: "Table", composition: [{ material: "material-1", quantityPerUnit: 2 }]
    });
});

test("product creation rejects duplicate materials, invalid quantities and unknown materials", async t => {
    t.mock.method(products, "findByReference", async () => null);
    t.mock.method(materials, "findByIdentifier", async () => ({ _id: "material-1" }));
    const create = t.mock.method(products, "create", async () => assert.fail("must not write"));
    await assert.rejects(service.createProduct({ ...input, composition: [...input.composition, ...input.composition] }), { status: 400 });
    for (const quantityPerUnit of [0, -1, Infinity, null, true, ""]) {
        await assert.rejects(service.createProduct({ ...input, composition: [{ material: "MAT", quantityPerUnit }] }), { status: 400 });
    }
    t.mock.method(materials, "findByIdentifier", async () => null);
    await assert.rejects(service.createProduct(input), { status: 404 });
    assert.equal(create.mock.callCount(), 0);
});

test("product creation translates duplicate key races into conflicts", async t => {
    t.mock.method(products, "findByReference", async () => null);
    t.mock.method(materials, "findByIdentifier", async () => ({ _id: "material-1" }));
    t.mock.method(products, "create", async () => { throw Object.assign(new Error("Duplicate"), { code: 11000 }); });
    await assert.rejects(service.createProduct(input), { status: 409 });
});

test("product update rejects missing products and does not write invalid composition", async t => {
    t.mock.method(products, "findByReference", async () => null);
    const update = t.mock.method(products, "updateByReference", async () => assert.fail("must not write"));
    await assert.rejects(service.updateProduct("PRD-TABLE", input), { status: 404 });
    t.mock.method(products, "findByReference", async () => ({ _id: "product" }));
    await assert.rejects(service.updateProduct("PRD-TABLE", { name: "Table", composition: [] }), { status: 400 });
    assert.equal(update.mock.callCount(), 0);
});

test("products used by production orders cannot be deleted", async t => {
    t.mock.method(products, "findByReference", async () => ({ _id: "product" }));
    t.mock.method(orders, "existsByProductId", async () => ({ _id: "order" }));
    const remove = t.mock.method(products, "deleteByReference", async () => ({ _id: "product" }));
    await assert.rejects(service.deleteProduct("PRD-TABLE"), { status: 409 });
    assert.equal(remove.mock.callCount(), 0);
    t.mock.method(orders, "existsByProductId", async () => null);
    await service.deleteProduct("prd-table");
    assert.equal(remove.mock.calls[0].arguments[0], "PRD-TABLE");
});
