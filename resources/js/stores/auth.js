import { defineStore } from 'pinia';
import api from '@/services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('conecta2_token') || null,
    user: null,
    loadingMe: false,
  }),
  getters: {
    isAuthed: (s) => !!s.token,
  },
  actions: {
    async login({ username, password }) {
      const res = await api.post('/api/login', { username, password });
      const token = res.data?.token;
      if (!token) throw new Error('No se recibió token');
      this.token = token;
      localStorage.setItem('conecta2_token', token);
      this.user = res.data?.user ?? null;
      return this.user;
    },
    async logout() {
      try {
        await api.post('/api/logout');
      } finally {
        this.token = null;
        this.user = null;
        localStorage.removeItem('conecta2_token');
      }
    },
    async me() {
      if (!this.token) return null;
      this.loadingMe = true;
      try {
        const res = await api.get('/api/me');
        this.user = res.data ?? null;
        return this.user;
      } finally {
        this.loadingMe = false;
      }
    },
  },
});

