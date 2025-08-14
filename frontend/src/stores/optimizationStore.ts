import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OptimizePromptResponse } from "@/services/optimize";

export interface OptimizationResult {
  id: string;
  evaluationId: string;
  promptIndex: number;
  originalPrompt: string;
  optimizedPrompt: string;
  improvements: string[];
  metadata: {
    originalLength: number;
    optimizedLength: number;
    clustersAnalyzed: number;
    optimizedAt: string;
    promptId: string;
  };
  selectedTestCases: any[];
  status: "pending" | "completed" | "failed";
  error?: string;
  createdAt: string;
}

export interface OptimizationStoreState {
  // Current optimization results list
  optimizations: OptimizationResult[];
  
  // Currently selected optimization for viewing
  selectedOptimizationId: string | null;
  
  // Loading states
  isOptimizing: boolean;
  
  // Actions
  addOptimization: (optimization: Omit<OptimizationResult, "id" | "createdAt">) => string;
  updateOptimization: (id: string, updates: Partial<OptimizationResult>) => void;
  setSelectedOptimization: (id: string | null) => void;
  removeOptimization: (id: string) => void;
  clearOptimizations: () => void;
  setOptimizing: (isOptimizing: boolean) => void;
  
  // Getters
  getOptimizationById: (id: string) => OptimizationResult | undefined;
  getOptimizationsByEvaluation: (evaluationId: string) => OptimizationResult[];
  getSelectedOptimization: () => OptimizationResult | undefined;
  getCompletedOptimizations: () => OptimizationResult[];
  getAllOptimizations: () => OptimizationResult[];
}

export const useOptimizationStore = create<OptimizationStoreState>()(
  persist(
    (set, get) => ({
      optimizations: [],
      selectedOptimizationId: null,
      isOptimizing: false,

      addOptimization: (optimization) => {
        const id = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newOptimization: OptimizationResult = {
          ...optimization,
          id,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          optimizations: [newOptimization, ...state.optimizations],
          selectedOptimizationId: id, // Auto-select the new optimization
        }));

        return id;
      },

      updateOptimization: (id, updates) => {
        set((state) => ({
          optimizations: state.optimizations.map((opt) =>
            opt.id === id ? { ...opt, ...updates } : opt
          ),
        }));
      },

      setSelectedOptimization: (id) => {
        set({ selectedOptimizationId: id });
      },

      removeOptimization: (id) => {
        set((state) => ({
          optimizations: state.optimizations.filter((opt) => opt.id !== id),
          selectedOptimizationId:
            state.selectedOptimizationId === id ? null : state.selectedOptimizationId,
        }));
      },

      clearOptimizations: () => {
        set({
          optimizations: [],
          selectedOptimizationId: null,
        });
      },

      setOptimizing: (isOptimizing) => {
        set({ isOptimizing });
      },

      // Getters
      getOptimizationById: (id) => {
        return get().optimizations.find((opt) => opt.id === id);
      },

      getOptimizationsByEvaluation: (evaluationId) => {
        return get().optimizations.filter((opt) => opt.evaluationId === evaluationId);
      },

      getSelectedOptimization: () => {
        const { selectedOptimizationId, optimizations } = get();
        if (!selectedOptimizationId) return undefined;
        return optimizations.find((opt) => opt.id === selectedOptimizationId);
      },

      getCompletedOptimizations: () => {
        return get().optimizations.filter((opt) => opt.status === "completed");
      },

      getAllOptimizations: () => {
        return get().optimizations;
      },
    }),
    {
      name: "optimization-store",
      partialize: (state) => ({
        optimizations: state.optimizations,
        selectedOptimizationId: state.selectedOptimizationId,
      }),
      skipHydration: false,
      merge: (persistedState, currentState) => {
        const persisted =
          persistedState && typeof persistedState === "object"
            ? (persistedState as Partial<OptimizationStoreState>)
            : {};
        const current =
          currentState && typeof currentState === "object"
            ? (currentState as Partial<OptimizationStoreState>)
            : {};
        return {
          ...current,
          ...persisted,
          isOptimizing: false, // Reset loading state on hydration
        } as OptimizationStoreState;
      },
    }
  )
);

// Helper function to convert API response to optimization result
export const createOptimizationFromResponse = (
  response: OptimizePromptResponse,
  evaluationId: string,
  promptIndex: number,
  originalPrompt: string,
  selectedTestCases: any[]
): Omit<OptimizationResult, "id" | "createdAt"> => {
  if (response.success && response.data) {
    return {
      evaluationId,
      promptIndex,
      originalPrompt,
      optimizedPrompt: response.data.optimizedPrompt,
      improvements: response.data.improvements,
      metadata: {
        ...response.data.metadata,
        promptId: response.data.metadata.promptId || `${evaluationId}-prompt-${promptIndex}`,
      },
      selectedTestCases,
      status: "completed",
    };
  } else {
    return {
      evaluationId,
      promptIndex,
      originalPrompt,
      optimizedPrompt: "",
      improvements: [],
      metadata: {
        originalLength: originalPrompt.length,
        optimizedLength: 0,
        clustersAnalyzed: 0,
        optimizedAt: new Date().toISOString(),
        promptId: `${evaluationId}-prompt-${promptIndex}`,
      },
      selectedTestCases,
      status: "failed",
      error: response.error || "Optimization failed",
    };
  }
};