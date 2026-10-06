class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
  static badRequest(msg, details) { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'Not authenticated') { return new ApiError(401, msg); }
  static forbidden(msg = 'You do not have access to this resource') { return new ApiError(403, msg); }
  static notFound(what = 'Resource') { return new ApiError(404, `${what} not found`); }
  static conflict(msg) { return new ApiError(409, msg); }
}
module.exports = ApiError;
