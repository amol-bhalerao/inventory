// Response Formatter Utility
const formatResponse = (success, message, data = null, statusCode = 200) => {
  return {
    success,
    message,
    ...(data && { data }),
    statusCode
  };
};

const sendSuccess = (res, message, data = null, statusCode = 200) => {
  res.status(statusCode).json(formatResponse(true, message, data));
};

const sendError = (res, message, statusCode = 400, data = null) => {
  res.status(statusCode).json(formatResponse(false, message, data));
};

module.exports = {
  formatResponse,
  sendSuccess,
  sendError
};
