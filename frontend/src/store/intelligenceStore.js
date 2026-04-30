import { create } from 'zustand';
import { intelligenceAPI, analyticsAPI } from '../services/api';

const useIntelligenceStore = create((set, get) => ({
  intelligence: null,
  dashboard: null,
  projectAnalytics: {},
  productivity: null,
  isLoading: false,
  chatHistory: [],

  fetchIntelligence: async (projectId) => {
    set({ isLoading: true });
    try {
      const res = await intelligenceAPI.get(projectId);
      set({ intelligence: res.data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDashboard: async () => {
    set({ isLoading: true });
    try {
      const res = await analyticsAPI.getDashboard();
      set({ dashboard: res.data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProjectAnalytics: async (projectId) => {
    try {
      const res = await analyticsAPI.getProject(projectId);
      set(state => ({
        projectAnalytics: { ...state.projectAnalytics, [projectId]: res.data }
      }));
    } catch {}
  },

  fetchProductivity: async (days = 30) => {
    try {
      const res = await analyticsAPI.getProductivity(days);
      set({ productivity: res.data });
    } catch {}
  },

  askQuestion: async (projectId, question, useGrok = false) => {
    const userMsg = { role: 'user', content: question, id: Date.now() };
    set(state => ({ chatHistory: [...state.chatHistory, userMsg] }));

    try {
      const res = await intelligenceAPI.ask(projectId, question, useGrok);
      const aiMsg = {
        role: 'assistant',
        content: res.data.answer,
        confidence: res.data.confidence,
        model: res.data.model,
        data: res.data,
        id: Date.now() + 1
      };
      set(state => ({ chatHistory: [...state.chatHistory, aiMsg] }));
      return res.data;
    } catch {
      const errorMsg = {
        role: 'assistant',
        content: "I couldn't process that question. Please try again.",
        id: Date.now() + 1
      };
      set(state => ({ chatHistory: [...state.chatHistory, errorMsg] }));
    }
  },

  clearChat: () => set({ chatHistory: [] })
}));

export default useIntelligenceStore;
