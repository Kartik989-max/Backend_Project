import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCLoudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from 'jsonwebtoken';
import { subscribe } from "diagnostics_channel";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from request body
  // validate - not empty
  // check if user already exists - email or username
  // check for images, check for avatar, coverImage
  // upload images to cloudinary
  // create user in db
  // remove password and refresh token from response
  // check for user creation
  // return success response with user details

  const { fullname, email, username, password } = req.body;
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(409, "Email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(409, "Avatar is required");
  }
  const avatar = await uploadOnCLoudinary(avatarLocalPath);
  const coverImage = await uploadOnCLoudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
  }

  const user = await User.create({
    fullname,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something Went Wrong While Creating User");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Created Successfully"));

  console.log(`User registered:  ${email}`);
});

const loginUser = asyncHandler(async (req, res) => {
  // get user req
  // username || email validation
  // find the user
  // password check
  // access and refresh token
  // send cookies
  const { email, username, password } = req.body;
  
  if (!(email || username)) {
    throw new ApiError(400, "Username and Password required");
  }
  const user =await User.findOne({
    $or: [{ username }, { email }],
  });

  
  if (!user) {
    throw new ApiError(404, "User doesnt exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(400, "Password is incorrect");
  }
  

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged In SuccessFully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id,{
    $set:{
      refreshToken:undefined,
    }
  },{new:true});

  const options={
    httpOnly:true,
    secure:true
  }

  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{},"User Logout Successfully"));
});


const refreshAccessToken = asyncHandler(async(req,res)=>{
     try {
      const incomingRefreshToken= req.cookies.refreshToken || req.body.registerUser;
      if(!incomingRefreshToken){
       throw new ApiError(401,"Unauthorized Access");
      }
 
      const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
 
      const user=User.findById(decodedToken?._id);
      if(!user){
       throw new ApiError(401,"Invalid Token");
      }
 
      if(incomingRefreshToken!==user?.refreshToken){
       throw new ApiError(401,"Refresh token is expired or used");
      }
 
     const options={
       httpOnly:true,
       secure:true
     }
 
     const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",newRefreshToken,options)
     .json(new ApiResponse(200,{accessToken,refreshToken:newRefreshToken},"Access Token Refreshed"))
     } catch (error) {
      throw new ApiError(401,error?.message||"Invalid Refresh Token");
     }
})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword}=req.body;
  const user= await findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if(!isPasswordCorrect){
    throw new ApiError(400,"Password is not correct");
  }

  user.password=password;

  await user.save({validateBeforeSave:false});

  return res.status(200).json(new ApiError(200,{},"Password Changed SuccessFully"));
})

const getCurrentUser=asyncHandler(async(req,res)=>{
  return res.status(200).json(200,req.user,"Current User Fetched Successfully");
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
  const {fullname,email} = req.body;
  if(!fullname || !email){
    throw new ApiError(400,"All fields are required");
  }
  const user=User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullname,
        email,
      }
    },
    {new:true}
   ).select("-password");

   return res.status(200).json(new ApiResponse(200,user,"User details Updated Successfully"));
})

const updateUserAvatar= asyncHandler(async(req,res)=>{
  const avatarLocalPath=req.file?.path;
  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is missing");
  }
  const avatar = await uploadOnCLoudinary(avatarLocalPath);
  
  if(!avatar.url){
    throw new ApiError(400,"Error while uploading file on cloudinary");
  }

  const user = await User
  .findByIdAndUpdate(
    req.user?._id,
    {
    $set:{
      avatar:avatar.url,
    }
  },
  {new:true}).select("-password");

  return res
  .status(200)
  .json(
    new ApiResponse(200,user,"Avatar Updated Successfully"))

})

const updateUserCoverImage= asyncHandler(async(req,res)=>{
  const coverImageLocalPath=req.file?.path;
  if(!coverImageLocalPath){
    throw new ApiError(400,"Cover Image file is missing");
  }
  const coverImage = await uploadOnCLoudinary(coverImageLocalPath);
  
  if(!coverImage.url){
    throw new ApiError(400,"Error while uploading file on cloudinary");
  }

  const user = await User
  .findByIdAndUpdate(
    req.user?._id,
    {
    $set:{
      coverImage:coverImage.url,
    }
  },
  {new:true}).select("-password");

  return res
  .status(200)
  .json(
    new ApiResponse(200,user,"Cover Image Updated Successfully"))
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
  const {username}=req.params;
  if(!username?.trim()){
    throw new ApiError(400,"Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match:{
        username:username?.toLowerCase()
      }
    },{
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers",
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo",
      }
    },
    {
      $addFields:{
        subscribersCount:{
          $size:"$subscriber"
        },
        channelsSubscribedToCount:{
          $size:"$subscibedTo"
        },
        isSubscribed:{
          $cond:{
            if:{$in:[req.user?._id,"$subscribers.subscriber"]},
            then:true,
            else:false
          }
        }
      }
    },{
      $project:{
        fullname:1,
        username:1,
        subscribersCount:1,
        channelsSubscribedToCount:1,
        coverImage:1,
        avatar:1,
        email:1,
        isSubscribed:1,
      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(404,"Channel does not exists");
  }

  return res
  .status(200)
  .json(new ApiResponse(200,channel,"Channel Fetched Successfully"))
})


export { 
  registerUser, 
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
