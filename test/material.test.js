import assert from "node:assert/strict";
import { test } from "node:test";
import { allMaterial, createMaterial, updateMaterial } from "../src/controller/matiersController.js";
import Material from "../src/models/Material.js";

test("Material controller uses repository queries and targets updates by reference", async t => {
    const materials = new Map([
        ["MAT-ACIER", { reference: "MAT-ACIER", name: "Acier", unit: "KG" }],
        ["MAT-BOIS", { reference: "MAT-BOIS", name: "Bois", unit: "KG" }]
    ]);
    const updates = [];
    let databaseFailure = false;

    t.mock.method(Material, "findOne", async ({ reference }) => materials.get(reference) || null);
    t.mock.method(Material, "find", async () => {
        if (databaseFailure) throw new Error("Database unavailable");
        return [...materials.values()];
    });
    t.mock.method(Material, "create", async data => {
        materials.set(data.reference, data);
        return data;
    });
    t.mock.method(Material, "updateOne", async (filter, update, options) => {
        assert.deepEqual(options, { runValidators: true });
        updates.push(filter);
        const material = materials.get(filter.reference);
        assert.ok(material);
        Object.assign(material, update.$set);
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    });

    async function invoke(handler, req = {}) {
        const result = {};
        const res = {
            status(code) { result.status = code; return this; },
            json(body) { result.body = body; return this; }
        };
        await handler(req, res, error => { result.error = error; });
        return result;
    }

    await t.test("creates and lists materials", async () => {
        const created = await invoke(createMaterial, {
            body: { reference: "mat-cuivre", name: "Cuivre", unit: "KG" }
        });
        assert.equal(created.status, 201);
        assert.equal(created.body.info_Materiel.reference, "MAT-CUIVRE");
        const listed = await invoke(allMaterial);
        assert.equal(listed.status, 200);
        assert.equal(listed.body.allMaterial.length, 3);
    });

    await t.test("updates only the requested material", async () => {
        const updated = await invoke(updateMaterial, {
            params: { reference: "MAT-ACIER" }, body: { name: "Acier modifie", unit: "T" }
        });
        assert.equal(updated.status, 200);
        assert.deepEqual(updates, [{ reference: "MAT-ACIER" }]);
        assert.equal(materials.get("MAT-ACIER").name, "Acier modifie");
        assert.equal(materials.get("MAT-ACIER").unit, "T");
        assert.equal(materials.get("MAT-BOIS").name, "Bois");
        assert.equal(materials.get("MAT-BOIS").unit, "KG");
    });

    await t.test("does not write when the reference is missing", async () => {
        const missing = await invoke(updateMaterial, {
            params: { reference: "UNKNOWN" }, body: { name: "Inconnu", unit: "KG" }
        });
        assert.equal(missing.status, 400);
        assert.equal(updates.length, 1);
    });

    await t.test("forwards repository failures to error handling", async () => {
        databaseFailure = true;
        const failed = await invoke(allMaterial);
        assert.equal(failed.error.message, "Database unavailable");
        assert.equal(failed.status, undefined);
    });
});
