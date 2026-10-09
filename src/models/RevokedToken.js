import mongoose from "mongoose";

const revokedTokenSchema = new mongoose.Schema({
    tokenHash: { type: String, required: true, unique: true },
    // Older tokens without an expiry remain revoked permanently.
    expiresAt: { type: Date, expires: 0 }
});

export default mongoose.model("RevokedToken", revokedTokenSchema);
