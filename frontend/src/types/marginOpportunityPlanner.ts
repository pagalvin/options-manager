// Margin Opportunity Planner Types

export interface MarginMaster {
  id: number;
  current_outstanding_margin: number;
  current_margin_rate: number;
  last_updated: string;
  notes?: string;
}

export interface MarginPlanningOption {
  id: number;
  symbol: string;
  strike_date: string;
  strike_price: number;
  total_contracts: number;
  rollable: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarginPlan {
  id: number;
  week_ending: string;
  proposed_margin?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MarginPlanningGridRow {
  week_ending: string;
  likely_assignments: number;
  symbols_not_rollable: string;
  symmbols_rollable: string;
  proposed_margin?: number;
  margin_cost_weekly?: number;
  margin_impact: number;
  notes?: string;
  plan_id?: number;
}

// Form types for creating/editing
export interface MarginMasterForm {
  current_outstanding_margin: number;
  current_margin_rate: number;
  notes?: string;
}

export interface MarginPlanningOptionForm {
  symbol: string;
  strike_date: string;
  strike_price: number;
  total_contracts: number;
  rollable: boolean;
}

export interface MarginPlanForm {
  week_ending: string;
  proposed_margin?: number;
  notes?: string;
}
