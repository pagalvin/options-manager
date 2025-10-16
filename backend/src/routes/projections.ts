import express from 'express';
import pool from '../database';
import { ProjectionService } from '../services/projectionService';

const router = express.Router();
const projectionService = new ProjectionService(pool);

router.get('/', async (_req, res) => {
  try {
    const projections = await projectionService.getProjections();
    res.json(projections);
  } catch (error) {
    console.error('Error fetching projections:', error);
    res.status(500).json({ error: 'Failed to fetch projections' });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid projection id' });
  }

  try {
    const projection = await projectionService.getProjectionById(id);
    if (!projection) {
      return res.status(404).json({ error: 'Projection not found' });
    }
    res.json(projection);
  } catch (error) {
    console.error(`Error fetching projection ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch projection' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = normalizeProjectionCreate(req.body);
    validateProjectionInput(payload, true);

    const created = await projectionService.createProjection(payload);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating projection:', error);
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create projection' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid projection id' });
  }

  try {
    const payload = normalizeProjectionUpdate(req.body);
    validateProjectionInput(payload, false);

    const updated = await projectionService.updateProjection(id, payload);
    if (!updated) {
      return res.status(404).json({ error: 'Projection not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error(`Error updating projection ${id}:`, error);
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update projection' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid projection id' });
  }

  try {
    const deleted = await projectionService.deleteProjection(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Projection not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(`Error deleting projection ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete projection' });
  }
});

router.post('/:id/calculate', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid projection id' });
  }

  try {
    const result = await projectionService.calculateProjection(id);
    if (!result) {
      return res.status(404).json({ error: 'Projection not found' });
    }
    res.json(result);
  } catch (error) {
    console.error(`Error calculating projection ${id}:`, error);
    res.status(500).json({ error: 'Failed to calculate projection' });
  }
});

router.patch('/:id/periods/:periodId', async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const periodId = Number.parseInt(req.params.periodId, 10);

  if (Number.isNaN(id) || Number.isNaN(periodId)) {
    return res.status(400).json({ error: 'Invalid identifier' });
  }

  try {
    const updates = normalizePeriodUpdate(req.body);
    const updatedPeriod = await projectionService.updateProjectionPeriod(id, periodId, updates);
    if (!updatedPeriod) {
      return res.status(404).json({ error: 'Projection period not found' });
    }
    res.json(updatedPeriod);
  } catch (error) {
    console.error(`Error updating period ${periodId} for projection ${id}:`, error);
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update projection period' });
  }
});

class ValidationError extends Error {}

type ProjectionInputPayload = Parameters<ProjectionService['createProjection']>[0];

type ProjectionUpdatePayload = Partial<ProjectionInputPayload>;

type PeriodUpdatePayload = Parameters<ProjectionService['updateProjectionPeriod']>[2];

function normalizeProjectionCreate(body: any): ProjectionInputPayload {
  return {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    description: body.description === null ? null : String(body.description ?? '').trim() || null,
    assumed_roc_percent: toNumber(body.assumed_roc_percent, 0),
    projection_start_date:
      typeof body.projection_start_date === 'string' ? body.projection_start_date : '',
    starting_capital: toNumber(body.starting_capital, 0),
    monthly_infusion: toNumber(body.monthly_infusion, 0),
  };
}

function normalizeProjectionUpdate(body: any): ProjectionUpdatePayload {
  const payload: ProjectionUpdatePayload = {};

  if (body.name !== undefined) {
    payload.name = typeof body.name === 'string' ? body.name.trim() : '';
  }
  if (body.description !== undefined) {
    payload.description = body.description === null ? null : String(body.description ?? '').trim() || null;
  }
  if (body.assumed_roc_percent !== undefined) {
    payload.assumed_roc_percent = toNumber(body.assumed_roc_percent, 0);
  }
  if (body.projection_start_date !== undefined) {
    payload.projection_start_date = typeof body.projection_start_date === 'string'
      ? body.projection_start_date
      : '';
  }
  if (body.starting_capital !== undefined) {
    payload.starting_capital = toNumber(body.starting_capital, 0);
  }
  if (body.monthly_infusion !== undefined) {
    payload.monthly_infusion = toNumber(body.monthly_infusion, 0);
  }

  return payload;
}

function validateProjectionInput(payload: ProjectionInputPayload | ProjectionUpdatePayload, requireAll: boolean): void {
  if (requireAll || payload.name !== undefined) {
    if (!payload.name) {
      throw new ValidationError('Projection name is required');
    }
  }

  if (requireAll || payload.projection_start_date !== undefined) {
    if (!payload.projection_start_date) {
      throw new ValidationError('Projection start date is required');
    }
    if (Number.isNaN(Date.parse(payload.projection_start_date!))) {
      throw new ValidationError('Projection start date is invalid');
    }
  }

  if (requireAll || payload.assumed_roc_percent !== undefined) {
    if (payload.assumed_roc_percent === undefined || payload.assumed_roc_percent === null) {
      throw new ValidationError('Assumed RoC% is required');
    }
  }

  if (requireAll || payload.starting_capital !== undefined) {
    if (payload.starting_capital === undefined || payload.starting_capital === null) {
      throw new ValidationError('Starting capital is required');
    }
  }

  if (requireAll || payload.monthly_infusion !== undefined) {
    if (payload.monthly_infusion === undefined || payload.monthly_infusion === null) {
      throw new ValidationError('Monthly infusion is required');
    }
  }
}

function normalizePeriodUpdate(body: any): PeriodUpdatePayload {
  const payload: PeriodUpdatePayload = {};

  if (body.expected_balance !== undefined) {
    payload.expected_balance = toNullableNumber(body.expected_balance);
  }
  if (body.actual_balance !== undefined) {
    payload.actual_balance = toNullableNumber(body.actual_balance);
  }
  if (body.is_manual !== undefined) {
    payload.is_manual = typeof body.is_manual === 'boolean'
      ? body.is_manual
      : body.is_manual === 'true' || body.is_manual === '1';
  }

  if (
    payload.expected_balance !== undefined &&
    payload.expected_balance !== null &&
    !Number.isFinite(payload.expected_balance)
  ) {
    throw new ValidationError('Expected balance must be numeric or null');
  }

  if (
    payload.actual_balance !== undefined &&
    payload.actual_balance !== null &&
    !Number.isFinite(payload.actual_balance)
  ) {
    throw new ValidationError('Actual balance must be numeric or null');
  }

  return payload;
}

function toNumber(value: any, defaultValue: number): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const result = Number.parseFloat(value);
  if (!Number.isFinite(result)) {
    throw new ValidationError('Numeric value required');
  }
  return result;
}

function toNullableNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const result = Number.parseFloat(value);
  if (!Number.isFinite(result)) {
    throw new ValidationError('Numeric value required');
  }
  return result;
}

export default router;
