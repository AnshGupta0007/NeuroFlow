import { create } from 'zustand';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('neuroflow_token'),
  isLoading: false,
  isInitialized: false,

  init: async () => {
    const token = localStorage.getItem('neuroflow_token');
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const res = await authAPI.getProfile();
      set({ user: res.data, token, isInitialized: true });
    } catch {
      localStorage.removeItem('neuroflow_token');
      set({ user: null, token: null, isInitialized: true });
    }
  },

  signUp: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authAPI.signUp(data);
      const { user, session } = res.data;
      if (session?.access_token) {
        localStorage.setItem('neuroflow_token', session.access_token);
        set({ user, token: session.access_token });
        toast.success('Welcome to NeuroFlow!');
      } else {
        toast.success('Account created! Please check your email to verify.');
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authAPI.signIn(data);
      const { user, session } = res.data;

      if (!session?.access_token) throw new Error('No session returned');

      localStorage.setItem('neuroflow_token', session.access_token);
      set({ user: user || null, token: session.access_token });
      toast.success(user ? `Welcome back, ${user.name}!` : 'Signed in!');
      return true;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      await authAPI.signOut();
    } finally {
      localStorage.removeItem('neuroflow_token');
      set({ user: null, token: null });
      toast.success('Signed out');
    }
  },

  updateUser: (updates) => set(state => ({ user: { ...state.user, ...updates } }))
}));

export default useAuthStore;
