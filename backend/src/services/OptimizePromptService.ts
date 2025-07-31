import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  FailedTestCase,
  FailedCluster,
  OptimizationResult,
} from "../types/index.js";

/**
 * LLM-based prompt optimizer that analyzes failed test cases and improves prompts
 */
class LLMPromptOptimizer {
  /**
   * Initialize the LLM prompt optimizer
   * @param {string} apiKey Google Generative AI API key for accessing Gemini models
   */
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
    });
  }

  /**
   * Optimize prompt based on original prompt and clusters of failed test cases
   * Returns only the optimized prompt string
   * @param {string} originalPrompt The original prompt that needs optimization
   * @param {Array} failedClusters Array of failed test case clusters with failure reasons
   * @returns {Promise<string>} Promise resolving to the optimized prompt string
   */
  async optimizePrompt(
    originalPrompt: string,
    failedClusters: any[],
  ): Promise<string> {
    try {
      const optimizationPrompt = this.buildOptimizationPrompt(
        originalPrompt,
        failedClusters,
      );

      const result = await this.model.generateContent(optimizationPrompt);
      const response = result.response.text();

      const optimizationResult = this.parseOptimizationResponse(response);
      return optimizationResult.optimizedPrompt;
    } catch (error) {
      console.error("Error optimizing prompt:", error);
      throw new Error(
        `Prompt optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Build the optimization prompt using failed clusters
   * @param {string} originalPrompt The original prompt to be optimized
   * @param {Array} failedClusters Array of failed clusters containing test cases and reasons
   * @returns {string} Complete prompt string for the LLM optimization request
   */
  buildOptimizationPrompt(
    originalPrompt: string,
    failedClusters: FailedCluster[],
  ): string {
    // Create cluster analysis
    const clusterAnalysis = this.analyzeFailedClusters(failedClusters);

    // Create detailed examples from failed clusters
    const clusterExamples = failedClusters
      .slice(0, 5)
      .map(
        (cluster, index) => `
      FAILED CLUSTER ${index + 1}:
      Cluster Failure Reason: "${cluster.reason}"
      Prompt Used: "${cluster.prompt}"
      Total Failed Test Cases: ${cluster.failedTestCases.length}

      Sample Failed Test Cases from this cluster:
      ${cluster.failedTestCases
        .slice(0, 3)
        .map(
          (tc, tcIndex) => `
        Test Case ${tcIndex + 1}:
        - Assertion Type: ${tc.assertion.type}
        - Score: ${tc.score}/10 (Failed: ${!tc.pass})
        - Failure Reason: "${tc.reason}"
        ${tc.input ? `- Input: "${tc.input}"` : ""}
        ${tc.expectedOutput ? `- Expected Output: "${tc.expectedOutput}"` : ""}
        ${tc.output ? `- Actual Output: "${tc.output.substring(0, 200)}${tc.output.length > 200 ? "..." : ""}"` : ""}
        - Token Usage: ${tc.tokensUsed.total} total tokens
      `,
        )
        .join("\n")}
      `,
      )
      .join("\n");

    return `
      You are an expert prompt engineer. Let's think step by step to analyze the original prompt and failed clusters to create an optimized prompt that fixes the identified issues.

      ## Original Prompt Analysis
      **ORIGINAL PROMPT:**
      "${originalPrompt}"

      ## Cluster Analysis Summary
      - **Total failed clusters:** ${failedClusters.length}
      - **Total failed test cases:** ${clusterAnalysis.totalFailedCases}
      - **Average score across all failures:** ${clusterAnalysis.averageScore.toFixed(2)}/10
      - **Common cluster failure patterns:** ${clusterAnalysis.clusterReasons.join(", ")}
      - **Most problematic assertion types:** ${clusterAnalysis.assertionTypes.join(", ")}

      ## Failed Clusters Detailed Analysis
      ${clusterExamples}

      ## Key Issues Identified
      Based on the cluster analysis, here are the main problems to address:
      ${clusterAnalysis.keyIssues.map((issue) => `- ${issue}`).join("\n")}

      ## Optimization Instructions

      Create an optimized prompt that addresses these specific requirements:

      1. **Address Cluster-Specific Issues:** Each cluster represents a distinct failure pattern. Your optimized prompt should specifically handle:
         ${failedClusters.map((cluster, i) => `   - Cluster ${i + 1}: ${cluster.reason}`).join("\n")}

      2. **Improve Accuracy:** Target the low scores (average: ${clusterAnalysis.averageScore.toFixed(2)}/10) by:
         - Providing clearer instructions for proper interpretation
         - Adding specific guidance to avoid the observed mistakes
         - Including validation steps or checks

      3. **Handle Edge Cases:** Based on the failed test cases, ensure the prompt can handle:
         - Metaphorical vs literal language interpretation
         - Context-dependent relevance assessment
         - Proper output formatting requirements

      4. **Maintain Consistency:** Ensure the prompt produces consistent results across similar input types

      5. **Use Best Practices:** Apply proven prompt engineering techniques:
         - Step-by-step reasoning instructions
         - Clear output format specifications
         - Examples or guidelines for edge cases
         - Explicit validation criteria

      **Return ONLY the optimized prompt as plain text in markdown format, nothing else. Do not include any JSON, explanations, or additional commentary.**

      The optimized prompt should be comprehensive, clear, and directly address all the cluster failure reasons identified above.
      `;
  }

  /**
   * Analyze failed clusters to identify patterns and generate key issues
   * @param {Array} failedClusters Array of failed clusters to analyze for patterns
   * @returns {Object} Analysis object containing statistics and identified issues
   */
  analyzeFailedClusters(failedClusters: FailedCluster[]): {
    totalFailedCases: number;
    averageScore: number;
    clusterReasons: string[];
    assertionTypes: string[];
    keyIssues: string[];
  } {
    // Flatten all failed test cases from all clusters
    const allFailedCases = failedClusters.flatMap(
      (cluster) => cluster.failedTestCases,
    );
    const totalFailedCases = allFailedCases.length;

    // Calculate average score across all failed cases
    const averageScore =
      totalFailedCases > 0
        ? allFailedCases.reduce((acc, tc) => acc + tc.score, 0) /
          totalFailedCases
        : 0;

    // Extract cluster reasons (these are provided in the new format)
    const clusterReasons = failedClusters.map((cluster) => cluster.reason);

    // Get unique assertion types
    const assertionTypes = [
      ...new Set(allFailedCases.map((tc) => tc.assertion.type)),
    ];

    // Generate key issues based on cluster reasons and test case patterns
    const keyIssues = this.generateKeyIssuesFromClusters(
      failedClusters,
      allFailedCases,
    );

    return {
      totalFailedCases,
      averageScore,
      clusterReasons,
      assertionTypes,
      keyIssues,
    };
  }

  /**
   * Generate key issues based on cluster reasons and failed test cases
   * Since analysis is provided, we focus on translating cluster reasons into actionable improvements
   * @param {Array} failedClusters Array of failed clusters containing reasons and associated test cases
   * @param {Array} allFailedCases Array of all failed test cases with scores, reasons, and assertion details
   * @returns {Array<string>} Array of actionable improvement suggestions as strings, with duplicates removed
   */
  generateKeyIssuesFromClusters(
    failedClusters: FailedCluster[],
    allFailedCases: FailedTestCase[],
  ): string[] {
    const issues: string[] = [];

    // Process each cluster reason to generate specific improvement suggestions
    failedClusters.forEach((cluster: FailedCluster, index: number) => {
      const clusterReason = cluster.reason.toLowerCase();

      // Add cluster-specific issues based on the provided reason
      if (
        clusterReason.includes("metaphorical") ||
        clusterReason.includes("literal")
      ) {
        issues.push(
          `Cluster ${index + 1}: Add explicit instructions to distinguish between metaphorical and literal language contexts`,
        );
      }

      if (
        clusterReason.includes("misunderstand") ||
        clusterReason.includes("incorrectly interpreted")
      ) {
        issues.push(
          `Cluster ${index + 1}: Improve context understanding and user intent interpretation`,
        );
      }

      if (
        clusterReason.includes("aggressive") ||
        clusterReason.includes("removing crucial context")
      ) {
        issues.push(
          `Cluster ${index + 1}: Prevent over-processing that removes important contextual information`,
        );
      }

      if (
        clusterReason.includes("format") ||
        clusterReason.includes("adherence")
      ) {
        issues.push(
          `Cluster ${index + 1}: Strengthen output format compliance and structure requirements`,
        );
      }

      if (
        clusterReason.includes("factual") ||
        clusterReason.includes("accuracy")
      ) {
        issues.push(
          `Cluster ${index + 1}: Enhance fact-checking and accuracy validation processes`,
        );
      }

      if (
        clusterReason.includes("relevant") ||
        clusterReason.includes("irrelevant")
      ) {
        issues.push(
          `Cluster ${index + 1}: Improve relevance assessment and filtering logic`,
        );
      }

      // Generic fallback for unmatched patterns
      if (!issues.some((issue) => issue.includes(`Cluster ${index + 1}`))) {
        issues.push(
          `Cluster ${index + 1}: Address specific failure pattern - ${cluster.reason.substring(0, 100)}...`,
        );
      }
    });

    // Add general issues based on overall test case patterns
    const lowScoreCases = allFailedCases.filter((tc) => tc.score <= 3);
    if (lowScoreCases.length > allFailedCases.length * 0.5) {
      issues.push(
        "Critical: Over 50% of cases have critically low scores - implement comprehensive accuracy improvements",
      );
    }

    const mediumScoreCases = allFailedCases.filter(
      (tc) => tc.score > 3 && tc.score <= 6,
    );
    if (mediumScoreCases.length > allFailedCases.length * 0.3) {
      issues.push(
        "Moderate: Significant number of cases have moderate performance issues - refine instruction clarity",
      );
    }

    // Check for common failure patterns in reasons
    const reasonTexts = allFailedCases.map((tc: FailedTestCase) =>
      tc.reason.toLowerCase(),
    );
    if (
      reasonTexts.some(
        (reason) =>
          reason.includes("does not answer") || reason.includes("ignores"),
      )
    ) {
      issues.push(
        "Ensure prompt explicitly requires direct responses to user questions",
      );
    }

    if (
      reasonTexts.some(
        (reason) => reason.includes("generic") || reason.includes("template"),
      )
    ) {
      issues.push("Add instructions to prevent generic or templated responses");
    }

    return [...new Set(issues)]; // Remove duplicates
  }

  /**
   * Parse optimization response from LLM
   * @param {string} response Raw text response from the LLM
   * @returns {Object} Structured optimization result with the optimized prompt
   */
  parseOptimizationResponse(response: string): OptimizationResult {
    // Since we're asking for plain text in markdown format, just return the response as the optimized prompt
    return {
      optimizedPrompt: response.trim(),
      improvements: [],
      reasoning: "",
      confidence: 1.0,
    };
  }
}

/**
 * Usage example demonstrating prompt optimization with failed clusters
 * @returns {Promise<string>} Promise resolving to the optimized prompt string
 */
async function optimizePromptExample() {
  const apiKey = process.env?.["GEMINI_API_KEY"] || "your-api-key-here";
  const optimizer = new LLMPromptOptimizer(apiKey);

  const originalPrompt = "Answer the user's question about energy services";

  const failedClusters = [
    {
      reason:
        "The AI's output correctly identifies `isValid` as true and `isRelevant` as false. However, the `cleanedQuery` field is an empty string, while the expected output shows the original query 'My dog hates electric bills'. Additionally, the `reason` provided by the AI is generic ('The query lacks any content expressing a literal energy service intent...'), whereas the expected reason is more specific and accurate to the likely input context ('The query mentions 'electric bills' but in a meta",
      failedTestCases: [
        {
          assertion: {
            type: "llm-rubric",
            value:
              "Evaluate the accuracy of the AI response. Consider:\n                1. Factual correctness\n                2. Proper handling of the input\n                3. Adherence to the expected format\n\n                Rate from 0-10 where:\n                - 9-10: Highly accurate response\n                - 7-8: Mostly accurate with minor issues\n                - 5-6: Somewhat accurate but notable problems\n                - 3-4: Poor accuracy with significant errors\n                ",
          },
          pass: false,
          score: 3,
          reason:
            "The AI's output correctly identifies `isValid` as true and `isRelevant` as false. However, the `cleanedQuery` field is an empty string, while the expected output shows the original query 'My dog hates electric bills'. Additionally, the `reason` provided by the AI is generic ('The query lacks any content expressing a literal energy service intent...'), whereas the expected reason is more specific and accurate to the likely input context ('The query mentions 'electric bills' but in a ",
          tokensUsed: {
            total: 1813,
            prompt: 410,
            completion: 133,
            cached: 0,
            completionDetails: {
              reasoning: 0,
              acceptedPrediction: 0,
              rejectedPrediction: 0,
            },
          },
        },
      ],
      prompt:
        "You are an expert query analysis system for energy services. Your task is to analyze user queries and determine their relevance to actual energy services provided by a utility or service provider.\n\nStrictly adhere to the following rules:\n\n1.  **Definition of Relevance:**\n    *   A query is considered **relevant** ONLY if it is a direct, literal question or statement pertaining to actual energy services, such as:\n        *   Inquiries about utility bills (e.g., understanding charge",
    },
    {
      reason:
        "The AI's response incorrectly sets `isRelevant` to `false` and provides an empty `cleanedQuery`, which directly contradicts the expected output where `isRelevant` is `true` and a specific cleaned query is provided. The `reason` field also reflects this misunderstanding of the input. While the `isValid` field is correct and the JSON format is maintained, the core purpose of identifying relevance and cleaning the query was entirely missed.",
      failedTestCases: [
        {
          assertion: {
            type: "llm-rubric",
            value:
              "Evaluate the accuracy of the AI response. Consider:\n                1. Factual correctness\n                2. Proper handling of the input\n                3. Adherence to the expected format\n\n                Rate from 0-10 where:\n                - 9-10: Highly accurate response\n                - 7-8: Mostly accurate with minor issues\n                - 5-6: Somewhat accurate but notable problems\n                - 3-4: Poor accuracy with significant errors\n                ",
          },
          pass: false,
          score: 1,
          reason:
            "The AI's response incorrectly sets `isRelevant` to `false` and provides an empty `cleanedQuery`, which directly contradicts the expected output where `isRelevant` is `true` and a specific cleaned query is provided. The `reason` field also reflects this misunderstanding of the input. While the `isValid` field is correct and the JSON format is maintained, the core purpose of identifying relevance and cleaning the query was entirely missed.",
          tokensUsed: {
            total: 1957,
            prompt: 431,
            completion: 108,
            cached: 0,
            completionDetails: {
              reasoning: 0,
              acceptedPrediction: 0,
              rejectedPrediction: 0,
            },
          },
        },
      ],
      prompt:
        "You are an expert query analysis system for energy services. Your task is to analyze user queries and determine their relevance to actual energy services provided by a utility or service provider.\n\nStrictly adhere to the following rules:\n\n1.  **Definition of Relevance:**\n    *   A query is considered **relevant** ONLY if it is a direct, literal question or statement pertaining to actual energy services, such as:\n        *   Inquiries about utility bills (e.g., understanding charge",
    },
  ];

  try {
    const optimizedPrompt = await optimizer.optimizePrompt(
      originalPrompt,
      failedClusters,
    );

    console.log("Original:", originalPrompt);
    console.log("Optimized:", optimizedPrompt);

    return optimizedPrompt;
  } catch (error) {
    console.error("Optimization failed:", error);
    throw error;
  }
}

// Export for use in other modules
export { LLMPromptOptimizer, optimizePromptExample };

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  optimizePromptExample();
}
