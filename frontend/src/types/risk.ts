export type Gender = "female" | "male" | "other" | "unknown";
export type Hba1cCategory = "none" | "normal" | "greater_7" | "greater_8";
export type MedicationStatus = "no" | "steady" | "up" | "down";
export type DischargeDisposition = "home" | "transferred" | "skilled_nursing" | "other";
export type RiskBand = "low" | "moderate" | "high";
export type ContributionDirection = "increases" | "decreases" | "neutral";
export type SuggestionPriority = "low" | "medium" | "high";

export interface RiskAssessmentRequest {
  patient_id: string;
  age: number;
  gender: Gender;
  hba1c_category: Hba1cCategory;
  number_medications: number;
  prior_inpatient_visits: number;
  prior_emergency_visits: number;
  metformin_status: MedicationStatus;
  insulin_status: MedicationStatus;
  discharge_disposition: DischargeDisposition;
}

export interface ShapContribution {
  feature: string;
  value: string;
  impact: number;
  direction: ContributionDirection;
}

export interface ClinicalSuggestion {
  priority: SuggestionPriority;
  title: string;
  rationale: string;
}

export interface ModelMetadata {
  model_name: string;
  model_family: string;
  training_dataset: string;
  target: string;
  auc_roc: number;
  disclaimer: string;
}

export interface RiskAssessmentResponse {
  patient_id: string;
  readmission_risk: number;
  risk_band: RiskBand;
  shap_values: ShapContribution[];
  suggestions: ClinicalSuggestion[];
  metadata: ModelMetadata;
}
