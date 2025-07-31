require('dotenv').config();
const ErrorClusteringService = require('./src/services/ErrorClusteringService');

// Mock evaluation results with failed tests
const mockEvaluationResults = {
  summary: {
    totalTests: 8,
    passedTests: 3,
    failedTests: 5,
    averageScore: 4.2,
    totalScore: 33.6
  },
  results: [
    {
      id: 'test-1',
      prompt: 'What is the capital of France?',
      response: 'I think it might be Lyon.',
      score: 2,
      passed: false,
      error: 'Incorrect factual answer. Paris is the correct capital of France.',
      gradingResult: { 
        pass: false, 
        score: 2, 
        reason: 'The response provided an incorrect answer. Paris is the capital of France, not Lyon.' 
      }
    },
    {
      id: 'test-2', 
      prompt: 'What is 2 + 2?',
      response: 'The answer is 5.',
      score: 0,
      passed: false,
      error: 'Mathematical calculation error',
      gradingResult: { 
        pass: false, 
        score: 0, 
        reason: 'Basic arithmetic error. 2 + 2 equals 4, not 5.' 
      }
    },
    {
      id: 'test-3',
      prompt: 'What is the largest planet in our solar system?',
      response: 'Earth is the biggest planet.',
      score: 1,
      passed: false,
      error: 'Incorrect astronomical fact',
      gradingResult: { 
        pass: false, 
        score: 1, 
        reason: 'Factual error. Jupiter is the largest planet in our solar system, not Earth.' 
      }
    },
    {
      id: 'test-4',
      prompt: 'Calculate 10 * 3',
      response: '10 * 3 = 35',
      score: 0,
      passed: false,
      error: 'Multiplication error',
      gradingResult: { 
        pass: false, 
        score: 0, 
        reason: 'Arithmetic mistake. 10 * 3 equals 30, not 35.' 
      }
    },
    {
      id: 'test-5',
      prompt: 'What is the chemical symbol for water?',
      response: 'The symbol is HO2.',
      score: 2,
      passed: false,
      error: 'Chemistry knowledge error',
      gradingResult: { 
        pass: false, 
        score: 2, 
        reason: 'Chemical formula error. Water is H2O, not HO2.' 
      }
    }
  ],
  metadata: {
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
};

async function testErrorClustering() {
  try {
    console.log('🚀 Testing Error Clustering Service...\n');
    
    const clusteringService = new ErrorClusteringService();
    
    console.log('📊 Input: 5 failed test cases');
    console.log('   - 2 arithmetic errors (2+2=5, 10*3=35)');
    console.log('   - 2 factual knowledge errors (France capital, largest planet)');
    console.log('   - 1 chemistry error (water formula)\n');
    
    console.log('⏳ Running clustering analysis...');
    const results = await clusteringService.clusterFailedTests(mockEvaluationResults);
    
    console.log('\n✅ Clustering Results:');
    console.log(`   Total Failed Tests: ${results.summary.totalFailed}`);
    console.log(`   Clusters Found: ${results.summary.clustersFound}`);
    console.log(`   Average Cluster Size: ${results.summary.avgClusterSize}\n`);
    
    console.log('🔍 Clusters Detail:');
    results.clusters.forEach((cluster, index) => {
      console.log(`\n📁 Cluster ${index + 1}: ${cluster.category.name}`);
      console.log(`   Description: ${cluster.category.description}`);
      console.log(`   Size: ${cluster.size} tests`);
      console.log(`   Similarity: ${(cluster.avgSimilarity * 100).toFixed(1)}%`);
      console.log(`   Representative Error: ${cluster.representativeError}`);
      
      if (cluster.category.commonPatterns.length > 0) {
        console.log(`   Common Patterns:`);
        cluster.category.commonPatterns.forEach(pattern => {
          console.log(`     • ${pattern}`);
        });
      }
      
      if (cluster.category.suggestions.length > 0) {
        console.log(`   Suggestions:`);
        cluster.category.suggestions.forEach(suggestion => {
          console.log(`     ✓ ${suggestion}`);
        });
      }
      
      console.log(`   Test IDs in cluster: ${cluster.tests.map(t => t.id).join(', ')}`);
    });
    
    console.log(`\n💡 AI Insights: ${results.insights}`);
    
    console.log('\n🎉 Error Clustering Test Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Error Clustering Test Failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testErrorClustering();
