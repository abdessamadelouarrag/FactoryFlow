import dotenv from "dotenv";
import express from "express";
import {connectDb} from "./config/db.js"
import authRoute from "./routes/authRoute.js";
import materialRoute from "./routes/materialRoute.js";
import stockRoute from "./routes/stockRoute.js";

const app = express();
const port = process.env.PORT || 3000

app.use(express.json());

// app.use("/", (req, res) =>{
//     res.json({
//         message : "wesh les gars"
//     })
// })
app.use("/api/auth", authRoute);
app.use("/api/material", materialRoute);
app.use("/api/stock", stockRoute);

async function startServer(){
    try{
        await connectDb();
        app.listen(port, () =>{
            console.log(`server demare dans le port ${port}`)
        })

    }catch(error){
        console.log(error)
    }
}

startServer();