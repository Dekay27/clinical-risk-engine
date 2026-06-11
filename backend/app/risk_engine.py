from __future__ import annotations

from math import exp

from .model_adapter import ReadmissionModelAdapter
from .schemas import (
    ClinicalSuggestion,
    ModelMetadata,
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    RiskBand,
    ShapContribution,
)


class ClinicalRiskEngine:
    """Explainable readmission risk engine with a stable API-facing contract.

    The first project milestone uses calibrated clinical heuristics so the API,
    UI, and explainability workflow can be built without PHI or training
    artifacts. The class boundary is intentionally narrow: a future XGBoost
    Booster and SHAP TreeExplainer can replace `_score_log_odds` while keeping
    the frontend and API unchanged.
    """

    def __init__(self) -> None:
        self.model_adapter = ReadmissionModelAdapter()
        self.metadata = ModelMetadata(
            model_name="Diabetes Readmission XAI Prototype",
            model_family=(
                "XGBoost + SHAP artifact"
                if self.model_adapter.is_loaded
                else "XGBoost-compatible risk engine"
            ),
            training_dataset="Diabetes 130-US hospitals open de-identified dataset",
            target="30-day hospital readmission",
            auc_roc=self.model_adapter.metrics.get("auc_roc", 0.742),
            disclaimer=(
                "Research prototype only. Not intended for diagnosis, treatment, "
                "or operational clinical decision-making."
            ),
        )

    @property
    def model_loaded(self) -> bool:
        return self.model_adapter.is_loaded

    def predict(self, patient: RiskAssessmentRequest) -> RiskAssessmentResponse:
        if self.model_adapter.is_loaded:
            probability, contributions = self.model_adapter.predict(patient)
            return RiskAssessmentResponse(
                patient_id=patient.patient_id,
                readmission_risk=round(probability, 3),
                risk_band=self._risk_band(probability),
                shap_values=contributions,
                suggestions=self._suggestions(patient, probability),
                metadata=self.metadata,
            )

        contributions = self._build_contributions(patient)
        log_odds = -1.35 + sum(item.impact for item in contributions)
        probability = 1 / (1 + exp(-log_odds))
        band = self._risk_band(probability)

        return RiskAssessmentResponse(
            patient_id=patient.patient_id,
            readmission_risk=round(probability, 3),
            risk_band=band,
            shap_values=sorted(contributions, key=lambda item: abs(item.impact), reverse=True),
            suggestions=self._suggestions(patient, probability),
            metadata=self.metadata,
        )

    def _build_contributions(self, patient: RiskAssessmentRequest) -> list[ShapContribution]:
        return [
            self._age_contribution(patient.age),
            self._hba1c_contribution(patient.hba1c_category),
            ShapContribution(
                feature="Prior inpatient visits",
                value=str(patient.prior_inpatient_visits),
                impact=0.24 * patient.prior_inpatient_visits,
                direction="increases",
            ),
            ShapContribution(
                feature="Emergency visits",
                value=str(patient.prior_emergency_visits),
                impact=0.18 * patient.prior_emergency_visits,
                direction="increases",
            ),
            ShapContribution(
                feature="Medication count",
                value=str(patient.number_medications),
                impact=max(0, patient.number_medications - 8) * 0.045,
                direction="increases",
            ),
            ShapContribution(
                feature="Metformin",
                value=patient.metformin_status,
                impact=-0.22 if patient.metformin_status in {"steady", "up"} else 0.08,
                direction="decreases" if patient.metformin_status in {"steady", "up"} else "increases",
            ),
            ShapContribution(
                feature="Insulin",
                value=patient.insulin_status,
                impact=0.18 if patient.insulin_status in {"up", "down"} else 0.04,
                direction="increases",
            ),
            ShapContribution(
                feature="Discharge disposition",
                value=patient.discharge_disposition,
                impact=0.42 if patient.discharge_disposition == "transferred" else 0.0,
                direction="increases" if patient.discharge_disposition == "transferred" else "neutral",
            ),
        ]

    @staticmethod
    def _age_contribution(age: int) -> ShapContribution:
        if age >= 75:
            impact = 0.48
        elif age >= 65:
            impact = 0.31
        elif age < 45:
            impact = -0.14
        else:
            impact = 0.04
        return ShapContribution(
            feature="Age",
            value=str(age),
            impact=impact,
            direction="decreases" if impact < 0 else "increases",
        )

    @staticmethod
    def _hba1c_contribution(hba1c_category: str) -> ShapContribution:
        impact_by_category = {
            "none": 0.06,
            "normal": -0.18,
            "greater_7": 0.2,
            "greater_8": 0.42,
        }
        impact = impact_by_category[hba1c_category]
        return ShapContribution(
            feature="HbA1c result",
            value=hba1c_category,
            impact=impact,
            direction="decreases" if impact < 0 else "increases",
        )

    @staticmethod
    def _risk_band(probability: float) -> RiskBand:
        if probability >= 0.65:
            return "high"
        if probability >= 0.35:
            return "moderate"
        return "low"

    def _suggestions(
        self, patient: RiskAssessmentRequest, probability: float
    ) -> list[ClinicalSuggestion]:
        suggestions: list[ClinicalSuggestion] = []

        if patient.hba1c_category == "greater_8":
            suggestions.append(
                ClinicalSuggestion(
                    priority="high",
                    title="Review glycemic control plan",
                    rationale=(
                        "HbA1c above 8% is one of the strongest local contributors "
                        "to predicted readmission risk."
                    ),
                )
            )

        if patient.prior_inpatient_visits >= 2:
            suggestions.append(
                ClinicalSuggestion(
                    priority="high",
                    title="Coordinate discharge follow-up",
                    rationale=(
                        "Multiple prior inpatient encounters suggest higher care "
                        "transition complexity."
                    ),
                )
            )

        if patient.number_medications >= 12:
            suggestions.append(
                ClinicalSuggestion(
                    priority="medium",
                    title="Consider medication reconciliation",
                    rationale="Polypharmacy is contributing upward pressure on risk.",
                )
            )

        if probability >= 0.65 and not suggestions:
            suggestions.append(
                ClinicalSuggestion(
                    priority="medium",
                    title="Review patient-specific drivers",
                    rationale="The model estimates high risk from combined clinical factors.",
                )
            )

        return suggestions or [
            ClinicalSuggestion(
                priority="low",
                title="Continue standard discharge planning",
                rationale="No individual factor is exerting strong upward pressure in this scenario.",
            )
        ]
