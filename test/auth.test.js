import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import authRoute from "../src/routes/authRoute.js";
import User from "../src/models/User.js";
import RevokedToken from "../src/models/RevokedToken.js";

test("JWT logout and verification", async (t) => {
    const previousSecret = process.env.SECRET_KEY;
    process.env.SECRET_KEY = "test-only-secret";
    t.after(() => {
        if (previousSecret === undefined) delete process.env.SECRET_KEY;
        else process.env.SECRET_KEY = previousSecret;
    });

    const revoked = new Map();
    let failRead = false;
    let failWrite = false;
    t.mock.method(RevokedToken, "exists", async ({ tokenHash }) => {
        if (failRead) throw new Error("Database unavailable");
        return revoked.has(tokenHash) ? { _id: tokenHash } : null;
    });
    t.mock.method(RevokedToken, "updateOne", async (filter, update, options) => {
        if (failWrite) throw new Error("Database unavailable");
        assert.equal(options.upsert, true);
        if (!revoked.has(filter.tokenHash)) {
            revoked.set(filter.tokenHash, update.$setOnInsert);
        }
        return { acknowledged: true };
    });
    t.mock.method(User, "findOne", async () => ({
        _id: "user-123", name: "Test", email: "test@example.com",
        password: await bcrypt.hash("password", 4)
    }));

    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoute);
    app.use((error, req, res, next) => res.status(500).json({ message_error: error.message }));
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    }));

    const request = (path, token, body) => fetch(
        `http://127.0.0.1:${server.address().port}/api/auth/${path}`,
        { method: path === "logout" || path === "login" ? "POST" : "GET",
            headers: {
                ...(token ? { authorization: `Bearer ${token}` } : {}),
                ...(body ? { "Content-Type": "application/json" } : {})
            },
            body: body ? JSON.stringify(body) : undefined }
    );
    const signIn = async () => {
        const response = await request("login", undefined, {
            email: "test@example.com", password: "password"
        });
        assert.equal(response.status, 200);
        const body = await response.json();
        return body.token;
    };

    await t.test("logout revokes only the current session", async () => {
        const first = await signIn();
        const second = await signIn();
        assert.notEqual(first, second);
        const claims = jwt.verify(first, process.env.SECRET_KEY);
        assert.equal(claims.exp - claims.iat, 86400);
        assert.equal((await request("me", first)).status, 200);
        const response = await request("logout", first);
        assert.equal(response.status, 200);
        assert.equal((await response.json()).message_succes, "Deconnexion reussie");
        assert.equal((await request("me", first)).status, 401);
        assert.equal((await request("logout", first)).status, 401);
        assert.equal((await request("me", second)).status, 200);
        const stored = [...revoked.values()][0];
        assert.match(stored.tokenHash, /^[a-f0-9]{64}$/);
        assert.equal(stored.expiresAt.getTime(), claims.exp * 1000);
    });

    await t.test("invalid credentials cannot access or log out", async () => {
        const invalidTokens = [
            undefined, "invalid-token",
            jwt.sign({ sub: "user-123" }, "wrong-secret"),
            jwt.sign({ sub: "user-123" }, process.env.SECRET_KEY, { expiresIn: -1 }),
            jwt.sign({ sub: "user-123" }, process.env.SECRET_KEY, { notBefore: "1h" }),
            jwt.sign({ sub: "user-123" }, process.env.SECRET_KEY, { algorithm: "HS384" }),
            jwt.sign({ role: "ADMIN" }, process.env.SECRET_KEY),
            jwt.sign({ sub: " " }, process.env.SECRET_KEY),
            jwt.sign({ sub: "user-123" }, null, { algorithm: "none" })
        ];
        const count = revoked.size;
        for (const token of invalidTokens) {
            assert.equal((await request("logout", token)).status, 401);
            assert.equal((await request("me", token)).status, 401);
        }
        assert.equal(revoked.size, count);
    });

    await t.test("legacy tokens without expiry can still log out", async () => {
        const token = jwt.sign({ sub: "legacy-user" }, process.env.SECRET_KEY);
        assert.equal((await request("logout", token)).status, 200);
        assert.equal((await request("me", token)).status, 401);
        assert.equal([...revoked.values()].at(-1).expiresAt, undefined);
    });

    await t.test("database failures deny access and never report successful logout", async () => {
        const token = await signIn();
        failRead = true;
        assert.equal((await request("me", token)).status, 500);
        assert.equal((await request("logout", token)).status, 500);
        failRead = false;
        failWrite = true;
        assert.equal((await request("logout", token)).status, 500);
        failWrite = false;
        assert.equal((await request("me", token)).status, 200);
    });
});
