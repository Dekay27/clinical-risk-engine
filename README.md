# Clinical Readmission Risk Explainability App

Production-style prototype for explainable clinical risk assessment, designed as a portfolio project for a health informatics research application.

The app combines a FastAPI inference backend with a React/Tailwind bedside-style workstation UI. It estimates 30-day diabetes readmission risk, explains the strongest local drivers for an individual patient, and returns rule-based clinical suggestions. If a trained artifact exists, the API uses an XGBoost model with TreeSHAP-style contribution values; otherwise, it falls back to a deterministic clinical-risk prototype so the app remains runnable.

## Problem Statement

Hospital readmission risk models are often difficult to inspect at the point of care. This project asks whether a lightweight clinical decision-support prototype can expose both a readmission risk estimate and the patient-specific factors driving that estimate in a format a physician could scan quickly.

The target task is binary classification: predict whether a diabetes encounter is followed by hospital readmission within 30 days.

## Dataset Source

The model uses the Diabetes 130-US hospitals dataset for years 1999-2008. The dataset contains de-identified inpatient encounters for patients with diabetes, including demographics, admission/discharge context, laboratory/procedure counts, medication status, and readmission outcome.

The dataset predates contemporary EHR systems and ICD-10 coding. Findings should be interpreted as a methodological demonstration rather than a reflection of current clinical practice.

Expected local files:

```text
diabetes_130_us_hospitals/diabetic_data.csv
diabetes_130_us_hospitals/IDS_mapping.csv
```

## Preprocessing Approach

The training pipeline is implemented in `backend/scripts/train_readmission_model.py`.

Key preprocessing steps:

- Read `?` values as missing values.
- Remove encounters with discharge dispositions associated with death or hospice care.
- Remove records with `Unknown/Invalid` gender.
- Define the target as `readmitted == "<30"`.
- Use the EHR-derived feature set summarized below.
- Impute numeric fields with the training-set median.
- Impute categorical fields with the most frequent category.
- One-hot encode categorical variables with `handle_unknown="ignore"` for stable inference.
- Use a stratified 80/20 train-validation split with `random_state=42`.
- Store feature defaults so the API can map simplified UI inputs into the trained model schema.

Feature set used for model training:

| Feature | Type | Source domain |
| --- | --- | --- |
| `race` | Categorical | Demographics |
| `gender` | Categorical | Demographics |
| `age` | Categorical age bucket | Demographics |
| `admission_type_id` | Numeric ID | Encounter |
| `discharge_disposition_id` | Numeric ID | Encounter |
| `admission_source_id` | Numeric ID | Encounter |
| `time_in_hospital` | Numeric | Encounter |
| `num_lab_procedures` | Numeric | Laboratory utilization |
| `num_procedures` | Numeric | Procedure utilization |
| `num_medications` | Numeric | Medication burden |
| `number_outpatient` | Numeric | Prior utilization |
| `number_emergency` | Numeric | Prior utilization |
| `number_inpatient` | Numeric | Prior utilization |
| `number_diagnoses` | Numeric | Clinical complexity |
| `max_glu_serum` | Categorical | Laboratory result |
| `A1Cresult` | Categorical | Laboratory result |
| `metformin` | Categorical | Medication status |
| `insulin` | Categorical | Medication status |
| `change` | Categorical | Medication change |
| `diabetesMed` | Categorical | Medication use |

## Why XGBoost

XGBoost was selected because the dataset is tabular, mixed-type, imbalanced, and likely to contain nonlinear interactions between utilization history, discharge disposition, age, medication patterns, and lab categories. Gradient-boosted trees are a strong baseline for this kind of structured clinical data and support native contribution-style explanations through XGBoost's `pred_contribs`, which fits the goal of showing local risk drivers in the UI.

The classifier uses:

- `objective="binary:logistic"`
- `eval_metric="auc"`
- `n_estimators=250`
- `max_depth=4`
- `learning_rate=0.05`
- `subsample=0.85`
- `colsample_bytree=0.85`
- `reg_lambda=1.5`
- `scale_pos_weight` based on the negative-to-positive class ratio

## Evaluation Metrics

The project reports:

- **ROC-AUC:** Threshold-independent ranking performance across positive and negative encounters.
- **Average precision:** Precision-recall summary, useful because 30-day readmission is relatively uncommon.
- **Positive rate:** The proportion of encounters labeled as readmitted within 30 days.
- **Training and validation row counts:** Basic reproducibility checks for the split.

## Results

Latest local training run:

| Metric | Value |
| --- | ---: |
| ROC-AUC | 0.6714 |
| Average precision | 0.2253 |
| Training rows | 79,472 |
| Validation rows | 19,868 |
| Positive rate | 0.1139 |

Published baselines on the Diabetes 130-US Hospitals dataset report ROC-AUC values in the 0.63 to 0.72 range. These results are consistent with that range and appropriate for a research prototype.

This app is a portfolio demonstration, not a clinical deployment. It includes an explicit disclaimer that it is not intended for diagnosis, treatment, or operational clinical decision-making.

## Example Explanation Output

For the sample patient `SIM-10492`, the trained XGBoost artifact returned a moderate 30-day readmission risk of `0.520`. The frontend displays the top local contribution drivers as a ranked bar chart, where positive values push risk upward and negative values push risk downward.

Example contribution output:

| Feature | Value | Impact | Direction |
| --- | --- | ---: | --- |
| `number inpatient` | `2` | 0.4126 | Increases risk |
| `metformin Steady` | `Steady` | -0.1310 | Decreases risk |
| `discharge disposition id` | `1` | -0.1209 | Decreases risk |
| `number emergency` | `1` | 0.0914 | Increases risk |
| `metformin No` | `0` | -0.0842 | Decreases risk |
| `A1Cresult None` | `>8` | -0.0713 | Decreases risk |
| `num medications` | `14` | -0.0362 | Decreases risk |
| `number diagnoses` | `8.0` | 0.0314 | Increases risk |

For one-hot encoded category features, a value of `0` means the patient does not belong to that encoded category.

The bedside view pairs this explanation with clinical suggestions such as reviewing glycemic control, coordinating discharge follow-up, and considering medication reconciliation. This makes the decision-support output more than a score: the physician can inspect which patient-specific factors are driving the estimate before acting on it.

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

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Local frontend URL:

```text
http://localhost:5173
```

The public XAMPP deployment is served from:

```text
https://remote.hightelconsult.com/clinical-risk-engine
```

## Train The Readmission Model

Place the Diabetes 130-US hospitals files at:

```text
diabetes_130_us_hospitals/
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

When that artifact exists, the API automatically uses the trained XGBoost pipeline and TreeSHAP-style explanations after the backend process is restarted. Without the artifact, it falls back to the deterministic prototype engine so the app remains runnable.

## Docker

```powershell
docker compose up --build
```

## Future Directions

- Add model contract tests for the inference endpoint.
- Add latency checks for local and public deployment paths.
- Add calibration and threshold analysis for readmission-risk bands.
