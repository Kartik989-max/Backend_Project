import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema=new Schema({
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    thumbnail:{
        type:String, // Cloudinary URL
        required:true,
    },
    videoFile:{
        type:String, // Cloudinary URL
        required:true,
    },
    duration:{
        type:Number, // Cloudinary URL
        required:true,
    },
    views:{
        type:Number,
        default:0,
    },
    isPublised:{
        type:Boolean,
        default:true,
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },   
},{timestamps:true});

videoSchema.plugin(mongooseAggregatePaginate);

export const Video=mongoose.model("Video",videoSchema);