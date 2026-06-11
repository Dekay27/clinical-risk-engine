from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier


FEATURE_COLUMNS = [
    "race",
    "gender",
    "age",
    "admission_type_id",
    "discharge_disposition_id",
    "admission_source_id",
    "time_in_hospital",
    "num_lab_procedures",
    "num_procedures",
    "num_medications",
    "number_outpatient",
    "number_emergency",
    "number_inpatient",
    "number_diagnoses",
    "max_glu_serum",
    "A1Cresult",
    "metformin",
    "insulin",
    "change",
    "diabetesMed",
]

NUMERIC_COLUMNS = [
    "admission_type_id",
    "discharge_disposition_id",
    "admission_source_id",
    "time_in_hospital",
    "num_lab_procedures",
    "num_procedures",
    "num_medications",
    "number_outpatient",
    "number_emergency",
    "number_inpatient",
    "number_diagnoses",
]

CATEGORICAL_COLUMNS = [column for column in FEATURE_COLUMNS if column not in NUMERIC_COLUMNS]


def read_dataset(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, na_values=["?"], keep_default_na=False, low_memory=False)


def prepare_frame(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    working = df.copy()
    working = working[~working["discharge_disposition_id"].isin([11, 13, 14, 19, 20, 21])]
    working = working[working["gender"] != "Unknown/Invalid"]

    target = (working["readmitted"] == "<30").astype(int)
    features = working[FEATURE_COLUMNS].copy()

    for column in CATEGORICAL_COLUMNS:
        features[column] = features[column].replace("", "Unknown").fillna("Unknown")

    return features, target


def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("numeric", SimpleImputer(strategy="median"), NUMERIC_COLUMNS),
            (
                "categorical",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                CATEGORICAL_COLUMNS,
            ),
        ]
    )


def build_classifier(scale_pos_weight: float) -> XGBClassifier:
    return XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        n_estimators=250,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_lambda=1.5,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        n_jobs=4,
    )


def build_pipeline(scale_pos_weight: float) -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", SimpleImputer(strategy="median"), NUMERIC_COLUMNS),
            (
                "categorical",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                CATEGORICAL_COLUMNS,
            ),
        ]
    )

    classifier = XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        n_estimators=250,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_lambda=1.5,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        n_jobs=4,
    )

    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", classifier),
        ]
    )


def feature_defaults(features: pd.DataFrame) -> dict[str, object]:
    defaults: dict[str, object] = {}
    for column in FEATURE_COLUMNS:
        if column in NUMERIC_COLUMNS:
            defaults[column] = float(features[column].median())
        else:
            defaults[column] = str(features[column].mode(dropna=True).iloc[0])
    return defaults


def train(data_path: Path, artifact_path: Path) -> dict[str, float]:
    df = read_dataset(data_path)
    features, target = prepare_frame(df)

    x_train, x_test, y_train, y_test = train_test_split(
        features,
        target,
        test_size=0.2,
        random_state=42,
        stratify=target,
    )

    negatives = int((y_train == 0).sum())
    positives = int((y_train == 1).sum())
    preprocessor = build_preprocessor()
    classifier = build_classifier(scale_pos_weight=negatives / max(positives, 1))
    x_train_encoded = preprocessor.fit_transform(x_train)
    x_test_encoded = preprocessor.transform(x_test)
    classifier.fit(x_train_encoded, y_train)

    probabilities = classifier.predict_proba(x_test_encoded)[:, 1]
    metrics = {
        "auc_roc": round(float(roc_auc_score(y_test, probabilities)), 4),
        "average_precision": round(float(average_precision_score(y_test, probabilities)), 4),
        "training_rows": float(len(x_train)),
        "validation_rows": float(len(x_test)),
        "positive_rate": round(float(target.mean()), 4),
    }

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "preprocessor": preprocessor,
            "classifier": classifier,
            "metrics": metrics,
            "feature_columns": FEATURE_COLUMNS,
            "numeric_columns": NUMERIC_COLUMNS,
            "categorical_columns": CATEGORICAL_COLUMNS,
            "feature_defaults": feature_defaults(features),
        },
        artifact_path,
    )
    return metrics


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the 30-day readmission model.")
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("../diabetes_130_us_hospitals/diabetic_data.csv"),
        help="Path to diabetic_data.csv",
    )
    parser.add_argument(
        "--artifact",
        type=Path,
        default=Path("artifacts/readmission_model.joblib"),
        help="Output path for the trained model bundle",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    metrics = train(args.data.resolve(), args.artifact.resolve())
    print("Training complete")
    for key, value in metrics.items():
        print(f"{key}: {value}")
