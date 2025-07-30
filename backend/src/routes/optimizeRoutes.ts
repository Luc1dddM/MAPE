import express, { Request, Response } from 'express';
import OptimizeController from '../controllers/OptimizeController.js';
import { validateOptimizeRequest } from '../middleware/validation.js';

const router = express.Router();
const optimizeController = new OptimizeController();

// Optimize a prompt based on failed test clusters
router.post('/prompt', validateOptimizeRequest, (req: Request, res: Response) => {
  optimizeController.optimizePrompt(req, res);
});

// Analyze failed test clusters for optimization insights
router.post('/analyze', (req: Request, res: Response) => {
  optimizeController.analyzeFailures(req, res);
});

// Get optimization history for a specific prompt
router.get('/history/:promptId', (req: Request, res: Response) => {
  optimizeController.getOptimizationHistory(req, res);
});

// Compare original vs optimized prompt performance
router.post('/compare', (req: Request, res: Response) => {
  optimizeController.comparePrompts(req, res);
});

// Get optimization suggestions without full optimization
router.post('/suggestions', (req: Request, res: Response) => {
  optimizeController.getOptimizationSuggestions(req, res);
});

// Batch optimize multiple prompts
router.post('/batch', (req: Request, res: Response) => {
  optimizeController.batchOptimize(req, res);
});

export default router;