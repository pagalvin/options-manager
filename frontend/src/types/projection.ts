export type ProjectionPeriodType = 'MONTH' | 'YEAR';

export interface ProjectionSummary {
  id: number;
  name: string;
  description: string | null;
  assumed_roc_percent: number;
  projection_start_date: string;
  starting_capital: number;
  monthly_infusion: number;
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectionPeriod {
  id: number;
  projection_id: number;
  period_type: ProjectionPeriodType;
  period_index: number;
  period_start: string | null;
  period_end: string | null;
  expected_balance: number | null;
  actual_balance: number | null;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectionDetail extends ProjectionSummary {
  periods: {
    monthly: ProjectionPeriod[];
    yearly: ProjectionPeriod[];
  };
}

export interface ProjectionFormState {
  id?: number;
  name: string;
  description: string;
  assumed_roc_percent: number;
  projection_start_date: string;
  starting_capital: number;
  monthly_infusion: number;
}
