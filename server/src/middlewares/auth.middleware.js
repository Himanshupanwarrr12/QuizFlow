import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import env from "../config/env.js";

const verifyJWT = asyncHandler(async (req, _res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new ApiError(401, "Unauthorized — no token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Token has expired, please login again");
    }
    throw new ApiError(401, "Invalid access token");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user) {
    throw new ApiError(401, "User not found — token invalid");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account deactivated — contact your administrator");
  }

  const { password, ...userWithoutPassword } = user;
  req.user = userWithoutPassword;
  next();
});

export default verifyJWT;
