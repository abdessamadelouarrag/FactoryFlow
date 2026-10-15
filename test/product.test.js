import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Product from "../src/models/Product.js";
import Material from "../src/models/Material.js";
import ProductionOrder from "../src/models/ProductionOrder.js";
import RevokedToken from "../src/models/RevokedToken.js";
import productRoute from "../src/routes/productRoute.js";

test("Product composition validates distinct materials and positive quantities", () => {
    const first = new mongoose.Types.ObjectId();
    const second = new mongoose.Types.ObjectId();
    const product = composition => new Product({reference : "PRD-TEST", name : "Produit", composition});

    assert.equal(product([
        {material : first, quantityPerUnit : 2},
        {material : second, quantityPerUnit : 3}
    ]).validateSync(), undefined);
    assert.ok(product([
        {material : first, quantityPerUnit : 2},
        {material : first, quantityPerUnit : 3}
    ]).validateSync());
    assert.ok(product([]).validateSync());
    for(const quantity of [0, -1, Infinity, NaN]){
        assert.ok(product([{material : first, quantityPerUnit : quantity}]).validateSync());
    }

    const order = new ProductionOrder({
        product : new mongoose.Types.ObjectId(), productReference : "PRD-TEST", productName : "Produit",
        quantity : 1, assignedOperator : new mongoose.Types.ObjectId(), createdBy : new mongoose.Types.ObjectId(),
        compositionSnapshot : [first, second].map((rawMaterial, index) => ({
            rawMaterial, reference : `MAT-${index}`, name : "Matiere", unit : "KG", quantityPerUnit : 1
        }))
    });
    assert.equal(order.validateSync(), undefined);
});

