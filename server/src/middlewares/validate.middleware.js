import ApiError from "../utils/ApiError.js";

/**
 * Returns an Express middleware that validates req.body against
 * the given Zod schema.
 *
 * @param {import("zod").ZodSchema} schema
 * @returns {Function} Express middleware
 */
const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    throw new ApiError(400, "Validation failed", errors);
  }

  // Replace body with the parsed (and transformed) data
  req.body = result.data;
  next();
};

export default validate;
