import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import app, { openapi } from "../src/app.js";

test("OpenAPI has unique operations and resolvable local references", () => {
    assert.equal(openapi.openapi, "3.0.3");
    assert.equal(openapi.components.securitySchemes.bearerAuth.scheme, "bearer");
    const operationIds = new Set();
    for (const [path, methods] of Object.entries(openapi.paths)) {
        for (const operation of Object.values(methods)) {
            assert.ok(!operationIds.has(operation.operationId), operation.operationId);
            operationIds.add(operation.operationId);
            assert.ok(operation.responses[200] || operation.responses[201], path);
            for (const match of path.matchAll(/\{([^}]+)\}/g)) {
                const parameters = (operation.parameters || []).map(parameter => {
                    return openapi.components.parameters[parameter.$ref.split("/").at(-1)];
                });
                assert.ok(parameters.some(parameter => parameter.in === "path" && parameter.name === match[1] && parameter.required), path);
            }
        }
    }
    function checkReferences(value) {
        if (!value || typeof value !== "object") return;
        if (value.$ref) {
            assert.ok(value.$ref.startsWith("#/"));
            const target = value.$ref.slice(2).split("/").reduce((node, key) => node?.[key], openapi);
            assert.ok(target, value.$ref);
        }
        for (const child of Object.values(value)) checkReferences(child);
    }
    checkReferences(openapi);
    assert.equal(operationIds.size, 26);
});

test("app serves Swagger, the OpenAPI document and JSON errors without connecting to MongoDB", async t => {
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${base}/health`);
    assert.deepEqual(await health.json(), { status: "ok" });
    const spec = await fetch(`${base}/openapi.json`);
    assert.deepEqual(await spec.json(), openapi);
    const swagger = await fetch(`${base}/api-docs/`);
    assert.equal(swagger.status, 200);
    assert.match(await swagger.text(), /swagger-ui/);
    const swaggerConfig = await fetch(`${base}/api-docs/swagger-ui-init.js`);
    assert.match(await swaggerConfig.text(), /FactoryFlow API/);
    const missing = await fetch(`${base}/unknown`);
    assert.equal(missing.status, 404);
    assert.equal(typeof (await missing.json()).message_error, "string");
    const invalid = await fetch(`${base}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{invalid"
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).message_error, "JSON invalide");
    for (const [path, methods] of Object.entries(openapi.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
            if (operation.security?.length === 0) continue;
            const response = await fetch(`${base}${path.replace(/\{[^}]+\}/g, "507f1f77bcf86cd799439011")}`, { method: method.toUpperCase() });
            assert.equal(response.status, 401, `${method} ${path}`);
        }
    }
});
