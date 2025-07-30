const express = require("express");
const EvaluationController = require("../controllers/EvaluationController");
const { validatePromptfooEvaluation } = require("../middleware/validation");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const router = express.Router();
const evaluationController = new EvaluationController();

// Create and run a new evaluation
router.post(
  "/run",
  validatePromptfooEvaluation,
  upload.single("testDataFile"),
  (req, res) => {
    evaluationController.createEvaluation(req, res);
  },
);

// Get evaluation results by ID
router.get("/:evaluationId", (req, res) => {
  evaluationController.getEvaluation(req, res);
});

// Download evaluation results file
router.get("/:evaluationId/download", (req, res) => {
  evaluationController.downloadEvaluation(req, res);
});

// Get evaluation status
router.get("/:evaluationId/status", (req, res) => {
  evaluationController.getEvaluationStatus(req, res);
});

// List all evaluations
router.get("/", (req, res) => {
  evaluationController.listEvaluations(req, res);
});

// Delete an evaluation
router.delete("/:evaluationId", (req, res) => {
  evaluationController.deleteEvaluation(req, res);
});

// Get available evaluation criteria
router.get("/meta/criteria", (req, res) => {
  evaluationController.getEvaluationCriteria(req, res);
});

// Get available providers
router.get("/meta/providers", (req, res) => {
  evaluationController.getProviders(req, res);
});

module.exports = router;
