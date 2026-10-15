import RevokedToken from "../models/RevokedToken.js";

export default {
    async existsByHash(tokenHash) {
        return RevokedToken.exists({ tokenHash });
    },

    async revoke(data) {
        return RevokedToken.updateOne(
            { tokenHash: data.tokenHash },
            { $setOnInsert: data },
            { upsert: true }
        );
    }
};
