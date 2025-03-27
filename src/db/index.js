import mongoose from "mongoose";
import {DB_NAME} from '../constants.js'


const connectDB = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        
        console.log(`MongoDB connected !! ${connectionInstance.connection.host}`);
        app.on('error', (err) => {
            console.error(`Error: ${err.message}`);
            process.exit(1);
        });
    }
    catch(error){
        console.error("MongoDB connection Error",error);
        process.exit(1); 
    }
}

export default connectDB;