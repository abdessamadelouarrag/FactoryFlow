import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import users from "../src/repositories/userRepository.js";
import products from "../src/repositories/productRepository.js";
import orders from "../src/repositories/productionOrderRepository.js";
import stocks from "../src/repositories/stockRepository.js";
import revoked from "../src/repositories/revokedTokenRepository.js";
import transactions from "../src/repositories/transactionRepository.js";

test("production order HTTP lifecycle uses services and restricts operator access", async t => {
    const previousSecret = process.env.SECRET_KEY;
    process.env.SECRET_KEY = "production-order-test-secret";
    t.after(() => { if (previousSecret === undefined) delete process.env.SECRET_KEY; else process.env.SECRET_KEY = previousSecret; });
    const admin = { _id: "111111111111111111111111", role: "ADMIN" };
    const operator = { _id: "222222222222222222222222", role: "OPERATOR" };
    const other = { _id: "444444444444444444444444", role: "OPERATOR" };
    const orderId = "333333333333333333333333";
    const records = new Map();
    t.mock.method(users, "findById", async id => [admin, operator, other].find(user => user._id === id));
    t.mock.method(revoked, "existsByHash", async () => null);
    t.mock.method(products, "findDetailsByReference", async () => ({
        _id: "555555555555555555555555", reference: "PRD-TABLE", name: "Table",
        composition: [{ material: { _id: "666666666666666666666666", reference: "MAT-ACIER", name: "Acier", unit: "KG" }, quantityPerUnit: 2 }]
    }));
    t.mock.method(orders, "create", async data => {
        const order = { _id: orderId, ...data };
        records.set(orderId, order);
        return order;
    });
    t.mock.method(orders, "findById", async id => records.get(id) || null);
    t.mock.method(orders, "findAll", async filter => [...records.values()].filter(order => !filter.assignedOperator || order.assignedOperator === filter.assignedOperator));
    t.mock.method(orders, "transition", async (id, previousStatus, changes) => {
        const order = records.get(id);
        if (!order || order.status !== previousStatus) return null;
        Object.assign(order, changes);
        return order;
    });
    t.mock.method(transactions, "run", async work => work({ testSession: true }));
    const consume = t.mock.method(stocks, "consume", async () => ({ quantityCurrent: 94 }));
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    async function request(method, path, user, body) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/production-orders${path}`, {
            method, headers: {
                Authorization: `Bearer ${jwt.sign({ sub: user._id }, process.env.SECRET_KEY)}`,
                ...(body ? { "Content-Type": "application/json" } : {})
            }, body: body ? JSON.stringify(body) : undefined
        });
        return { status: response.status, body: await response.json() };
    }
    const input = { productReference: "PRD-TABLE", quantity: 3, assignedOperator: operator._id };
    assert.equal((await request("POST", "", operator, input)).status, 403);
    const planned = await request("POST", "", admin, input);
    assert.equal(planned.status, 201);
    assert.equal(planned.body.order.status, "PLANNED");
    assert.equal((await request("GET", "", other)).body.count, 0);
    assert.equal((await request("GET", "", operator)).body.count, 1);
    assert.equal((await request("GET", `/${orderId}`, other)).status, 403);
    const started = await request("PATCH", `/${orderId}/start`, operator);
    assert.equal(started.status, 200);
    assert.equal(started.body.order.status, "IN_PROGRESS");
    assert.equal(consume.mock.calls[0].arguments[1], 6);
    assert.equal((await request("PATCH", `/${orderId}/start`, operator)).status, 409);
    const completed = await request("PATCH", `/${orderId}/complete`, operator);
    assert.equal(completed.status, 200);
    assert.equal(completed.body.order.status, "COMPLETED");
    assert.equal(consume.mock.callCount(), 1);
    assert.equal((await request("PATCH", `/${orderId}/cancel`, admin)).status, 409);
    await request("POST", "", admin, input);
    const cancelled = await request("PATCH", `/${orderId}/cancel`, operator);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.order.status, "CANCELLED");
});
