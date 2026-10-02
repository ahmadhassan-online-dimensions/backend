export const notFound = (req, res, next) => {
    res.status(404);
    next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
    let status = res.statusCode >= 400 ? res.statusCode : 500;
    let message = err.message;

    if (err.name === "CastError") {
        status = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    } else if (err.name === "ValidationError") {
        status = 400;
        message = Object.values(err.errors).map((e) => e.message).join(", ");
    } else if (err.code === 11000) {
        status = 409;
        message = "Duplicate value: " + Object.keys(err.keyValue || {}).join(", ");
    } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        status = 401;
        message = "Not Authorized";
    } else if (err.type === "entity.parse.failed") {
        status = 400;
        message = "Invalid JSON body";
    }

    res.status(status).json({
        status: "Error",
        message
    });
};
