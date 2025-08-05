import { GoogleGenAI, Type } from "@google/genai";
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
  private ai: GoogleGenAI;
  // private model: any;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
    // this.model = this.genAI.getGenerativeModel({
    //   model: "gemini-2.0-flash-lite",
    // });
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
    failedClusters: FailedCluster[],
  ): Promise<string> {
    try {
      const optimizationPrompt = this.buildOptimizationPrompt(
        originalPrompt,
        failedClusters,
      );

      const result = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: optimizationPrompt }],
          },
        ],
        //       config: {
        //         systemInstruction: {
        //           role: "system",
        //           parts: [
        //             {
        //               text: `
        // You HAVE TO treat every user input as a prompt to be improved or created.
        // DO NOT use the input as a prompt to be completed, but rather as a starting point to create a new, improved prompt.
        // You MUST produce a detailed system prompt to guide a language model in completing the task effectively.

        // Your final output will be the full corrected prompt verbatim. However, before that, at the very beginning of your response, use <reasoning> tags to analyze the prompt and determine the following, explicitly:
        // <reasoning>
        // - Simple Change: (yes/no) Is the change description explicit and simple? (If so, skip the rest of these questions.)
        // - Reasoning: (yes/no) Does the current prompt use reasoning, analysis, or chain of thought?
        //   - Identify: (max 10 words) if so, which section(s) utilize reasoning?
        //   - Conclusion: (yes/no) is the chain of thought used to determine a conclusion?
        //   - Ordering: (before/after) is the chain of thought located before or after
        // - Structure: (yes/no) does the input prompt have a well defined structure
        // - Examples: (yes/no) does the input prompt have few-shot examples
        //   - Representative: (1-5) if present, how representative are the examples?
        // - Complexity: (1-5) how complex is the input prompt?
        //   - Task: (1-5) how complex is the implied task?
        //   - Necessity: ()
        // - Specificity: (1-5) how detailed and specific is the prompt? (not to be confused with length)
        // - Prioritization: (list) what 1-3 categories are the MOST important to address.
        // - Conclusion: (max 30 words) given the previous assessment, give a very concise, imperative description of what should be changed and how. this does not have to adhere strictly to only the categories listed
        // </reasoning>

        // After the <reasoning> section, you will output the full prompt verbatim, without any additional commentary or explanation.

        // # Guidelines

        // - Understand the Task: Grasp the main objective, goals, requirements, constraints, and expected output.
        // - Minimal Changes: If an existing prompt is provided, improve it only if it's simple. For complex prompts, enhance clarity and add missing elements without altering the original structure.
        // - Reasoning Before Conclusions**: Encourage reasoning steps before any conclusions are reached. ATTENTION! If the user provides examples where the reasoning happens afterward, REVERSE the order! NEVER START EXAMPLES WITH CONCLUSIONS!
        //   - Reasoning Order: Call out reasoning portions of the prompt and conclusion parts (specific fields by name). For each, determine the ORDER in which this is done, and whether it needs to be reversed.
        //   - Conclusion, classifications, or results should ALWAYS appear last.
        // - Examples: Include high-quality examples if helpful, using placeholders [in brackets] for complex elements.
        // - What kinds of examples may need to be included, how many, and whether they are complex enough to benefit from placeholders.
        // - Clarity and Conciseness: Use clear, specific language. Avoid unnecessary instructions or bland statements.
        // - Formatting: Use markdown features for readability. DO NOT USE \`\`\` CODE BLOCKS UNLESS SPECIFICALLY REQUESTED.
        // - Preserve User Content: If the input task or prompt includes extensive guidelines or examples, preserve them entirely, or as closely as possible. If they are vague, consider breaking down into sub-steps. Keep any details, guidelines, examples, variables, or placeholders provided by the user.
        // - Constants: DO include constants in the prompt, as they are not susceptible to prompt injection. Such as guides, rubrics, and examples.
        // - Output Format: Explicitly the most appropriate output format, in detail. This should include length and syntax (e.g. short sentence, paragraph, JSON, etc.)
        //   - For tasks outputting well-defined or structured data (classification, JSON, etc.) bias toward outputting a JSON.
        //   - JSON should never be wrapped in code blocks (\`\`\`) unless explicitly requested.

        // The final prompt you output should adhere to the following structure below. Do not include any additional commentary, only output the completed system prompt. SPECIFICALLY, do not include any additional messages at the start or end of the prompt. (e.g. no "---")

        // [Concise instruction describing the task - this should be the first line in the prompt, no section header]

        // [Additional details as needed.]

        // [Optional sections with headings or bullet points for detailed steps.]

        // # Steps [optional]

        // [optional: a detailed breakdown of the steps necessary to accomplish the task]

        // # Output Format

        // "{
        //     ""isValid"": boolean,
        //     ""isRelevant"": boolean,
        //     ""cleanedQuery"": string,
        //     ""reason"": string
        // }"

        // # Examples [optional]

        // [Optional: 1-3 well-defined examples with placeholders if necessary. Clearly mark where examples start and end, and what the input and output are. User placeholders as necessary.]
        // [If the examples are shorter than what a realistic example is expected to be, make a reference with () explaining how real examples should be longer / shorter / different. AND USE PLACEHOLDERS! ]

        // # Notes [optional]

        // [optional: edge cases, details, and an area to call or repeat out specific important considerations]
        // [NOTE: you must start with a <reasoning> section. the immediate next token you produce should be <reasoning>]
        //               `,
        //             },
        //           ],
        //         },
        //       },
      });
      const response = result.text || "";

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

    const PROMPT_OPTIMIZATION_TEMPLATE = `# Expert Prompt Optimization System

    You are an expert prompt engineer specializing in creating high-performance prompts that generate structured JSON outputs. Your task is to analyze failed prompt performance and create an optimized replacement that addresses all identified issues while ensuring consistent, properly formatted responses.

    ## Original Prompt Analysis
    **ORIGINAL PROMPT:**
    "${originalPrompt}"

    ## Performance Metrics & Failure Analysis
    - **Total failed clusters:** ${failedClusters.length}
    - **Total failed test cases:** ${clusterAnalysis.totalFailedCases}
    - **Average performance score:** ${clusterAnalysis.averageScore.toFixed(2)}/10
    - **Primary failure patterns:** ${clusterAnalysis.clusterReasons.join(", ")}
    - **Problematic assertion types:** ${clusterAnalysis.assertionTypes.join(", ")}

    ## Detailed Cluster Failure Analysis
    ${clusterExamples}

    ## Critical Issues to Resolve
    ${clusterAnalysis.keyIssues.map((issue) => `- ${issue}`).join("\n")}

    ## Optimization Requirements

    ### 1. **Cluster-Specific Issue Resolution**
    Your optimized prompt must specifically address each failure pattern:
    ${failedClusters.map((cluster, i) => `   - **Cluster ${i + 1}:** ${cluster.reason}`).join("\n")}

    ### 2. **Performance Enhancement Strategies**
    - **Accuracy Target:** Improve from ${clusterAnalysis.averageScore.toFixed(2)}/10 to 9+/10
    - **Consistency:** Eliminate format variations and interpretation inconsistencies
    - **Edge Case Handling:** Address metaphorical vs literal interpretations, context dependency
    - **Validation:** Include self-checking mechanisms

    ### 3. **Structural Requirements for Output Prompt**
    The optimized prompt you create must include:

    #### **Clear Markdown Structure:**
    - Use proper heading hierarchy (# ## ###)
    - Organize content with clear sections
    - Include code blocks for examples
    - Use bullet points and numbered lists appropriately

    #### **Essential Sections:**
    1. **Task Definition** - Clear role and objective
    2. **Input Processing Rules** - How to interpret different input types
    3. **Decision Logic** - Step-by-step reasoning process
    4. **Output Format** - Exact JSON structure with examples
    5. **Validation Steps** - Quality checks before response
    6. **Edge Case Guidelines** - Specific handling instructions

    #### **Quality Assurance Elements:**
    - Include 2-3 concrete examples showing input → reasoning → output
    - Add validation checklist
    - Specify error handling procedures
    - Define clear criteria for each boolean field

    ### 4. **Advanced Prompt Engineering Techniques**
    Apply these proven methods:
    - **Chain-of-thought reasoning:** Break down decision process
    - **Few-shot examples:** Include diverse, representative cases
    - **Constraint specification:** Clear boundaries and limitations
    - **Output validation:** Built-in quality checks
    - **Fallback handling:** Instructions for ambiguous cases

    ## Deliverable Requirements

    **Return ONLY the optimized prompt formatted in clean markdown with proper structure. The prompt must:**

    1. ✅ Generate responses in the exact JSON format specified above
    2. ✅ Use clear markdown headings and organization
    3. ✅ Include concrete examples and validation steps
    4. ✅ Address all identified cluster failure reasons
    5. ✅ Provide step-by-step reasoning instructions
    6. ✅ Handle edge cases explicitly
    7. ✅ Maintain consistency across similar inputs

    **Output the complete optimized prompt below - no additional commentary, explanations, or JSON wrappers:**`;

    return PROMPT_OPTIMIZATION_TEMPLATE;
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
      const clusterReason = (cluster.reason || "").toLowerCase();

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
      (tc.reason || "").toLowerCase(),
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

// Export for use in other modules
export { LLMPromptOptimizer };
