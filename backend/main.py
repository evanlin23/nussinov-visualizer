from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from nussinov import get_dp_table, suboptimal_traceback, structures_to_dot_bracket, get_pair_frequencies

app = FastAPI(title="Nussinov RNA Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    sequence: str
    min_loop_length: int
    weights: Dict[str, Dict[str, float]]
    suboptimal_threshold: float = 0.0

@app.post("/api/predict")
def predict(req: PredictRequest):
    seq = req.sequence.upper()
    seq = "".join(seq.split())
    if not seq:
        return {"error": "Empty sequence"}
    if len(seq) > 50:
        return {"error": "Sequence too long (Max 50 constraint enforced)"}
        
    dp = get_dp_table(seq, req.min_loop_length, req.weights)
    paths, truncated = suboptimal_traceback(dp, seq, req.min_loop_length, req.weights, req.suboptimal_threshold)
    score = dp[0][len(seq)-1] if len(seq) > 0 else 0
    
    unique_paths = list(set([frozenset(p) for p in paths]))
    unique_paths_list = [list(p) for p in unique_paths]
    
    freq_matrix = get_pair_frequencies(unique_paths_list, len(seq))
    
    return {
        "sequence": seq,
        "score": round(score, 4),
        "num_structures": len(unique_paths_list),
        "truncated": truncated,
        "frequencies": freq_matrix
    }

frontend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")

if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")

    @app.get("/")
    def read_root():
        return FileResponse(os.path.join(frontend_path, "index.html"))
