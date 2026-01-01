import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation of user details -not empty
  // check if user already exists in DB: using username or email
  // check for images, check for avatar
  // upload the images to cloudinary
  // create user object - create entry in db
  // remove password and refresh token from user object
  // check for user creation success
  // return response to frontend

  const { username, fullname, email, password } = req.body;
  console.log(username, fullname, email, password);

  if (fullname === "") {
    throw new ApiError(400, "Fullname is required");
  }
  if (username === "") {
    throw new ApiError(400, "Username is required");
  }
  if (email === "") {
    throw new ApiError(400, "Email is required");
  }
  if (password === "") {
    throw new ApiError(400, "Password is required");
  }

  const existedUser = User.findOne({ $or: [{ email }, { username }] });

  if (existedUser) {
    throw new ApiError(409, "User already exists with this email or username");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "User creation failed");
  }
  return res.status(201).json(new ApiResponse(201, createdUser, "User created successfully"));
});

export { registerUser };
