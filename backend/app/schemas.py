from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Gender = Literal["female", "male", "other", "unknown"]
Hba1cCategory = Literal["none", "normal", "greater_7", "greater_8"]
MedicationStatus = Literal["no", "steady", "up", "down"]
DischargeDisposition = Literal["home", "transferred", "skilled_nursing", "other"]
RiskBand = Literal["low", "moderate", "high"]
ContributionDirection = Literal["increases", "decreases", "neutral"]
SuggestionPriority = Literal["low", "medium", "high"]


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class RiskAssessmentRequest(ApiModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        strict=True,
        json_schema_extra={
            "example": {
                "patient_id": "SIM-10492",
                "age": 65,
                "gender": "female",
                "hba1c_category": "greater_8",
                "number_medications": 14,
                "prior_inpatient_visits": 2,
                "prior_emergency_visits": 1,
                "metformin_status": "steady",
                "insulin_status": "up",
                "discharge_disposition": "home",
            }
        },
    )

    patient_id: str = Field(
        ...,
        min_length=1,
        max_length=64,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9_.:-]*$",
        description="Synthetic or de-identified patient identifier used by the UI session.",
        examples=["SIM-10492"],
    )
    age: int = Field(
        ...,
        ge=18,
        le=100,
        description="Patient age in years. Must be sent as a JSON number, not a string.",
        examples=[65],
    )
    gender: Gender = Field(
        ...,
        description="Clinician-selected gender category used by the model adapter.",
        examples=["female"],
    )
    hba1c_category: Hba1cCategory = Field(
        ...,
        description="Most recent HbA1c result bucket.",
        examples=["greater_8"],
    )
    number_medications: int = Field(
        ...,
        ge=0,
        le=80,
        description="Number of active medications listed for the encounter.",
        examples=[14],
    )
    prior_inpatient_visits: int = Field(
        ...,
        ge=0,
        le=20,
        description="Prior inpatient encounters before the index hospitalization.",
        examples=[2],
    )
    prior_emergency_visits: int = Field(
        ...,
        ge=0,
        le=20,
        description="Prior emergency visits before the index hospitalization.",
        examples=[1],
    )
    metformin_status: MedicationStatus = Field(
        ...,
        description="Medication status for metformin.",
        examples=["steady"],
    )
    insulin_status: MedicationStatus = Field(
        ...,
        description="Medication status for insulin.",
        examples=["up"],
    )
    discharge_disposition: DischargeDisposition = Field(
        ...,
        description="Simplified discharge disposition selected in the clinical UI.",
        examples=["home"],
    )


class ShapContribution(ApiModel):
    feature: str
    value: str
    impact: float = Field(
        ...,
        description="Local log-odds contribution. Positive values increase risk.",
        examples=[0.42],
    )
    direction: ContributionDirection


class ClinicalSuggestion(ApiModel):
    priority: SuggestionPriority
    title: str
    rationale: str


class ModelMetadata(ApiModel):
    model_name: str
    model_family: str
    training_dataset: str
    target: str
    auc_roc: float = Field(..., ge=0, le=1)
    disclaimer: str


class RiskAssessmentResponse(ApiModel):
    patient_id: str
    readmission_risk: float = Field(..., ge=0, le=1, examples=[0.74])
    risk_band: RiskBand
    shap_values: list[ShapContribution]
    suggestions: list[ClinicalSuggestion]
    metadata: ModelMetadata


class HealthResponse(ApiModel):
    status: Literal["ok"]
    model_loaded: bool
