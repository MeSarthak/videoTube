// Approach 1:

// import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";
// import express from "express";
// const app = express();

// (async() =>{
    //     try {
        //         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        //         app.on("Error",error);
        //         throw error;
        //         app.listen(process.env.PORT, () => {
//             console.log(`Server is running on port ${process.env.PORT}`);
//         });
//     } catch (error) {
    //         console.error("Error connecting to the database:", error);
    //         throw error;
    //     }
    // })()
    
// Bettter Approach - 2: Professional
// require('dotenv').config();
import dotenv from "dotenv";
import connectDB from "./db/index.js";
dotenv.config({
    path: "./.env"
});
    
connectDB();