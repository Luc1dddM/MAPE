function parseJsonDataField(req, res, next) {
  if (req.body && typeof req.body.data === "string") {
    try {
      const json = JSON.parse(req.body.data);
      Object.assign(req.body, json);
      delete req.body.data;
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON in 'data' field",
        error: e.message,
      });
    }
  }
  next();
}

module.exports = parseJsonDataField;
