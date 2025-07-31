import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from 'express';

const validatePromptGeneration = [
  body("query")
    .notEmpty()
    .withMessage("Query is required")
    .isLength({ min: 10, max: 8000 })
    .withMessage("Query must be between 10 and 8000 characters"),

  body("context")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Context must not exceed 2000 characters"),

  body("expectedOutput")
    .notEmpty()
    .withMessage("Expected output is required")
    .isLength({ min: 5, max: 8000 })
    .withMessage("Expected output must be between 5 and 8000 characters"),

  body("techniques")
    .optional()
    .isArray()
    .withMessage("Techniques must be an array")
    .custom((techniques: string[]) => {
      const validTechniques = [
        "few-shot",
        "chain-of-thought",
        "zero-shot",
        "role-based",
        "template-based",
        "iterative-refinement",
      ];

      if (
        techniques &&
        techniques.some((tech) => !validTechniques.includes(tech))
      ) {
        throw new Error("Invalid technique specified");
      }
      return true;
    }),

  body("parameters")
    .optional()
    .isObject()
    .withMessage("Parameters must be an object"),

  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }
    next();
  },
];

const validatePromptEvaluation = [
  body("prompt")
    .notEmpty()
    .withMessage("Prompt is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Prompt must be between 10 and 2000 characters"),

  body("expectedOutput").notEmpty().withMessage("Expected output is required"),

  body("actualOutput").notEmpty().withMessage("Actual output is required"),

  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }
    next();
  },
];

const validatePromptfooEvaluation = [
  body("prompts")
    .isArray({ min: 1 })
    .withMessage("At least one prompt is required"),

  body("prompts.*").notEmpty().withMessage("Each prompt must not be empty"),

  body("testCases")
    .optional()
    .isArray()
    .withMessage("Test cases must be an array"),

  body("testCases.*.description")
    .optional()
    .isString()
    .withMessage("Test case description must be a string"),

  body("testCases.*.input")
    .optional()
    .isString()
    .withMessage("Test case input must be a string"),

  body("testCases.*.expected")
    .optional()
    .isString()
    .withMessage("Expected output must be a string"),

  body("providers")
    .optional()
    .isArray()
    .withMessage("Providers must be an array"),

  body("providers.*")
    .optional()
    .isString()
    .withMessage("Provider must be a string"),

  body("evaluationCriteria")
    .optional()
    .isArray()
    .withMessage("Evaluation criteria must be an array"),

  body("evaluationCriteria.*")
    .optional()
    .isString()
    .withMessage("Criteria must be a string"),

  body("description")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),

  body("testDataFile")
    .optional()
    .isString()
    .withMessage("Test data file must be a string"),

  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(
        "Validation errors for promptfoo evaluation:",
        JSON.stringify(errors.array(), null, 2)
      );
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      res.status(400).json({
        success: false,
        errors: errors.array(),
        message: "Validation failed",
        receivedData: req.body,
      });
      return;
    }
    next();
  },
];

const validateOptimizeRequest = [
  body("originalPrompt")
    .notEmpty()
    .withMessage("Original prompt is required")
    .isLength({ min: 10, max: 10000 })
    .withMessage("Original prompt must be between 10 and 10000 characters"),

  body("failedClusters")
    .isArray({ min: 1 })
    .withMessage("At least one failed cluster is required"),

  body("failedClusters.*.reason")
    .notEmpty()
    .withMessage("Each cluster must have a reason"),

  body("failedClusters.*.failedTestCases")
    .isArray({ min: 1 })
    .withMessage("Each cluster must have at least one failed test case"),

  body("promptId")
    .optional()
    .isString()
    .withMessage("Prompt ID must be a string"),

  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
        message: "Validation failed for optimization request",
      });
      return;
    }
    next();
  },
];

export {
  validatePromptGeneration,
  validatePromptEvaluation,
  validatePromptfooEvaluation,
  validateOptimizeRequest
};
