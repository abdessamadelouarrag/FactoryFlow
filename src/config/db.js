import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export async function connectDb(){
    const mongoDb = process.env.MONGO_URI

    if(!mongoDb){
        throw new Error("le variable uri mongodb introvable")
    }

    await mongoose.connect(mongoDb)
    console.log("mongoDb est connecter...")
}