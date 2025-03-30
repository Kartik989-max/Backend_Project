import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCLoudinary = async (localFilePath) => {
    try{
        if(!localFilePath) {
            throw new Error("No file path provided");
        }
        const respone = await cloudinary.uploader.upload(localFilePath,{resource_type:'auto'});
        // console.log('File uploaded successfully',respone.url);
        fs.unlinkSync(localFilePath);
        return respone;
    }
    catch(err){
        fs.unlinkSync(localFilePath); // Delete the file if upload fails
        console.error('Error uploading file to Cloudinary:', err);
        return null;
    }   
};


export { uploadOnCLoudinary };