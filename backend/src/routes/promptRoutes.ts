import express, { Request, Response } from "express";
import PromptController from "../controllers/PromptController.js";
import {
  validatePromptGeneration,
  validatePromptEvaluation,
} from "../middleware/validation.js";

const router = express.Router();
const promptController = new PromptController();

// Generate prompts using different techniques
router.post(
  "/generate",
  validatePromptGeneration,
  (req: Request, res: Response) => {
    promptController.generatePrompts(req, res);
  },
);

// Get available prompt engineering techniques
router.get("/techniques", (req, res) => {
  promptController.getTechniques(req, res);
});

// Evaluate prompt effectiveness
router.post(
  "/evaluate",
  validatePromptEvaluation,
  (req: Request, res: Response) => {
    promptController.evaluatePrompt(req, res);
  },
);

// Test a generated prompt with specific input
router.post("/test", (req, res) => {
  promptController.testPrompt(req, res);
});

// Generate variations of a single prompt
router.post("/variations", (req, res) => {
  promptController.generateVariations(req, res);
});

// Optimize an existing prompt
router.post("/optimize", (req, res) => {
  promptController.optimizePrompt(req, res);
});

export default router;