test("Product API: protected CRUD and composition rules", async (t) => {
    const previousSecret = process.env.SECRET_KEY;
    process.env.SECRET_KEY = "product-test-only-secret";
    t.after(() => {
        if(previousSecret === undefined) delete process.env.SECRET_KEY;
        else process.env.SECRET_KEY = previousSecret;
    });

    const materials = [
        {_id : new mongoose.Types.ObjectId(), reference : "MAT-ACIER", name : "Acier", unit : "KG"},
        {_id : new mongoose.Types.ObjectId(), reference : "MAT-BOIS", name : "Bois", unit : "KG"}
    ];
    const products = new Map();
    let linkedOrder = false;
    let duplicateRace = false;
    let databaseFailure = false;
    const query = value => ({
        then : (resolve, reject) => Promise.resolve(value).then(resolve, reject),
        populate : async (path, fields) => {
            assert.equal(path, "composition.material");
            assert.equal(fields, "reference name unit");
            return value;
        }
    });

    t.mock.method(RevokedToken, "exists", async () => null);
    t.mock.method(Material, "findById", async id => materials.find(material => String(material._id) === id));
    t.mock.method(Material, "findOne", async ({reference}) => materials.find(material => material.reference === reference));
    t.mock.method(ProductionOrder, "exists", async () => linkedOrder ? {_id : "order"} : null);
    t.mock.method(Product.prototype, "populate", async function(path, fields){
        assert.equal(path, "composition.material");
        assert.equal(fields, "reference name unit");
        return this;
    });
    t.mock.method(Product, "findOne", ({reference}) => {
        if(databaseFailure) throw new Error("Database unavailable");
        return query(products.get(reference) || null);
    });
    t.mock.method(Product, "find", () => query([...products.values()]));
    t.mock.method(Product, "create", async data => {
        if(duplicateRace) throw Object.assign(new Error("Duplicate key"), {code : 11000});
        const product = new Product(data);
        await product.validate();
        products.set(product.reference, product);
        return product;
    });
    t.mock.method(Product, "findOneAndUpdate", (filter, update, options) => {
        assert.deepEqual(options, {new : true, runValidators : true});
        const product = products.get(filter.reference);
        product.set(update.$set);
        const error = product.validateSync();
        if(error) throw error;
        return query(product);
    });
    t.mock.method(Product, "findOneAndDelete", async ({reference}) => {
        const product = products.get(reference);
        products.delete(reference);
        return product;
    });

    const app = express();
    app.use(express.json());
    app.use("/api/product", productRoute);
    app.use((error, req, res, next) => res.status(500).json({message_error : error.message}));
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    const token = jwt.sign({sub : "product-test-user"}, process.env.SECRET_KEY, {expiresIn : "1h"});
    const request = async (method, path, body, authorization = token) => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/product/${path}`, {
            method,
            headers : {
                ...(authorization ? {Authorization : `Bearer ${authorization}`} : {}),
                ...(body ? {"Content-Type" : "application/json"} : {})
            },
            body : body ? JSON.stringify(body) : undefined
        });
        return {status : response.status, body : await response.json()};
    };
    const data = {
        reference : " prd-table ", name : " Table ",
        composition : [
            {material : "mat-acier", quantityPerUnit : 2},
            {material : String(materials[1]._id), quantityPerUnit : "3"}
        ]
    };

    await t.test("all product routes require a valid token", async () => {
        for(const [method, path] of [
            ["POST", "newProduct"], ["GET", "all"], ["GET", "PRD-TABLE"],
            ["PUT", "update/PRD-TABLE"], ["DELETE", "delete/PRD-TABLE"]
        ]) assert.equal((await request(method, path, undefined, null)).status, 401);
        assert.equal((await request("GET", "all", undefined, "invalid-token")).status, 401);
        assert.equal(products.size, 0);
    });

    await t.test("reject invalid compositions and unknown materials", async () => {
        for(const composition of [undefined, [], [null], [{quantityPerUnit : 1}],
            ...[0, -1, null, true, "Infinity", "abc"].map(quantityPerUnit => [{material : "MAT-ACIER", quantityPerUnit}]),
            [{material : "MAT-ACIER", quantityPerUnit : 1}, {material : String(materials[0]._id), quantityPerUnit : 2}]
        ]) assert.equal((await request("POST", "newProduct", {...data, composition})).status, 400);
        assert.equal((await request("POST", "newProduct", {name : "Table"})).status, 400);
        assert.equal((await request("POST", "newProduct", {...data, composition : [
            {material : "MAT-UNKNOWN", quantityPerUnit : 1}
        ]})).status, 404);
        assert.equal(products.size, 0);
    });

    await t.test("create, list and retrieve a product with several materials", async () => {
        const created = await request("POST", "newProduct", data);
        assert.equal(created.status, 201);
        assert.equal(created.body.info_product.reference, "PRD-TABLE");
        assert.equal(created.body.info_product.name, "Table");
        assert.equal(created.body.info_product.composition.length, 2);
        assert.equal(created.body.info_product.composition[1].quantityPerUnit, 3);
        assert.equal((await request("GET", "all")).body.allProduct.length, 1);
        assert.equal((await request("GET", "prd-table")).body.info_product.reference, "PRD-TABLE");
        assert.equal((await request("GET", "UNKNOWN")).status, 404);
        assert.equal((await request("POST", "newProduct", data)).status, 409);
    });

    await t.test("update validates the composition and targets the product reference", async () => {
        const updated = await request("PUT", "update/prd-table", {...data, name : "Table modifiee"});
        assert.equal(updated.status, 200);
        assert.equal(updated.body.info_product.name, "Table modifiee");
        assert.equal(updated.body.info_product.reference, "PRD-TABLE");
        assert.equal((await request("PUT", "update/PRD-TABLE", {...data, composition : []})).status, 400);
        assert.equal((await request("PUT", "update/UNKNOWN", data)).status, 404);
        assert.equal(products.get("PRD-TABLE").name, "Table modifiee");
    });

    await t.test("reject duplicate races and propagate database errors", async () => {
        duplicateRace = true;
        assert.equal((await request("POST", "newProduct", {...data, reference : "PRD-RACE"})).status, 409);
        duplicateRace = false;
        databaseFailure = true;
        assert.equal((await request("GET", "PRD-TABLE")).status, 500);
        databaseFailure = false;
    });

    await t.test("preserve products used in production orders and delete unused products", async () => {
        linkedOrder = true;
        assert.equal((await request("DELETE", "delete/PRD-TABLE")).status, 409);
        assert.equal(products.size, 1);
        linkedOrder = false;
        assert.equal((await request("DELETE", "delete/prd-table")).status, 200);
        assert.equal((await request("DELETE", "delete/PRD-TABLE")).status, 404);
        assert.equal(products.size, 0);
    });
});
