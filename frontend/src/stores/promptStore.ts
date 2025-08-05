import { OptimizePromptRequest } from "@/services/optimize";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SelectedTestCase {
  promptId: string;
  clusterId: string;
  testId: string;
}

export interface PromptStoreState {
  selectedTestCase: SelectedTestCase[];
  select: (id: string, clusterId: string, promptId: string) => void;
  deselect: (id: string) => void;
  selectAll: (ids: string[], clusterId: string, promptId: string) => void;
  deselectAll: (clusterId: string, promptId: string) => void;
}

export const usePromptStore = create<PromptStoreState>()(
  persist(
    (set, get) => ({
      optimizePrompts: [],
      selectedTestCase: [],

      select: (id: string, clusterId: string, promptId: string) => {
        set((state) => {
          return {
            selectedTestCase: [
              ...state.selectedTestCase,
              { promptId, clusterId, testId: id },
            ],
          };
        });
      },

      deselect: (id: string) => {
        set((state) => {
          return {
            selectedTestCase: state.selectedTestCase.filter(
              (testCase) => testCase.testId !== id,
            ),
          };
        });
      },

      selectAll: (ids: string[], clusterId: string, promptId: string) => {
        set((state) => ({
          selectedTestCase: [
            ...state.selectedTestCase,
            ...ids.map((id: string) => ({ promptId, clusterId, testId: id })),
          ],
        }));
      },

      deselectAll: (clusterId: string, promptId: string) => {
        set((state) => ({
          selectedTestCase: state.selectedTestCase.filter(
            (testCase) =>
              testCase.clusterId !== clusterId ||
              testCase.promptId !== promptId,
          ),
        }));
      },
    }),
    {
      name: "prompt-store",
      partialize: (state) => ({
        selectedTestCase: Array.from(state.selectedTestCase),
      }),
      skipHydration: true,
      merge: (persistedState, currentState) => {
        const persisted =
          persistedState && typeof persistedState === "object"
            ? (persistedState as Partial<PromptStoreState>)
            : {};
        const current =
          currentState && typeof currentState === "object"
            ? (currentState as Partial<PromptStoreState>)
            : {};
        return {
          ...current,
          ...persisted,
          selectedPromptIds: new Set(
            Array.isArray(persisted.selectedTestCase)
              ? persisted.selectedTestCase
              : [],
          ),
        } as PromptStoreState;
      },
    },
  ),
);
