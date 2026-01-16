import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
    path: "./.env"
});

// Handle unhandled rejections
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});
    
connectDB()
    .then(()=>{
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running on port ${process.env.PORT || 8000}`);
        });
    })
    .catch(
        (error) => {
            console.error("MongoDB connection failed: ", error);
            process.exit(1);
        }
    );