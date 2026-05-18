import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import env from "../config/env.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000,
};

export const login = asyncHandler(async (req, res) => {
  const { armyNumber, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { armyNumber: armyNumber.toUpperCase() },
  });

  if (!user) {
    throw new ApiError(401, "Invalid army number or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account deactivated — contact your administrator");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid army number or password");
  }

  const accessToken = jwt.sign(
    { id: user.id, armyNumber: user.armyNumber, role: user.role },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRY }
  );

  const { password: _, ...loggedInUser } = user;

  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(new ApiResponse(200, { user: loggedInUser, accessToken }, "Login successful"));
});

export const logout = asyncHandler(async (_req, res) => {
  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .json(new ApiResponse(200, null, "Logged out successfully"));
});

export const getMe = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, { user: req.user }, "User profile retrieved"));
});
