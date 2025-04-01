import { Router } from "express";
import { loginUser, registerUser,logoutUser,refreshAccessToken } from "../controllers/user.controller.js";
import {upload} from '../middlewares/multer.middleware.js'
import {verifyJWT} from "../middlewares/auth.middleware.js"

const userRoutes = Router();

userRoutes.route("/register").post(upload.fields([
    {name:'avatar',maxCount:1},

    {name:'coverImage',maxCount:1}
]),registerUser);

userRoutes.route('/login').post(loginUser)

//secured routes

userRoutes.route('/logout').post(verifyJWT,logoutUser);
userRoutes.route("/refresh-token").post(refreshAccessToken)



export default userRoutes;