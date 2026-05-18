import ApiError from "../utils/ApiError.js";

/**
 * Factory middleware — returns a middleware that checks if the
 * authenticated user's role is in the allowed list.
 *
 * @param  {...string} allowedRoles
 * @returns {Function} Express middleware
 */
const requireRole = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied — requires one of: ${allowedRoles.join(", ")}`
      );
    }

    next();
  };
};

export default requireRole;
