import assert from "node:assert/strict";
import { test } from "node:test";
import * as service from "../../src/services/productionOrderService.js";
import orders from "../../src/repositories/productionOrderRepository.js";
import stocks from "../../src/repositories/stockRepository.js";
import users from "../../src/repositories/userRepository.js";
import products from "../../src/repositories/productRepository.js";
import transactions from "../../src/repositories/transactionRepository.js";

const adminId = "111111111111111111111111";
const operatorId = "222222222222222222222222";
const orderId = "333333333333333333333333";

function setup(t, status = "PLANNED") {
    const order = {
        _id: orderId, assignedOperator: operatorId, status, quantity: 3,
        compositionSnapshot: [
            { rawMaterial: "steel", reference: "MAT-ACIER", quantityPerUnit: 2 },
            { rawMaterial: "wood", reference: "MAT-BOIS", quantityPerUnit: 4 }
        ]
    };
    t.mock.method(users, "findById", async id => id === adminId ? { _id: id, role: "ADMIN" }
        : id === operatorId ? { _id: id, role: "OPERATOR" } : null);
    t.mock.method(orders, "findById", async () => order);
    const transition = t.mock.method(orders, "transition", async (id, previous, changes) => {
        assert.equal(id, orderId);
        assert.equal(previous, order.status);
        return { ...order, ...changes };
    });
    const session = { testSession: true };
    const run = t.mock.method(transactions, "run", async work => work(session));
    return { order, transition, session, run };
}

test("planning snapshots product materials and leaves stock untouched", async t => {
    setup(t);
    const material = { _id: "steel", reference: "MAT-ACIER", name: "Acier", unit: "KG" };
    t.mock.method(products, "findDetailsByReference", async () => ({
        _id: "product", reference: "PRD-TABLE", name: "Table", composition: [{ material, quantityPerUnit: 2 }]
    }));
    t.mock.method(orders, "create", async data => data);
    const consume = t.mock.method(stocks, "consume", async () => assert.fail("planning must not consume stock"));
    const order = await service.createOrder({ productReference: "prd-table", quantity: "3", assignedOperator: operatorId }, adminId);
    material.name = "Changed later";
    assert.equal(order.status, "PLANNED");
    assert.equal(order.quantity, 3);
    assert.equal(order.compositionSnapshot[0].name, "Acier");
    assert.equal(order.compositionSnapshot[0].rawMaterial, "steel");
    assert.equal(consume.mock.callCount(), 0);
});

test("only admins plan orders and only the assigned operator or an admin can access them", async t => {
    const { order } = setup(t);
    await assert.rejects(service.createOrder({}, operatorId), { status: 403 });
    order.assignedOperator = "other";
    await assert.rejects(service.getOrder(orderId, operatorId), { status: 403 });
    assert.equal((await service.getOrder(orderId, adminId))._id, orderId);
    await assert.rejects(service.getOrder("invalid", adminId), { status: 400 });
    await assert.rejects(service.getOrder(orderId, "unknown"), { status: 401 });
});

test("operators list only their orders while admins list all orders", async t => {
    setup(t);
    const list = t.mock.method(orders, "findAll", async () => []);
    await service.listOrders(operatorId);
    await service.listOrders(adminId);
    assert.deepEqual(list.mock.calls.map(call => call.arguments[0]), [{ assignedOperator: operatorId }, {}]);
});

test("starting consumes snapshot quantities using one transaction and records the actor", async t => {
    const { session, transition, run } = setup(t);
    const consume = t.mock.method(stocks, "consume", async () => ({ quantityCurrent: 10 }));
    const result = await service.startOrder(orderId, operatorId);
    assert.equal(run.mock.callCount(), 1);
    assert.deepEqual(consume.mock.calls.map(call => call.arguments), [["steel", 6, session], ["wood", 12, session]]);
    assert.equal(transition.mock.calls[0].arguments[3], session);
    assert.equal(result.status, "IN_PROGRESS");
    assert.equal(result.startedBy, operatorId);
    assert.ok(result.startedAt instanceof Date);
});

test("insufficient stock rejects the transaction callback without transitioning the order", async t => {
    const { transition } = setup(t);
    t.mock.method(stocks, "consume", async material => material === "steel" ? {} : null);
    await assert.rejects(service.startOrder(orderId, operatorId), { status: 409, message: "Stock insuffisant pour MAT-BOIS !" });
    assert.equal(transition.mock.callCount(), 0);
});

test("starting an order twice is rejected before consuming stock", async t => {
    setup(t, "IN_PROGRESS");
    const consume = t.mock.method(stocks, "consume", async () => assert.fail("must not consume twice"));
    await assert.rejects(service.startOrder(orderId, operatorId), { status: 409 });
    assert.equal(consume.mock.callCount(), 0);
});

test("only in-progress orders complete and only planned orders cancel", async t => {
    const { order } = setup(t);
    await assert.rejects(service.completeOrder(orderId, operatorId), { status: 409 });
    const cancelled = await service.cancelOrder(orderId, operatorId);
    assert.equal(cancelled.status, "CANCELLED");
    assert.equal(cancelled.cancelledBy, operatorId);
    order.status = "IN_PROGRESS";
    await assert.rejects(service.cancelOrder(orderId, operatorId), { status: 409 });
    const completed = await service.completeOrder(orderId, operatorId);
    assert.equal(completed.status, "COMPLETED");
    assert.ok(completed.completedAt instanceof Date);
});

test("concurrent transitions return a conflict rather than reporting success", async t => {
    setup(t, "IN_PROGRESS");
    t.mock.method(orders, "transition", async () => null);
    await assert.rejects(service.completeOrder(orderId, adminId), { status: 409 });
});

test("planning rejects invalid operators and non-finite total quantities", async t => {
    setup(t);
    const create = t.mock.method(orders, "create", async () => assert.fail("must not write"));
    const input = { productReference: "PRD-TABLE", quantity: 2, assignedOperator: adminId };
    await assert.rejects(service.createOrder(input, adminId), { status: 400 });
    t.mock.method(products, "findDetailsByReference", async () => ({
        composition: [{ material: { _id: "steel", reference: "MAT" }, quantityPerUnit: Number.MAX_VALUE }]
    }));
    await assert.rejects(service.createOrder({ ...input, assignedOperator: operatorId }, adminId), { status: 400 });
    assert.equal(create.mock.callCount(), 0);
});
