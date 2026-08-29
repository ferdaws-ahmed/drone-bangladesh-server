/**
 * DRY response helpers for Express route handlers.
 * Keeps controller code clean and responses standardized.
 */

const ok = (res, data = null, message = 'Success', statusCode = 200) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

const created = (res, data = null, message = 'Resource created successfully.') => {
  return ok(res, data, message, 201);
};

const fail = (res, message = 'Bad Request', statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};

const notFound = (res, message = 'Resource not found.') => fail(res, message, 404);
const unauthorized = (res, message = 'Unauthorized.') => fail(res, message, 401);
const forbidden = (res, message = 'Access denied.') => fail(res, message, 403);
const conflict = (res, message = 'Resource already exists.') => fail(res, message, 409);
const serverError = (res, error = null) => {
  if (error && process.env.NODE_ENV !== 'production') {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
  return res.status(500).json({ success: false, message: 'Internal Server Error' });
};

module.exports = { ok, created, fail, notFound, unauthorized, forbidden, conflict, serverError };
