import dotenv from 'dotenv';
dotenv.config();

console.log('Testing ES module imports...');
console.log('GEMINI_API_KEY available:', !!process.env.GEMINI_API_KEY);

try {
  console.log('Importing GoogleAIService...');
  const { default: GoogleAIService } = await import('./src/services/GoogleAIService.js');
  console.log('✓ GoogleAIService imported successfully');

  console.log('Importing ErrorClusteringService...');
  const { default: ErrorClusteringService } = await import('./src/services/ErrorClusteringService.js');
  console.log('✓ ErrorClusteringService imported successfully');

  console.log('Importing PromptfooEvaluationService...');
  const { default: PromptfooEvaluationService } = await import('./src/services/PromptfooEvaluationService.js');
  console.log('✓ PromptfooEvaluationService imported successfully');

  console.log('Importing PromptEngineeringService...');
  const { default: PromptEngineeringService } = await import('./src/services/PromptEngineeringService.js');
  console.log('✓ PromptEngineeringService imported successfully');

  console.log('Importing OptimizePromptService...');
  const { default: OptimizePromptService } = await import('./src/services/OptimizePromptService.js');
  console.log('✓ OptimizePromptService imported successfully');

  console.log('\n🎉 All services imported successfully!');

  // Test service instantiation
  console.log('\nTesting service instantiation...');

  const googleAI = new GoogleAIService();
  console.log('✓ GoogleAIService instantiated successfully');

  const errorClustering = new ErrorClusteringService();
  console.log('✓ ErrorClusteringService instantiated successfully');

  const promptfooEval = new PromptfooEvaluationService();
  console.log('✓ PromptfooEvaluationService instantiated successfully');

  const promptEngineering = new PromptEngineeringService();
  console.log('✓ PromptEngineeringService instantiated successfully');

  console.log('\n🚀 All services instantiated successfully!');

} catch (error) {
  console.error('❌ Import/instantiation failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
