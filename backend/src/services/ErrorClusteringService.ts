import { GoogleGenerativeAI } from "@google/generative-ai";
import { kmeans } from "ml-kmeans";
import logger from "../utils/logger.js";
import dotenv from "dotenv";
dotenv.config();

import {
  ClusterResult,
  EmbeddingData,
  ErrorCluster,
  ErrorCategory,
  KMeansResult,
  EvaluationResult,
} from "../types/evaluation.js";

class ErrorClusteringService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env?.["GEMINI_API_KEY"]) {
      throw new Error("GEMINI_API_KEY is required for error clustering");
    }
    this.genAI = new GoogleGenerativeAI(process.env?.["GEMINI_API_KEY"]);
    this.model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
  }

  /**
   * Generate embedding for a text using Google's embedding model
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.model.embedContent(text);
      return result.embedding?.values || [];
    } catch (error) {
      logger.error("Error generating embedding:", error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += (vecA[i] || 0) * (vecB[i] || 0);
      normA += (vecA[i] || 0) * (vecA[i] || 0);
      normB += (vecB[i] || 0) * (vecB[i] || 0);
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
  euclideanDistance(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same length");
    }

    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
      sum += Math.pow((vecA[i] || 0) - (vecB[i] || 0), 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Calculate intra-cluster similarity
   */
  private calculateIntraClusterSimilarity(
    cluster: number[],
    embeddings: EmbeddingData[],
  ): number {
    if (cluster.length <= 1) return 1.0;

    let totalSimilarity = 0;
    let pairs = 0;

    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        const index1 = cluster[i];
        const index2 = cluster[j];
        if (index1 !== undefined && index2 !== undefined) {
          const embedding1 = embeddings[index1]?.embedding;
          const embedding2 = embeddings[index2]?.embedding;
          if (embedding1 && embedding2) {
            const similarity = this.cosineSimilarity(embedding1, embedding2);
            totalSimilarity += similarity;
            pairs++;
          }
        }
      }
    }

    return pairs > 0 ? Math.round((totalSimilarity / pairs) * 100) / 100 : 0;
  }

  /**
   * K-means clustering using ml-kmeans library
   */
  async performKmeansClustering(
    embeddings: EmbeddingData[],
    k: number = 3,
  ): Promise<KMeansResult> {
    try {
      if (embeddings.length === 0) {
        return { clusters: [], centroids: [], labels: [] };
      }

      if (k >= embeddings.length) {
        // If k is greater than or equal to data points, each point is its own cluster
        return {
          clusters: embeddings.map((_, index) => [index]),
          centroids: embeddings.map((item: EmbeddingData) => item.embedding),
          labels: embeddings.map((_, index) => index),
        };
      }

      // Extract embedding vectors for ml-kmeans
      const vectors = embeddings.map((item: EmbeddingData) => item.embedding);

      // Perform K-means clustering
      const result = kmeans(vectors, k, {
        initialization: "random",
        maxIterations: 100,
        tolerance: 1e-4,
      });

      // Group point indices by cluster
      const clusters: number[][] = new Array(k).fill(null).map(() => []);
      result.clusters.forEach((clusterIndex: number, pointIndex: number) => {
        if (clusters[clusterIndex]) {
          clusters[clusterIndex].push(pointIndex);
        }
      });

      logger.info(`K-means clustering completed with ${k} clusters`);
      logger.info(
        `Iterations: ${result.iterations}, Converged: ${result.converged}`,
      );

      return {
        clusters: clusters,
        centroids: result.centroids,
        labels: result.clusters,
      };
    } catch (error) {
      logger.error("Error in K-means clustering:", error);
      throw error;
    }
  }

  /**
   * Analyze and categorize error patterns
   */
  async analyzeErrorPatterns(errorTexts: string[]): Promise<any> {
    try {
      if (errorTexts.length === 0) {
        return {
          categories: [],
          insights: "No errors to analyze",
        };
      }

      // Use Google Gemini to analyze error patterns
      const analysisModel = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
      });

      const prompt = `
Analyze the following error messages and categorize them into meaningful groups.
Provide insights about common error patterns, root causes, and suggestions for improvement.

Error messages:
${errorTexts.map((text, index) => `${index + 1}. ${text}`).join("\n")}

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
        logger.warn("Failed to parse AI response as JSON, using fallback");
      }

      // Fallback: return structured response
      return {
        categories: [
          {
            name: "General Errors",
            description: "Various error types detected",
            errorIndices: Array.from(
              { length: errorTexts.length },
              (_, i) => i,
            ),
            commonPatterns: ["Mixed error patterns"],
            suggestions: ["Review individual errors for specific improvements"],
          },
        ],
        insights: response,
      };
    } catch (error: any) {
      logger.error("Error analyzing error patterns:", error);
      throw error;
    }
  }

  /**
   * Main function to cluster failed test cases
   */
  async clusterFailedTests(failedResults: any): Promise<any> {
    try {
      // Add input validation
      if (!failedResults || !Array.isArray(failedResults)) {
        logger.warn(
          "Invalid failedResults input, expected array but got:",
          typeof failedResults,
        );
        return {
          promptClusters: [],
          summary: {
            totalFailed: 0,
            totalPrompts: 0,
            analysisTime: new Date().toISOString(),
          },
          insights: "Invalid input data for clustering",
        };
      }

      if (failedResults.length === 0) {
        return {
          promptClusters: [],
          summary: {
            totalFailed: 0,
            totalPrompts: 0,
            analysisTime: new Date().toISOString(),
          },
          insights: "No failed tests to cluster",
        };
      }

      logger.info(`Clustering ${failedResults.length} failed test cases`);

      // Group failed results by prompt
      const groupedByPrompt = new Map<string, any[]>();

      failedResults.forEach((test: any) => {
        const promptText = test.prompt || "No prompt";
        console.log(`Processing prompt: ${promptText}`);
        if (!groupedByPrompt.has(promptText)) {
          groupedByPrompt.set(promptText, []);
        }
        groupedByPrompt.get(promptText)!.push(test);
      });

      logger.info(`Found ${groupedByPrompt.size} unique prompts`);

      // Process each prompt group separately
      const promptClusters: any[] = [];

      for (const [prompt, promptFailedTests] of groupedByPrompt) {
        logger.info(
          `Processing prompt with ${promptFailedTests.length} failed tests`,
        );

        if (promptFailedTests.length === 1) {
          // Single test case, no clustering needed
          promptClusters.push({
            prompt: prompt,
            totalFailedTests: 1,
            clusters: [
              {
                id: 0,
                size: 1,
                tests: [
                  {
                    ...promptFailedTests[0],
                    errorText: promptFailedTests[0].reason || "Unknown error",
                    similarity: 1.0,
                  },
                ],
                representativeError:
                  promptFailedTests[0].reason || "Unknown error",
                avgSimilarity: 1.0,
                category: {
                  name: "Single Error",
                  description: "Single failed test case",
                  commonPatterns: [],
                  suggestions: [],
                },
              },
            ],
            summary: {
              clustersFound: 1,
              avgClusterSize: 1,
            },
            insights: "Single test case - no clustering performed",
          });
          continue;
        }

        // Prepare error texts for embedding for this prompt
        const errorTexts = promptFailedTests.map((test: any) => {
          const errorText = test.reason ?? "Unknown error";
          const responseText = test.response ?? "No response";
          // Combine error and response for clustering (prompt is same for all in this group)
          return `Error: ${errorText}\nResponse: ${responseText}`;
        });

        // Generate embeddings for all error texts in this prompt group
        const embeddings: EmbeddingData[] = [];
        for (let i = 0; i < errorTexts.length; i++) {
          logger.info(
            `Generating embedding ${i + 1}/${errorTexts.length} for prompt group`,
          );
          const embedding = await this.generateEmbedding(
            errorTexts[i] ?? "Error: Unknown  \nResponse: No response",
          );
          embeddings.push({
            index: i,
            embedding: embedding,
            text: errorTexts[i] ?? "Error: Unknown  \nResponse: No response",
            originalTest: promptFailedTests[i],
          });
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Determine optimal number of clusters for this prompt group
        const maxClusters = Math.min(
          5,
          Math.max(2, Math.ceil(promptFailedTests.length / 3)),
        );
        const optimalK =
          promptFailedTests.length >= 6
            ? maxClusters
            : Math.min(3, promptFailedTests.length);

        // Perform K-means clustering for this prompt group
        const clusteringResult = await this.performKmeansClustering(
          embeddings,
          optimalK,
        );

        // Analyze error patterns using AI for this prompt group
        const errorAnalysis = await this.analyzeErrorPatterns(
          errorTexts
            .filter((text: any) => text && typeof text === "string") // Filter out invalid texts
            .map((text: any) => text.split("\n")[0].replace("Error: ", "")),
        );

        // Format clusters with detailed information for this prompt group
        const formattedClusters: ErrorCluster[] = clusteringResult.clusters.map(
          (cluster: number[], clusterIndex: number) => {
            const clusterTests = cluster
              .map((index: number) => {
                if (
                  index >= promptFailedTests.length ||
                  index >= errorTexts.length
                ) {
                  logger.warn(
                    `Invalid index ${index} for cluster ${clusterIndex}, max length: ${Math.min(promptFailedTests.length, errorTexts.length)}`,
                  );
                  return null;
                }

                const errorText = errorTexts[index];
                if (!errorText) {
                  logger.warn(`Empty errorText at index ${index}`);
                  return null;
                }

                return {
                  ...promptFailedTests[index],
                  errorText:
                    errorText.split("\n")[0]?.replace("Error: ", "") || "",
                  similarity: this.calculateIntraClusterSimilarity(
                    cluster,
                    embeddings,
                  ),
                };
              })
              .filter((test: any) => test !== null); // Remove null entries

            // Find the most representative error in this cluster
            const centroid = clusteringResult.centroids?.[clusterIndex];
            let mostRepresentative = cluster[0];
            let minDistance = Infinity;

            cluster.forEach((index: number) => {
              if (index < embeddings.length) {
                const embedding = embeddings[index]?.embedding;
                if (embedding && centroid) {
                  const distance = this.euclideanDistance(embedding, centroid);
                  if (distance < minDistance) {
                    minDistance = distance;
                    mostRepresentative = index;
                  }
                }
              }
            });

            // Safely get representative error
            const representativeErrorText =
              mostRepresentative !== undefined
                ? errorTexts[mostRepresentative]
                : undefined;
            const representativeError = representativeErrorText
              ? representativeErrorText
                  .split("\n")[0]
                  ?.replace("Error: ", "") || "Unknown error"
              : "Unknown error";

            return {
              id: clusterIndex,
              size: cluster.length,
              tests: clusterTests,
              representativeError: representativeError,
              avgSimilarity: this.calculateIntraClusterSimilarity(
                cluster,
                embeddings,
              ),
              category: errorAnalysis.categories?.find((cat: ErrorCategory) =>
                cat.errorIndices?.some((idx: number) => cluster.includes(idx)),
              ) || {
                name: `Cluster ${clusterIndex + 1}`,
                description: "Grouped errors with similar patterns",
                commonPatterns: [],
                suggestions: [],
              },
            };
          },
        );

        // Add this prompt's clustering results to the final output
        promptClusters.push({
          prompt: prompt,
          totalFailedTests: promptFailedTests.length,
          clusters: formattedClusters,
          summary: {
            clustersFound: formattedClusters.length,
            avgClusterSize:
              Math.round(
                (promptFailedTests.length / formattedClusters.length) * 10,
              ) / 10,
          },
          insights: errorAnalysis.insights,
          errorAnalysis: errorAnalysis,
        });
      }

      return {
        promptClusters: promptClusters,
        summary: {
          totalFailed: failedResults.length,
          totalPrompts: groupedByPrompt.size,
          analysisTime: new Date().toISOString(),
        },
        insights: `Analyzed ${failedResults.length} failed tests across ${groupedByPrompt.size} unique prompts`,
      };
    } catch (error: any) {
      logger.error("Error clustering failed tests:", error);
      throw error;
    }
  }
}

export default ErrorClusteringService;
