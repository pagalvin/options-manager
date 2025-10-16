import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import projectionsService from '@/services/projectionsService';
import { ProjectionDetail, ProjectionFormState, ProjectionPeriod, ProjectionSummary } from '@/types/projection';
import { ProjectionPeriodUpdatePayload } from '@/services/projectionsService';

interface PeriodEditState {
  expected_balance?: string;
  actual_balance?: string;
  is_manual?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function createDefaultForm(): ProjectionFormState {
  return {
    name: '',
    description: '',
    assumed_roc_percent: 8,
    projection_start_date: firstDayOfCurrentMonth(),
    starting_capital: 0,
    monthly_infusion: 0,
  };
}

function firstDayOfCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function formatDateDisplay(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return currencyFormatter.format(value);
}

function parseNullableNumber(value: string | undefined): number | null {
  if (value === undefined || value === '') {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapDetailToForm(detail: ProjectionDetail): ProjectionFormState {
  return {
    id: detail.id,
    name: detail.name,
    description: detail.description ?? '',
    assumed_roc_percent: detail.assumed_roc_percent,
    projection_start_date: detail.projection_start_date,
    starting_capital: detail.starting_capital,
    monthly_infusion: detail.monthly_infusion,
  };
}

function computeVariance(expected: number | null, actual: number | null): number | null {
  if (expected === null || expected === undefined) return null;
  if (actual === null || actual === undefined) return null;
  return Number((actual - expected).toFixed(2));
}

export function ProjectionsPage() {
  const [projections, setProjections] = useState<ProjectionSummary[]>([]);
  const [selectedProjection, setSelectedProjection] = useState<ProjectionDetail | null>(null);
  const [formState, setFormState] = useState<ProjectionFormState>(createDefaultForm);
  const [periodEdits, setPeriodEdits] = useState<Record<number, PeriodEditState>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [isEditingPeriods, setIsEditingPeriods] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [updatingPeriods, setUpdatingPeriods] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedId = selectedProjection?.id ?? null;

  useEffect(() => {
    void loadProjections();
  }, []);

  useEffect(() => {
    if (!isEditingPeriods) {
      setPeriodEdits({});
    }
  }, [isEditingPeriods]);

  async function loadProjections() {
    try {
      setListLoading(true);
      setError(null);
      const data = await projectionsService.list();
      setProjections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projections');
    } finally {
      setListLoading(false);
    }
  }

  async function loadProjectionDetail(id: number) {
    try {
      setDetailLoading(true);
      setError(null);
      const detail = await projectionsService.get(id);
      setSelectedProjection(detail);
      setFormState(mapDetailToForm(detail));
      setIsCreating(false);
      setIsEditingBase(false);
      setIsEditingPeriods(false);
      setPeriodEdits({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projection');
      setSelectedProjection(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function startCreate() {
    setSelectedProjection(null);
    setFormState(createDefaultForm());
    setIsCreating(true);
    setIsEditingBase(true);
    setIsEditingPeriods(false);
    setPeriodEdits({});
    setError(null);
  }

  function handleBaseInputChange(field: keyof ProjectionFormState, value: string) {
    setFormState((prev) => {
      if (field === 'assumed_roc_percent' || field === 'starting_capital' || field === 'monthly_infusion') {
        const numeric = value === '' ? 0 : Number(value);
        return { ...prev, [field]: Number.isFinite(numeric) ? numeric : prev[field] };
      }
      return { ...prev, [field]: value };
    });
  }

  async function handleSaveBase() {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: formState.name.trim(),
        description: formState.description.trim(),
        assumed_roc_percent: formState.assumed_roc_percent,
        projection_start_date: formState.projection_start_date,
        starting_capital: formState.starting_capital,
        monthly_infusion: formState.monthly_infusion,
      };

      let result: ProjectionDetail;
      if (isCreating) {
        result = await projectionsService.create(payload);
      } else if (selectedId) {
        result = await projectionsService.update(selectedId, payload);
      } else {
        throw new Error('No projection selected');
      }

      await loadProjections();
      setSelectedProjection(result);
      setFormState(mapDetailToForm(result));
      setIsCreating(false);
      setIsEditingBase(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save projection');
    } finally {
      setSaving(false);
    }
  }

  function handleCancelBase() {
    if (isCreating) {
      setIsCreating(false);
      setSelectedProjection(null);
      setFormState(createDefaultForm());
      setIsEditingBase(false);
      return;
    }

    if (selectedProjection) {
      setFormState(mapDetailToForm(selectedProjection));
      setIsEditingBase(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm('Are you sure you want to delete this projection?')) return;

    try {
      setError(null);
      await projectionsService.remove(selectedId);
      await loadProjections();
      setSelectedProjection(null);
      setFormState(createDefaultForm());
      setIsCreating(false);
      setIsEditingBase(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete projection');
    }
  }

  async function handleCalculate() {
    if (!selectedId) return;

    try {
      setCalculating(true);
      setError(null);
      const result = await projectionsService.calculate(selectedId);
      await loadProjections();
      setSelectedProjection(result);
      setFormState(mapDetailToForm(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate projection');
    } finally {
      setCalculating(false);
    }
  }

  function handlePeriodChange(periodId: number, field: keyof PeriodEditState, value: string | boolean) {
    setPeriodEdits((prev) => {
      const current = prev[periodId] ?? {};
      return {
        ...prev,
        [periodId]: {
          ...current,
          [field]: field === 'is_manual' ? Boolean(value) : (value as string),
        },
      };
    });
  }

  async function handleSavePeriods() {
    if (!selectedId) return;
    if (Object.keys(periodEdits).length === 0) {
      setIsEditingPeriods(false);
      return;
    }

    try {
      setUpdatingPeriods(true);
      setError(null);

      const periodIds = Object.keys(periodEdits).map((key) => Number.parseInt(key, 10));
      for (const periodId of periodIds) {
        const changes = periodEdits[periodId];
        const payload: ProjectionPeriodUpdatePayload = {};

        if (changes.expected_balance !== undefined) {
          payload.expected_balance = parseNullableNumber(changes.expected_balance);
        }
        if (changes.actual_balance !== undefined) {
          payload.actual_balance = parseNullableNumber(changes.actual_balance);
        }
        if (changes.is_manual !== undefined) {
          payload.is_manual = changes.is_manual;
        }

        await projectionsService.updatePeriod(selectedId, periodId, payload);
      }

      const refreshed = await projectionsService.get(selectedId);
      setSelectedProjection(refreshed);
      setFormState(mapDetailToForm(refreshed));
      setPeriodEdits({});
      setIsEditingPeriods(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update projection periods');
    } finally {
      setUpdatingPeriods(false);
    }
  }

  function renderPeriodTable(title: string, periods: ProjectionPeriod[]) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-muted border border-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Period</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Projected</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actual</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Variance</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Manual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {periods.map((period) => {
                const edit = periodEdits[period.id];
                const expectedInput = edit?.expected_balance ?? (period.expected_balance?.toString() ?? '');
                const actualInput = edit?.actual_balance ?? (period.actual_balance?.toString() ?? '');
                const isManual = edit?.is_manual ?? period.is_manual;
                const variance = computeVariance(period.expected_balance, period.actual_balance);
                const periodLabel = `${period.period_type === 'MONTH' ? 'Month' : 'Year'} ${period.period_index}`;
                const dateInfo = period.period_end ? formatDateDisplay(period.period_end) : null;

                return (
                  <tr key={period.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-foreground">{periodLabel}</div>
                      {dateInfo && (
                        <div className="text-xs text-muted-foreground">Ends {dateInfo}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isEditingPeriods ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={expectedInput}
                          onChange={(event) => handlePeriodChange(period.id, 'expected_balance', event.target.value)}
                        />
                      ) : (
                        <span>{formatCurrency(period.expected_balance)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isEditingPeriods ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={actualInput}
                          onChange={(event) => handlePeriodChange(period.id, 'actual_balance', event.target.value)}
                        />
                      ) : (
                        <span>{formatCurrency(period.actual_balance)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={variance === null ? 'text-muted-foreground' : variance >= 0 ? 'text-emerald-600' : 'text-red-600'}
                      >
                        {variance === null ? '—' : formatCurrency(variance)}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isEditingPeriods ? (
                        <input
                          type="checkbox"
                          checked={isManual}
                          onChange={(event) => handlePeriodChange(period.id, 'is_manual', event.target.checked)}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{period.is_manual ? 'Manual' : 'Auto'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">Projections</h1>
        <Button onClick={startCreate}>New Projection</Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Existing Projections</CardTitle>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="text-sm text-muted-foreground">Loading projections…</div>
            ) : projections.length === 0 ? (
              <div className="text-sm text-muted-foreground">No projections available yet.</div>
            ) : (
              <div className="space-y-2">
                {projections.map((projection) => {
                  const isActive = selectedId === projection.id && !isCreating;
                  return (
                    <button
                      key={projection.id}
                      onClick={() => loadProjectionDetail(projection.id)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                        isActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'
                      }`}
                    >
                      <div className="font-medium text-foreground">{projection.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Start {formatDateDisplay(projection.projection_start_date)} · RoC {projection.assumed_roc_percent.toFixed(2)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{isCreating ? 'Create Projection' : selectedProjection ? selectedProjection.name : 'Select a projection'}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            {detailLoading ? (
              <div className="text-sm text-muted-foreground">Loading projection details…</div>
            ) : isCreating || selectedProjection ? (
              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground">Starting Assumptions</h2>
                    {isEditingBase ? (
                      <div className="flex gap-2">
                        <Button onClick={handleSaveBase} disabled={saving}>
                          {saving ? 'Saving…' : 'Save'}
                        </Button>
                        <Button variant="outline" onClick={handleCancelBase} disabled={saving}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditingBase(true)} disabled={isCreating}>
                          Edit
                        </Button>
                        {!isCreating && (
                          <Button variant="secondary" onClick={handleCalculate} disabled={calculating}>
                            {calculating ? 'Calculating…' : 'Calculate Projection'}
                          </Button>
                        )}
                        {!isCreating && (
                          <Button variant="destructive" onClick={handleDelete}>
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="projection-name">Projection Name</Label>
                      <Input
                        id="projection-name"
                        value={formState.name}
                        onChange={(event) => handleBaseInputChange('name', event.target.value)}
                        disabled={!isEditingBase}
                        placeholder="Quarterly Growth Scenario"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="projection-start-date">Projection Start Date</Label>
                      <Input
                        id="projection-start-date"
                        type="date"
                        value={formState.projection_start_date}
                        onChange={(event) => handleBaseInputChange('projection_start_date', event.target.value)}
                        disabled={!isEditingBase}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assumed-roc">Assumed RoC %</Label>
                      <Input
                        id="assumed-roc"
                        type="number"
                        step="0.01"
                        value={formState.assumed_roc_percent}
                        onChange={(event) => handleBaseInputChange('assumed_roc_percent', event.target.value)}
                        disabled={!isEditingBase}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="starting-capital">Starting Capital</Label>
                      <Input
                        id="starting-capital"
                        type="number"
                        step="0.01"
                        value={formState.starting_capital}
                        onChange={(event) => handleBaseInputChange('starting_capital', event.target.value)}
                        disabled={!isEditingBase}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly-infusion">Monthly Infusion</Label>
                      <Input
                        id="monthly-infusion"
                        type="number"
                        step="0.01"
                        value={formState.monthly_infusion}
                        onChange={(event) => handleBaseInputChange('monthly_infusion', event.target.value)}
                        disabled={!isEditingBase}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="projection-description">Description / Notes</Label>
                      <Textarea
                        id="projection-description"
                        value={formState.description}
                        onChange={(event) => handleBaseInputChange('description', event.target.value)}
                        disabled={!isEditingBase}
                        placeholder="Notes about this projection scenario"
                      />
                    </div>
                  </div>
                </section>

                {!isCreating && selectedProjection && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-foreground">Projection Buckets</h2>
                      {isEditingPeriods ? (
                        <div className="flex gap-2">
                          <Button onClick={handleSavePeriods} disabled={updatingPeriods}>
                            {updatingPeriods ? 'Saving…' : 'Save Periods'}
                          </Button>
                          <Button variant="outline" onClick={() => setIsEditingPeriods(false)} disabled={updatingPeriods}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => setIsEditingPeriods(true)}>
                          Edit Periods
                        </Button>
                      )}
                    </div>

                    <div className="space-y-8">
                      {renderPeriodTable('Monthly End Balances (Next 12 Months)', selectedProjection.periods.monthly)}
                      {renderPeriodTable('Year-End Balances (Years 1 - 5)', selectedProjection.periods.yearly)}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Select a projection from the list or create a new one to get started.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ProjectionsPage;
