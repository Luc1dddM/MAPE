import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../utils/logger.js";
import dotenv from "dotenv";

dotenv.config();

interface GenerationOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  generationConfig?: any;
}

class GoogleAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env["GEMINI_API_KEY"]) {
      throw new Error("GEMINI_API_KEY is required");
    }

    this.genAI = new GoogleGenerativeAI(process.env["GEMINI_API_KEY"]);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
    });
  }

  async generateContent(
    prompt: string,
    options: GenerationOptions = {},
  ): Promise<string> {
    try {
      const generationConfig = {
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.9,
        topK: options.topK || 40,
        maxOutputTokens: options.maxTokens || 1024,
        ...options.generationConfig,
      };

      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });

      const response = result.response;
      return response.text();
    } catch (error) {
      logger.error("Google AI API error:", error);
      throw new Error(
        `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async generateMultipleVariations(
    prompt: string,
    count: number = 3,
    options: GenerationOptions = {},
  ): Promise<string[]> {
    try {
      const variations = await Promise.all(
        Array.from({ length: count }, (_, index) =>
          this.generateContent(prompt, {
            ...options,
            temperature: (options.temperature || 0.7) + index * 0.1,
          }),
        ),
      );

      return variations;
    } catch (error) {
      logger.error("Multiple variations generation error:", error);
      throw error;
    }
  }

  async evaluatePromptEffectiveness(
    prompt: string,
    expectedOutput: string,
    actualOutput: string,
  ): Promise<any> {
    try {
      const evaluationPrompt = `
Evaluate the effectiveness of this prompt based on how well the actual output matches the expected output.

Prompt: "${prompt}"
Expected Output: "${expectedOutput}"
Actual Output: "${actualOutput}"

Please provide:
1. A score from 0-100 (100 being perfect match)
2. Specific areas where the prompt could be improved
3. Suggestions for making the prompt more effective

Format your response as JSON:
{
  "score": number,
  "analysis": "detailed analysis",
  "improvements": ["suggestion 1", "suggestion 2", ...],
  "strengths": ["strength 1", "strength 2", ...]
}
`;

      const result = await this.generateContent(evaluationPrompt, {
        temperature: 0.3, // Lower temperature for more consistent evaluation
      });

      try {
        return JSON.parse(result);
      } catch (parseError) {
        logger.warn(
          "Failed to parse evaluation result as JSON, returning raw text",
        );
        return { raw: result };
      }
    } catch (error) {
      logger.error("Prompt evaluation error:", error);
      throw error;
    }
  }
}

export default GoogleAIService;
