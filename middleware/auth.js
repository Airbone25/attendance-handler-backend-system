const { verifyToken } = require("../utils/jwt");

const authMiddleware = (req, res, next) => {
  let token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized, token missing or invalid",
    });
  }

  if (token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  try {
    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized, token missing or invalid",
    });
  }
};

module.exports = authMiddleware;
