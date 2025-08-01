const { GoogleGenerativeAI } = require('@google/generative-ai');
const { kmeans } = require('ml-kmeans');
const logger = require('../utils/logger');

class ErrorClusteringService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is required for error clustering');
        }
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    }

    /**
     * Generate embedding for a text using Google's embedding model
     */
    async generateEmbedding(text) {
        try {
            const result = await this.model.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            logger.error('Error generating embedding:', error);
            throw error;
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    /**
     * Calculate Euclidean distance between two vectors
     */
    euclideanDistance(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }

        let sum = 0;
        for (let i = 0; i < vecA.length; i++) {
            sum += Math.pow(vecA[i] - vecB[i], 2);
        }
        return Math.sqrt(sum);
    }

    /**
     * K-means clustering using ml-kmeans library
     */
    async performKmeansClustering(embeddings, k = 3) {
        try {
            if (embeddings.length === 0) {
                return { clusters: [], centroids: [], labels: [] };
            }

            if (k >= embeddings.length) {
                // If k is greater than or equal to data points, each point is its own cluster
                return {
                    clusters: embeddings.map((_, index) => [index]),
                    centroids: embeddings.map(item => item.embedding),
                    labels: embeddings.map((_, index) => index)
                };
            }

            // Extract embedding vectors for ml-kmeans
            const vectors = embeddings.map(item => item.embedding);
            
            // Perform K-means clustering
            const result = kmeans(vectors, k, {
                initialization: 'random',
                maxIterations: 100,
                tolerance: 1e-4
            });

            // Group point indices by cluster
            const clusters = new Array(k).fill(null).map(() => []);
            result.clusters.forEach((clusterIndex, pointIndex) => {
                clusters[clusterIndex].push(pointIndex);
            });

            logger.info(`K-means clustering completed with ${k} clusters`);
            logger.info(`Iterations: ${result.iterations}, Converged: ${result.converged}`);

            return {
                clusters: clusters,
                centroids: result.centroids,
                labels: result.clusters
            };

        } catch (error) {
            logger.error('Error in K-means clustering:', error);
            throw error;
        }
    }

    /**
     * Analyze and categorize error patterns
     */
    async analyzeErrorPatterns(errorTexts) {
        try {
            if (errorTexts.length === 0) {
                return {
                    categories: [],
                    insights: "No errors to analyze"
                };
            }

            // Use Google Gemini to analyze error patterns
            const analysisModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
            
            const prompt = `
Analyze the following error messages and categorize them into meaningful groups. 
Provide insights about common error patterns, root causes, and suggestions for improvement.

Error messages:
${errorTexts.map((text, index) => `${index + 1}. ${text}`).join('\n')}

Please provide:
1. Main categories of errors (2-5 categories)
2. Brief description of each category
3. Which error numbers belong to each category
4. Common patterns or root causes
5. Suggestions for improvement

Format your response as JSON:
{
  "categories": [
    {
      "name": "Category Name",
      "description": "Brief description",
      "errorIndices": [0, 1, 2],
      "commonPatterns": ["pattern1", "pattern2"],
      "suggestions": ["suggestion1", "suggestion2"]
    }
  ],
  "insights": "Overall insights about the error patterns"
}
`;

            const result = await analysisModel.generateContent(prompt);
            const response = result.response.text();
            
            try {
                // Try to parse JSON response
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (parseError) {
                logger.warn('Failed to parse AI response as JSON, using fallback');
            }

            // Fallback: return structured response
            return {
                categories: [{
                    name: "General Errors",
                    description: "Various error types detected",
                    errorIndices: Array.from({ length: errorTexts.length }, (_, i) => i),
                    commonPatterns: ["Mixed error patterns"],
                    suggestions: ["Review individual errors for specific improvements"]
                }],
                insights: response
            };

        } catch (error) {
            logger.error('Error analyzing error patterns:', error);
            throw error;
        }
    }

    /**
     * Main function to cluster failed test cases
     */
    async clusterFailedTests(evaluationResults) {
        try {
            // Filter failed test cases
            const failedTests = evaluationResults.results.filter(result => 
                !result.passed && (result.error || result.gradingResult?.reason)
            );

            if (failedTests.length === 0) {
                return {
                    clusters: [],
                    summary: {
                        totalFailed: 0,
                        clustersFound: 0,
                        analysisTime: new Date().toISOString()
                    },
                    insights: "No failed tests to cluster"
                };
            }

            logger.info(`Clustering ${failedTests.length} failed test cases`);

            // Prepare error texts for embedding
            const errorTexts = failedTests.map(test => {
                const errorText = test.error || test.gradingResult?.reason || 'Unknown error';
                const promptText = test.prompt || 'No prompt';
                const responseText = test.response || 'No response';
                
                // Combine error, prompt, and response for better clustering
                return `Error: ${errorText}\nPrompt: ${promptText}\nResponse: ${responseText}`;
            });

            // Generate embeddings for all error texts
            const embeddings = [];
            for (let i = 0; i < errorTexts.length; i++) {
                logger.info(`Generating embedding ${i + 1}/${errorTexts.length}`);
                const embedding = await this.generateEmbedding(errorTexts[i]);
                embeddings.push({
                    index: i,
                    embedding: embedding,
                    text: errorTexts[i],
                    originalTest: failedTests[i]
                });
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Determine optimal number of clusters (between 2 and min(5, failedTests.length))
            const maxClusters = Math.min(5, Math.max(2, Math.ceil(failedTests.length / 3)));
            const optimalK = failedTests.length >= 6 ? maxClusters : Math.min(3, failedTests.length);

            // Perform K-means clustering
            const clusteringResult = await this.performKmeansClustering(embeddings, optimalK);

            // Analyze error patterns using AI
            const errorAnalysis = await this.analyzeErrorPatterns(
                errorTexts
                    .filter(text => text && typeof text === 'string') // Filter out invalid texts
                    .map(text => text.split('\n')[0].replace('Error: ', ''))
            );

            // Format clusters with detailed information
            const formattedClusters = clusteringResult.clusters.map((cluster, clusterIndex) => {
                const clusterTests = cluster.map(index => {
                    if (index >= failedTests.length || index >= errorTexts.length) {
                        logger.warn(`Invalid index ${index} for cluster ${clusterIndex}, max length: ${Math.min(failedTests.length, errorTexts.length)}`);
                        return null;
                    }
                    
                    const errorText = errorTexts[index];
                    if (!errorText) {
                        logger.warn(`Empty errorText at index ${index}`);
                        return null;
                    }

                    return {
                        ...failedTests[index],
                        errorText: errorText.split('\n')[0].replace('Error: ', ''),
                        similarity: this.calculateIntraClusterSimilarity(cluster, embeddings)
                    };
                }).filter(test => test !== null); // Remove null entries

                // Find the most representative error in this cluster
                const centroid = clusteringResult.centroids[clusterIndex];
                let mostRepresentative = cluster[0];
                let minDistance = Infinity;

                cluster.forEach(index => {
                    if (index < embeddings.length) {
                        const distance = this.euclideanDistance(embeddings[index].embedding, centroid);
                        if (distance < minDistance) {
                            minDistance = distance;
                            mostRepresentative = index;
                        }
                    }
                });

                // Safely get representative error
                const representativeErrorText = errorTexts[mostRepresentative];
                const representativeError = representativeErrorText 
                    ? representativeErrorText.split('\n')[0].replace('Error: ', '')
                    : 'Unknown error';

                return {
                    id: clusterIndex,
                    size: cluster.length,
                    tests: clusterTests,
                    representativeError: representativeError,
                    avgSimilarity: this.calculateIntraClusterSimilarity(cluster, embeddings),
                    category: errorAnalysis.categories.find(cat => 
                        cat.errorIndices.some(idx => cluster.includes(idx))
                    ) || {
                        name: `Cluster ${clusterIndex + 1}`,
                        description: "Grouped errors with similar patterns",
                        commonPatterns: [],
                        suggestions: []
                    }
                };
            });

            return {
                clusters: formattedClusters,
                summary: {
                    totalFailed: failedTests.length,
                    clustersFound: formattedClusters.length,
                    analysisTime: new Date().toISOString(),
                    avgClusterSize: Math.round(failedTests.length / formattedClusters.length * 10) / 10
                },
                insights: errorAnalysis.insights,
                errorAnalysis: errorAnalysis
            };

        } catch (error) {
            logger.error('Error clustering failed tests:', error);
            throw error;
        }
    }

    /**
     * Calculate intra-cluster similarity
     */
    calculateIntraClusterSimilarity(cluster, embeddings) {
        if (cluster.length <= 1) return 1.0;

        let totalSimilarity = 0;
        let pairs = 0;

        for (let i = 0; i < cluster.length; i++) {
            for (let j = i + 1; j < cluster.length; j++) {
                const similarity = this.cosineSimilarity(
                    embeddings[cluster[i]].embedding,
                    embeddings[cluster[j]].embedding
                );
                totalSimilarity += similarity;
                pairs++;
            }
        }

        return pairs > 0 ? Math.round((totalSimilarity / pairs) * 100) / 100 : 0;
    }
}

module.exports = ErrorClusteringService;
