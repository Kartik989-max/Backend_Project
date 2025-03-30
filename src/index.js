import dotenv from "dotenv";
import connectDB from "./db/index.js";
import express from "express";
import {app} from "./app.js";
dotenv.config({
    path: "./env"
});

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
    console.log("MongoDB connected");
})
.catch((err) => {
    console.log("MongoDB connection error:",err);
});