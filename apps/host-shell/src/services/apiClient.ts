import { getConfig } from '@/config';

export interface ApiClientOptions {
  timeout?: number;
  retries?: number;
}

export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(options?: ApiClientOptions) {
    this.baseUrl = getConfig().apiUrl;
    this.timeout = options?.timeout || 30000;
    this.retries = options?.retries || 3;
  }

  async get<T = any>(path: string, headers?: HeadersInit): Promise<T> {
    return this.request<T>('GET', path, undefined, headers);
  }

  async post<T = any>(path: string, body?: any, headers?: HeadersInit): Promise<T> {
    return this.request<T>('POST', path, body, headers);
  }

  async put<T = any>(path: string, body?: any, headers?: HeadersInit): Promise<T> {
    return this.request<T>('PUT', path, body, headers);
  }

  async delete<T = any>(path: string, headers?: HeadersInit): Promise<T> {
    return this.request<T>('DELETE', path, undefined, headers);
  }

  private async request<T = any>(
    method: string,
    path: string,
    body?: any,
    headers?: HeadersInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const fetchInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      ...(body && { body: JSON.stringify(body) }),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...fetchInit,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
