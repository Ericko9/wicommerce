import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const storefrontApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

storefrontApiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('customer_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const tenantId = localStorage.getItem('tenant_id');
      if (tenantId) {
        config.headers['x-tenant-id'] = tenantId;
      }

      const cartId = localStorage.getItem('guest_cart_id') || 'guest-session';
      config.headers['x-cart-id'] = cartId;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

storefrontApiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error.response?.data || error),
);
