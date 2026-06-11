import type { ModelMetadata, RiskAssessmentRequest, RiskAssessmentResponse } from "../types/risk";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class RiskApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RiskApiError";
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((item: { loc?: string[]; msg?: string }) => `${item.loc?.join(".") ?? "field"}: ${item.msg}`)
        .join("; ");
    }
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    return response.statusText || "Request failed";
  }
  return response.statusText || "Request failed";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      ...init,
    });
  } catch {
    throw new RiskApiError("Backend unavailable. Start the FastAPI service on port 8000.");
  }

  if (!response.ok) {
    throw new RiskApiError(await parseError(response), response.status);
  }

  return response.json() as Promise<T>;
}

export function predictRisk(payload: RiskAssessmentRequest): Promise<RiskAssessmentResponse> {
  return request<RiskAssessmentResponse>("/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMetadata(): Promise<ModelMetadata> {
  return request<ModelMetadata>("/metadata");
}
