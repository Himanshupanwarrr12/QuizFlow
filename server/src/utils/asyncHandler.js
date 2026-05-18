/**
 * Wraps an async express handler so thrown errors are forwarded to
 * the global error middleware instead of crashing the server.
 *
 * @param {Function} fn — async (req, res, next) => void
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
