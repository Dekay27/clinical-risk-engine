from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .risk_engine import ClinicalRiskEngine
from .schemas import HealthResponse, ModelMetadata, RiskAssessmentRequest, RiskAssessmentResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.risk_engine = ClinicalRiskEngine()
    yield


app = FastAPI(
    title="TEAM-AI Clinical Risk Explainability API",
    description=(
        "FastAPI service for explainable 30-day readmission risk assessment. "
        "The current engine exposes a stable production API and can load trained "
        "XGBoost/SHAP artifacts when available."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_risk_engine() -> ClinicalRiskEngine:
    if not hasattr(app.state, "risk_engine"):
        app.state.risk_engine = ClinicalRiskEngine()
    return app.state.risk_engine


@app.get("/health", response_model=HealthResponse, tags=["service"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", model_loaded=get_risk_engine().model_loaded)


@app.get("/metadata", response_model=ModelMetadata, tags=["model"])
def metadata() -> ModelMetadata:
    return get_risk_engine().metadata


@app.post("/predict", response_model=RiskAssessmentResponse, tags=["inference"])
def predict_readmission_risk(payload: RiskAssessmentRequest) -> RiskAssessmentResponse:
    return get_risk_engine().predict(payload)
