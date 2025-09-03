export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;

      if (contentType?.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (_: unknown) {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
      }

      throw new ApiError(errorMessage, response.status, response);
    }

    // Handle blob responses (for file downloads)
    if (
      contentType?.includes('application/octet-stream') ||
      contentType?.includes('text/plain') ||
      (contentType?.includes('application/json') &&
        response.headers.get('content-disposition'))
    ) {
      return response.blob() as unknown as T;
    }

    // Handle JSON responses
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    // Handle text responses
    return response.text() as unknown as T;
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const urlObject = new URL(`${this.baseUrl}${url}`, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        urlObject.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(urlObject.toString());
    return this.handleResponse<T>(response);
  }

  async post<T>(url: string, data?: unknown, config?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'POST',
      ...config,
      body: data instanceof FormData ? data : JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(url: string, data?: unknown, config?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'PUT',
      ...config,
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'PATCH',
      ...config,
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(url: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'DELETE',
    });

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient();
export { ApiError };
