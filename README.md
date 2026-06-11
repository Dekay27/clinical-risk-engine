# SBMI Clinical Risk Explainability App

Production-style prototype for explainable clinical risk assessment, designed as a portfolio project for an MS application to UTHealth Houston SMBI's Research track.

The first milestone is a FastAPI backend with typed clinical inputs, a stable inference endpoint, local explainability contributions, and rule-based clinical suggestions. The scoring engine currently uses calibrated clinical heuristics when no trained artifact exists. Once trained, it uses an XGBoost model and native TreeSHAP-style contribution values from XGBoost.

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs will be available at:

```text
http://localhost:8000/docs
```

Example request:

```json
{
  "patient_id": "SIM-10492",
  "age": 65,
  "gender": "female",
  "hba1c_category": "greater_8",
  "number_medications": 14,
  "prior_inpatient_visits": 2,
  "prior_emergency_visits": 1,
  "metformin_status": "steady",
  "insulin_status": "up",
  "discharge_disposition": "home"
}
```

## Docker

```powershell
docker compose up --build
```

## Train The Readmission Model

Place the Diabetes 130-US hospitals files at:

```text
C:\dev\team-ai\diabetes_130_us_hospitals\
```

Then run:

```powershell
cd backend
pip install -r requirements.txt
python scripts\train_readmission_model.py
```

The training script saves:

```text
backend\artifacts\readmission_model.joblib
```

When that artifact exists, the API automatically uses the trained XGBoost pipeline and TreeSHAP-style explanations. Without the artifact, it falls back to the deterministic prototype engine so the app remains runnable.

## Planned Milestones

- Add a React and Tailwind bedside-style workstation UI.
- Add latency and model contract tests for the inference endpoint.
