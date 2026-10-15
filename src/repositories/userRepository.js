import User from "../models/User.js";

export default {
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
