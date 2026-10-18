import User from "../models/User.js";
import mongoose from "mongoose";

export default {
    async findById(id) {
        if (!mongoose.isObjectIdOrHexString(id)) return null;
        return User.findById(id);
    },

    async findByEmail(email) {
        return User.findOne({ email });
    },

    async findAll() {
        return User.find();
    },

    async create(data) {
        return User.create(data);
    }
};
