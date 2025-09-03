interface ApiResponse<T = any> {
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
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
      }
      
      throw new ApiError(errorMessage, response.status, response);
    }

    // Handle blob responses (for file downloads)
    if (contentType?.includes('application/octet-stream') || 
        contentType?.includes('text/plain') ||
        contentType?.includes('application/json') && response.headers.get('content-disposition')) {
      return response.blob() as unknown as T;
    }

    // Handle JSON responses
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    // Handle text responses
    return response.text() as unknown as T;
  }

  async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString());
    return this.handleResponse<T>(response);
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: { headers?: Record<string, string> }
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Handle FormData
    if (data instanceof FormData) {
      delete headers['Content-Type']; // Let browser set boundary
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: data instanceof FormData ? data : JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: { headers?: Record<string, string> }
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: { headers?: Record<string, string> }
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
    });

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient();
export { ApiError };
export type { ApiResponse };
