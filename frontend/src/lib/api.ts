const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  async getTenantById(tenantId: string) {
    return this.request(`/tenants/${tenantId}`);
  }

  async getTenantBySubdomain(subdomain: string) {
    return this.request(`/tenants/by-subdomain/${subdomain}`);
  }

  async updateTenantBranding(tenantId: string, branding: any, token: string) {
    return this.request(`/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ branding }),
    });
  }

  async getEventById(eventId: string) {
    return this.request(`/events/${eventId}`);
  }

  async getSlidesByEvent(eventId: string) {
    return this.request(`/events/${eventId}/slides`);
  }

  async getSlideDownloadUrl(slideId: string) {
    return this.request<{ download_url: string; expires_at: string }>(`/slides/${slideId}/download`);
  }
}

export const api = new ApiClient(API_URL);
