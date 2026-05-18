import ApiError from "../utils/ApiError.js";

/**
 * Global error-handling middleware.
 * Express recognises this as an error handler because it has 4 parameters.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  // If it's our custom ApiError, use its values
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
      success: false,
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      statusCode: 400,
      message: "Validation failed",
      errors,
      success: false,
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      statusCode: 409,
      message: `Duplicate value for field: ${field}`,
      errors: [`${field} '${err.keyValue[field]}' already exists`],
      success: false,
    });
  }

  // Mongoose cast error (bad ObjectId etc.)
  if (err.name === "CastError") {
    return res.status(400).json({
      statusCode: 400,
      message: `Invalid ${err.path}: ${err.value}`,
      errors: [],
      success: false,
    });
  }

  // Fallback — unknown server error
  console.error("🔴 Unhandled Error:", err);
  return res.status(500).json({
    statusCode: 500,
    message: "Internal server error",
    errors: [],
    success: false,
  });
};

export default errorHandler;
