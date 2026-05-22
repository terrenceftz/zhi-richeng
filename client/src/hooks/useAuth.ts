import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import * as authApi from '../api/auth';

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    store.hydrate();
    const token = localStorage.getItem('accessToken');
    if (token) {
      authApi.refreshToken(localStorage.getItem('refreshToken') || '')
        .then((tokens) => {
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
        })
        .catch(() => {
          store.logout();
        });
    }
  }, []);

  return store;
}
