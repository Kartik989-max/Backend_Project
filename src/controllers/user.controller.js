import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCLoudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";


const generateAccessAndRefreshTokens= async(userId)=>{
  try {
    const user= await User.findById(userId);
    const accessToken= user.generateAccessToken();
    const refreshToken= user.generateRefreshToken();
    user.refreshToken=refreshToken;
    await user.save({validateBeforeSave:false});

    return {accessToken,refreshToken};
    
  } catch (error) {
      throw new ApiError(500,'Something went wrong while generating referesh and access token');
  }
}

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
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
    coverImageLocalPath=req.files.coverImage[0].path;
  }
  


  if (!avatarLocalPath) {
    throw new ApiError(409, "Avatar is required");
  }
  const avatar = await uploadOnCLoudinary(avatarLocalPath);
  const coverImage = await uploadOnCLoudinary(coverLocalPath);

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

const loginUser = asyncHandler(async (req,res)=>{
    // get user req
    // username || email validation 
    // find the user
    // password check 
    // access and refresh token 
    // send cookies
    const {email,username,password}=req.body;
    if(!email || !username){
      throw new ApiError(400,'Username and Password required');
    }
    const user = User.findOne({
      $or:[{username},{email}],
    })

    if(!user){
      throw new ApiError(404,'User doesnt exist');
    }

    const isPasswordValid=await user.isPasswordCorrect(password);
    if(!isPasswordValid){
      throw new ApiError(400,'Password is incorrect');
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id);

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken");

    const options={
      httpOnly:true,
      secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(
        200,{
          user:loggedInUser,accessToken,refreshToken
        },
        "User Logged In SuccessFully"
      )
    )

  });

const logoutUser=asyncHandler(async(req,res)=>{
    const {} = req.body;
});
export { registerUser, loginUser };
