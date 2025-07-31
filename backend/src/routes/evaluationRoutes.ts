
import multer from 'multer';
import express, { Request, Response } from 'express';

// Configure multer for file uploads with memory storage (simpler approach)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

import parseJsonDataField from "../middleware/parseJsonDataField";
import EvaluationController from '../controllers/EvaluationController';
import { validatePromptfooEvaluation } from '../middleware/validation';

const router = express.Router();
const evaluationController = new EvaluationController();

// Create and run a new evaluation

// Create and run a new evaluation
router.post('/run', upload.single("testDataFile"), parseJsonDataField, validatePromptfooEvaluation, (req: Request, res: Response) => {
  evaluationController.createEvaluation(req, res);
});

// Get evaluation results by ID
router.get("/:evaluationId", (req: Request, res: Response) => {
  evaluationController.getEvaluation(req, res);
});

// Download evaluation results file
router.get("/:evaluationId/download", (req: Request, res: Response) => {
  evaluationController.downloadEvaluation(req, res);
});

// Get evaluation status
router.get("/:evaluationId/status", (req: Request, res: Response) => {
  evaluationController.getEvaluationStatus(req, res);
});

// List all evaluations
router.get("/", (req: Request, res: Response) => {
  evaluationController.listEvaluations(req, res);
});

// Delete an evaluation
router.delete("/:evaluationId", (req: Request, res: Response) => {
  evaluationController.deleteEvaluation(req, res);
});

// Get available evaluation criteria
router.get("/meta/criteria", (req: Request, res: Response) => {
  evaluationController.getEvaluationCriteria(req, res);
});

// Get available providers
router.get("/meta/providers", (req: Request, res: Response) => {
  evaluationController.getProviders(req, res);
});

export default router;
