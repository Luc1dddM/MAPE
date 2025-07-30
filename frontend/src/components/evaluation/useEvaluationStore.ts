import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PromptfooEvaluationRequest } from "@/types/api";

interface EvaluationState {
    formData: Partial<PromptfooEvaluationRequest>;
    setFormData: (data: Partial<PromptfooEvaluationRequest>) => void;
    clearFormData: () => void;
}

export const useEvaluationStore = create<EvaluationState>()(
    persist(
        (set) => ({
            formData: {},
            setFormData: (data) => set({ formData: { ...data } }),
            clearFormData: () => set({ formData: {} }),
        }),
        {
            name: "evaluation-form-storage",
        }
    )
);
