import assert from "node:assert/strict";
import { test } from "node:test";
import * as service from "../../src/services/materialService.js";
import materials from "../../src/repositories/materialRepository.js";

test("material creation normalizes the reference and trims fields", async t => {
    t.mock.method(materials, "findByReference", async reference => { assert.equal(reference, "MAT-ACIER"); return null; });
    t.mock.method(materials, "create", async data => data);
    assert.deepEqual(await service.createMaterial({ reference: " mat-acier ", name: " Acier ", unit: " KG " }), {
        reference: "MAT-ACIER", name: "Acier", unit: "KG"
    });
});

test("material creation rejects duplicates and invalid units", async t => {
    t.mock.method(materials, "findByReference", async () => ({ reference: "MAT-ACIER" }));
    const create = t.mock.method(materials, "create", async () => assert.fail("must not write"));
    await assert.rejects(service.createMaterial({ reference: "mat-acier", name: "Acier", unit: "KG" }), { status: 400 });
    await assert.rejects(service.createMaterial({ reference: "MAT", name: "Acier", unit: "TOOLONG" }), { status: 400 });
    assert.equal(create.mock.callCount(), 0);
});

test("material update targets its normalized reference and rejects missing materials", async t => {
    t.mock.method(materials, "findByReference", async reference => reference === "MAT-ACIER" ? {} : null);
    const update = t.mock.method(materials, "updateByReference", async () => {});
    await service.updateMaterial(" mat-acier ", { name: "Acier", unit: "T" });
    assert.deepEqual(update.mock.calls[0].arguments, ["MAT-ACIER", { name: "Acier", unit: "T" }]);
    await assert.rejects(service.updateMaterial("UNKNOWN", { name: "Acier", unit: "T" }), { status: 400 });
    assert.equal(update.mock.callCount(), 1);
});

test("material listing propagates repository errors", async t => {
    t.mock.method(materials, "findAll", async () => { throw new Error("Database unavailable"); });
    await assert.rejects(service.allMaterial(), /Database unavailable/);
});
