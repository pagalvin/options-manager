import {
  ProjectionDetail,
  ProjectionPeriod,
  ProjectionSummary,
} from '@/types/projection';

export interface ProjectionCreatePayload {
  name: string;
  description: string;
  assumed_roc_percent: number;
  projection_start_date: string;
  starting_capital: number;
  monthly_infusion: number;
}

export type ProjectionUpdatePayload = Partial<ProjectionCreatePayload>;

export interface ProjectionPeriodUpdatePayload {
  expected_balance?: number | null;
  actual_balance?: number | null;
  is_manual?: boolean;
}

class ProjectionsService {
  private baseUrl = '/api/projections';

  async list(): Promise<ProjectionSummary[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error('Failed to load projections');
    }
    return response.json();
  }

  async get(id: number): Promise<ProjectionDetail> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (response.status === 404) {
      throw new Error('Projection not found');
    }
    if (!response.ok) {
      throw new Error('Failed to load projection');
    }
    return response.json();
  }

  async create(payload: ProjectionCreatePayload): Promise<ProjectionDetail> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await extractError(response, 'Unable to create projection');
      throw new Error(message);
    }

    return response.json();
  }

  async update(id: number, payload: ProjectionUpdatePayload): Promise<ProjectionDetail> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 404) {
      throw new Error('Projection not found');
    }
    if (!response.ok) {
      const message = await extractError(response, 'Unable to update projection');
      throw new Error(message);
    }

    return response.json();
  }

  async remove(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });

    if (response.status === 404) {
      throw new Error('Projection not found');
    }
    if (!response.ok) {
      const message = await extractError(response, 'Unable to delete projection');
      throw new Error(message);
    }
  }

  async calculate(id: number): Promise<ProjectionDetail> {
    const response = await fetch(`${this.baseUrl}/${id}/calculate`, {
      method: 'POST',
    });

    if (response.status === 404) {
      throw new Error('Projection not found');
    }
    if (!response.ok) {
      const message = await extractError(response, 'Unable to calculate projection');
      throw new Error(message);
    }

    return response.json();
  }

  async updatePeriod(
    projectionId: number,
    periodId: number,
    payload: ProjectionPeriodUpdatePayload
  ): Promise<ProjectionPeriod> {
    const response = await fetch(`${this.baseUrl}/${projectionId}/periods/${periodId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 404) {
      throw new Error('Projection period not found');
    }
    if (!response.ok) {
      const message = await extractError(response, 'Unable to update projection period');
      throw new Error(message);
    }

    return response.json();
  }
}

async function extractError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data?.error || fallback;
  } catch (_error) {
    return fallback;
  }
}

export const projectionsService = new ProjectionsService();
export default projectionsService;
