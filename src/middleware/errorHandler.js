
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error('API error occurred', {
        message: err.message,
        method: req.method,
        path: req.originalUrl,
        statusCode: err.statusCode || 500
    });

    const statusCode = err.statusCode || 500;

    if (statusCode === 500) {
        return res.status(500).json({
            success: false,
            message: 'An unexpected error occurred. Please try again later.'
        });
    }

    return res.status(statusCode).json({
        success: false,
        message: err.message || 'An error occurred.'
    });
};

module.exports = errorHandler;
