import axios from 'axios';
import {
  PromptGenerationRequest,
  PromptGenerationResponse,
  TechniquesResponse,
  PromptEvaluationRequest,
  PromptEvaluationResponse,
  PromptTestRequest,
  PromptTestResponse,
  PromptVariationRequest,
  PromptVariationResponse,
  PromptOptimizationRequest,
  PromptOptimizationResponse,
  PromptfooEvaluationRequest,
  EvaluationResponse,
  EvaluationListResponse,
  EvaluationStatusResponse,
  CriteriaResponse,
  ProvidersResponse,
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 60 seconds for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || 'An error occurred';
      throw new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error - please check your connection');
    } else {
      // Something else happened
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

export const promptService = {
  // Generate prompts using different techniques
  async generatePrompts(data: PromptGenerationRequest): Promise<PromptGenerationResponse> {
    const response = await apiClient.post<PromptGenerationResponse>('/api/prompts/generate', data);
    return response.data;
  },

  // Get available prompt engineering techniques
  async getTechniques(): Promise<TechniquesResponse> {
    const response = await apiClient.get<TechniquesResponse>('/api/prompts/techniques');
    return response.data;
  },

  // Evaluate prompt effectiveness
  async evaluatePrompt(data: PromptEvaluationRequest): Promise<PromptEvaluationResponse> {
    const response = await apiClient.post<PromptEvaluationResponse>('/api/prompts/evaluate', data);
    return response.data;
  },

  // Test a prompt with specific input
  async testPrompt(data: PromptTestRequest): Promise<PromptTestResponse> {
    const response = await apiClient.post<PromptTestResponse>('/api/prompts/test', data);
    return response.data;
  },

  // Generate variations of a prompt
  async generateVariations(data: PromptVariationRequest): Promise<PromptVariationResponse> {
    const response = await apiClient.post<PromptVariationResponse>('/api/prompts/variations', data);
    return response.data;
  },

  // Optimize an existing prompt
  async optimizePrompt(data: PromptOptimizationRequest): Promise<PromptOptimizationResponse> {
    const response = await apiClient.post<PromptOptimizationResponse>('/api/prompts/optimize', data);
    return response.data;
  },
};

export const evaluationService = {
  // Run a new evaluation with promptfoo
  async runEvaluation(data: PromptfooEvaluationRequest): Promise<EvaluationResponse> {
    const response = await apiClient.post<EvaluationResponse>('/api/evaluations/run', data);
    return response.data;
  },

  // Get evaluation results by ID
  async getEvaluation(evaluationId: string): Promise<EvaluationResponse> {
    const response = await apiClient.get<EvaluationResponse>(`/api/evaluations/${evaluationId}`);
    return response.data;
  },

  // Get evaluation status
  async getEvaluationStatus(evaluationId: string): Promise<EvaluationStatusResponse> {
    const response = await apiClient.get<EvaluationStatusResponse>(`/api/evaluations/${evaluationId}/status`);
    return response.data;
  },

  // List all evaluations
  async listEvaluations(): Promise<EvaluationListResponse> {
    const response = await apiClient.get<EvaluationListResponse>('/api/evaluations');
    return response.data;
  },

  // Delete an evaluation
  async deleteEvaluation(evaluationId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/api/evaluations/${evaluationId}`);
    return response.data;
  },

  // Get available evaluation criteria
  async getCriteria(): Promise<CriteriaResponse> {
    const response = await apiClient.get<CriteriaResponse>('/api/evaluations/meta/criteria');
    return response.data;
  },

  // Get available providers
  async getProviders(): Promise<ProvidersResponse> {
    const response = await apiClient.get<ProvidersResponse>('/api/evaluations/meta/providers');
    return response.data;
  },

  // Download evaluation results file
  async downloadEvaluation(evaluationId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> {
    const response = await apiClient.get(`/api/evaluations/${evaluationId}/download`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  },
};

export default apiClient;
