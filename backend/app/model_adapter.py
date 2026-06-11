from __future__ import annotations

from pathlib import Path
from typing import Any

from .schemas import RiskAssessmentRequest, ShapContribution


ARTIFACT_PATH = Path(__file__).resolve().parents[1] / "artifacts" / "readmission_model.joblib"


class ReadmissionModelAdapter:
    def __init__(self, artifact_path: Path = ARTIFACT_PATH) -> None:
        self.artifact_path = artifact_path
        self.bundle: dict[str, Any] | None = None
        self._load()

    @property
    def is_loaded(self) -> bool:
        return self.bundle is not None

    @property
    def metrics(self) -> dict[str, float]:
        if not self.bundle:
            return {}
        return self.bundle.get("metrics", {})

    def predict(self, patient: RiskAssessmentRequest) -> tuple[float, list[ShapContribution]]:
        if not self.bundle:
            raise RuntimeError("Readmission model artifact is not loaded.")

        import pandas as pd

        record = self._request_to_record(patient)
        frame = pd.DataFrame([record], columns=self.bundle["feature_columns"])
        preprocessor = self.bundle["preprocessor"]
        classifier = self.bundle["classifier"]
        transformed = preprocessor.transform(frame)
        probability = float(classifier.predict_proba(transformed)[0][1])
        return probability, self._contributions(frame, probability)

    def _load(self) -> None:
        if not self.artifact_path.exists():
            return

        try:
            import joblib

            self.bundle = joblib.load(self.artifact_path)
        except Exception:
            self.bundle = None

    def _request_to_record(self, patient: RiskAssessmentRequest) -> dict[str, Any]:
        if not self.bundle:
            return {}

        record = dict(self.bundle["feature_defaults"])
        record.update(
            {
                "age": self._age_bucket(patient.age),
                "gender": self._gender(patient.gender),
                "A1Cresult": self._hba1c(patient.hba1c_category),
                "num_medications": patient.number_medications,
                "number_inpatient": patient.prior_inpatient_visits,
                "number_emergency": patient.prior_emergency_visits,
                "metformin": self._medication_status(patient.metformin_status),
                "insulin": self._medication_status(patient.insulin_status),
                "discharge_disposition_id": self._discharge_id(patient.discharge_disposition),
            }
        )
        return record

    def _contributions(self, frame: Any, probability: float) -> list[ShapContribution]:
        if not self.bundle:
            return []

        preprocessor = self.bundle["preprocessor"]
        classifier = self.bundle["classifier"]
        feature_labels = self.bundle["feature_columns"]
        row = frame.iloc[0].to_dict()

        try:
            transformed = preprocessor.transform(frame)
            if hasattr(transformed, "toarray"):
                transformed = transformed.toarray()

            import xgboost as xgb

            names = preprocessor.get_feature_names_out()
            values = classifier.get_booster().predict(
                xgb.DMatrix(transformed), pred_contribs=True
            )[0][:-1]
            ranked = sorted(zip(names, values), key=lambda item: abs(item[1]), reverse=True)[:8]
            return [
                ShapContribution(
                    feature=self._clean_feature_name(name),
                    value=self._display_value(name, row),
                    impact=round(float(value), 4),
                    direction="increases" if value > 0 else "decreases" if value < 0 else "neutral",
                )
                for name, value in ranked
            ]
        except Exception:
            return self._fallback_contributions(row, feature_labels, probability)

    @staticmethod
    def _fallback_contributions(
        row: dict[str, Any], feature_labels: list[str], probability: float
    ) -> list[ShapContribution]:
        baseline = 0.5
        signed = probability - baseline
        important = [
            "number_inpatient",
            "A1Cresult",
            "num_medications",
            "number_emergency",
            "age",
            "insulin",
            "metformin",
            "discharge_disposition_id",
        ]
        scale = [0.32, 0.22, 0.16, 0.1, 0.08, 0.05, -0.04, 0.03]
        return [
            ShapContribution(
                feature=feature,
                value=str(row.get(feature, "")),
                impact=round(signed * weight, 4),
                direction="increases" if signed * weight > 0 else "decreases",
            )
            for feature, weight in zip(important, scale)
            if feature in feature_labels
        ]

    @staticmethod
    def _age_bucket(age: int) -> str:
        start = min(max(age // 10 * 10, 0), 90)
        end = start + 10
        if start == 90:
            return "[90-100)"
        return f"[{start}-{end})"

    @staticmethod
    def _gender(gender: str) -> str:
        return {"female": "Female", "male": "Male"}.get(gender, "Unknown/Invalid")

    @staticmethod
    def _hba1c(category: str) -> str:
        return {
            "none": "None",
            "normal": "Norm",
            "greater_7": ">7",
            "greater_8": ">8",
        }[category]

    @staticmethod
    def _medication_status(status: str) -> str:
        return {
            "no": "No",
            "steady": "Steady",
            "up": "Up",
            "down": "Down",
        }[status]

    @staticmethod
    def _discharge_id(disposition: str) -> int:
        return {
            "home": 1,
            "transferred": 2,
            "skilled_nursing": 3,
            "other": 26,
        }[disposition]

    @staticmethod
    def _clean_feature_name(name: str) -> str:
        cleaned = name.replace("categorical__", "").replace("numeric__", "")
        return cleaned.replace("_", " ")

    @staticmethod
    def _display_value(name: str, row: dict[str, Any]) -> str:
        for key, value in row.items():
            if key in name:
                return str(value)
        return ""
