import express, { Request, Response } from 'express';
import EvaluationController from '../controllers/EvaluationController.js';
import { validatePromptfooEvaluation } from '../middleware/validation.js';

const router = express.Router();
const evaluationController = new EvaluationController();

// Create and run a new evaluation
router.post('/run', validatePromptfooEvaluation, (req: Request, res: Response) => {
  evaluationController.createEvaluation(req, res);
});

// Get evaluation results by ID
router.get('/:evaluationId', (req, res) => {
  evaluationController.getEvaluation(req, res);
});

// Download evaluation results file
router.get('/:evaluationId/download', (req, res) => {
  evaluationController.downloadEvaluation(req, res);
});

// Get evaluation status
router.get('/:evaluationId/status', (req, res) => {
  evaluationController.getEvaluationStatus(req, res);
});

// List all evaluations
router.get('/', (req, res) => {
  evaluationController.listEvaluations(req, res);
});

// Delete an evaluation
router.delete('/:evaluationId', (req, res) => {
  evaluationController.deleteEvaluation(req, res);
});

// Get available evaluation criteria
router.get('/meta/criteria', (req, res) => {
  evaluationController.getEvaluationCriteria(req, res);
});

// Get available providers
router.get('/meta/providers', (req, res) => {
  evaluationController.getProviders(req, res);
});

export default router;
