import mongoose from "mongoose";

export default {
    async run(work) {
        return mongoose.connection.transaction(work);
    }
};
