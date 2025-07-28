const express = require('express');
const PromptController = require('../controllers/PromptController');
const { validatePromptGeneration, validatePromptEvaluation } = require('../middleware/validation');

const router = express.Router();
const promptController = new PromptController();

// Generate prompts using different techniques
router.post('/generate', validatePromptGeneration, (req, res) => {
  promptController.generatePrompts(req, res);
});

// Get available prompt engineering techniques
router.get('/techniques', (req, res) => {
  promptController.getTechniques(req, res);
});

// Evaluate prompt effectiveness
router.post('/evaluate', validatePromptEvaluation, (req, res) => {
  promptController.evaluatePrompt(req, res);
});

// Test a generated prompt with specific input
router.post('/test', (req, res) => {
  promptController.testPrompt(req, res);
});

// Generate variations of a single prompt
router.post('/variations', (req, res) => {
  promptController.generateVariations(req, res);
});

// Optimize an existing prompt
router.post('/optimize', (req, res) => {
  promptController.optimizePrompt(req, res);
});

module.exports = router;
