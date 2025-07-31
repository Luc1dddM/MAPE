import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  success: boolean;
  message: string;
  error: string;
}

function parseJsonDataField(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body.data === "string") {
    try {
      const json = JSON.parse(req.body.data);
      Object.assign(req.body, json);
      delete req.body.data;
    } catch (e) {
      res.status(400).json({
        success: false,
        message: "Invalid JSON in 'data' field",
        error: (e as Error).message,
      } as ErrorResponse);
      return;
    }
  }
  next();
}

export default parseJsonDataField;
