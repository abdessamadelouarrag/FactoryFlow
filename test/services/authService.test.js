import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as service from "../../src/services/authService.js";
import users from "../../src/repositories/userRepository.js";
import revoked from "../../src/repositories/revokedTokenRepository.js";
import User from "../../src/models/User.js";

test("register normalizes email, hashes the password and assigns the first admin", async t => {
    t.mock.method(users, "findByEmail", async email => { assert.equal(email, "test@example.com"); return null; });
    t.mock.method(users, "findAll", async () => []);
    t.mock.method(users, "create", async data => data);
    const user = await service.register({ name: " Test ", email: " TEST@example.com ", password: " secret " });
    assert.equal(user.name, "Test");
    assert.equal(user.role, "ADMIN");
    assert.notEqual(user.password, " secret ");
    assert.ok(await bcrypt.compare(" secret ", user.password));
});

test("later registrations are operators regardless of the requested role", async t => {
    t.mock.method(users, "findByEmail", async () => null);
    t.mock.method(users, "findAll", async () => [{ _id: "admin" }]);
    t.mock.method(users, "create", async data => data);
    const user = await service.register({ name: "Test", email: "test@example.com", password: "secret", role: "ADMIN" });
    assert.equal(user.role, "OPERATOR");
});

test("registration rejects missing fields and duplicate emails without writing", async t => {
    t.mock.method(users, "findByEmail", async () => ({ _id: "existing" }));
    const create = t.mock.method(users, "create", async () => assert.fail("must not write"));
    await assert.rejects(service.register({}), { status: 400 });
    await assert.rejects(service.register({ name: "Test", email: "invalid", password: "secret" }), { status: 400 });
    await assert.rejects(service.register({ name: "Test", email: "test@example.com", password: "secret" }), { status: 400 });
    assert.equal(create.mock.callCount(), 0);
});

test("login creates a verifiable token and logout revokes its hash until expiry", async t => {
    const previousSecret = process.env.SECRET_KEY;
    process.env.SECRET_KEY = "service-test-secret";
    t.after(() => { if (previousSecret === undefined) delete process.env.SECRET_KEY; else process.env.SECRET_KEY = previousSecret; });
    t.mock.method(users, "findByEmail", async () => ({ _id: "user", password: await bcrypt.hash("secret", 4) }));
    t.mock.method(revoked, "existsByHash", async () => null);
    const revoke = t.mock.method(revoked, "revoke", async () => {});
    const { token } = await service.login({ email: "test@example.com", password: "secret" });
    const { claims, tokenHash } = await service.verifyAccessToken(token);
    assert.equal(claims.sub, "user");
    assert.equal(claims.exp - claims.iat, 86400);
    assert.match(tokenHash, /^[a-f0-9]{64}$/);
    await service.logout(tokenHash, claims);
    assert.deepEqual(revoke.mock.calls[0].arguments[0], { tokenHash, expiresAt: new Date(claims.exp * 1000) });
    assert.equal(jwt.verify(token, process.env.SECRET_KEY).sub, "user");
});

test("login rejects an unknown account and propagates repository failures", async t => {
    t.mock.method(users, "findByEmail", async () => null);
    await assert.rejects(service.login({ email: "test@example.com", password: "secret" }), { status: 400 });
    t.mock.method(users, "findByEmail", async () => { throw new Error("Database unavailable"); });
    await assert.rejects(service.login({ email: "test@example.com", password: "secret" }), /Database unavailable/);
});

test("login rejects a wrong password and user JSON excludes password hashes", async t => {
    const password = await bcrypt.hash("secret", 4);
    t.mock.method(users, "findByEmail", async () => ({ _id: "user", password }));
    await assert.rejects(service.login({ email: "test@example.com", password: "wrong" }), { status: 400 });
    const serialized = new User({ name: "Test", email: "test@example.com", password, role: "OPERATOR" }).toJSON();
    assert.equal(serialized.password, undefined);
    assert.equal(serialized.passwordHash, undefined);
});
