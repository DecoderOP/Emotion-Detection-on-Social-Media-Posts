# app.py (Updated with Background Tasks)

import asyncio
import base64
import uuid
from io import BytesIO
from typing import Dict

import requests
from PIL import Image
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Import our modularized functions
from scraper import fetch_post_data_from_any_url
from ml_models import load_models, predict_caption, predict_image

# ----------------- App Setup -----------------
app = FastAPI(title="Instagram Emotion Analysis API")

# NEW: In-memory dictionary to store task results.
# For a production app, you would use a database like Redis or a task queue like Celery.
results: Dict[str, Dict] = {}

@app.on_event("startup")
def startup_event():
    load_models()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# ---------- API Request / Response Models ----------
class UrlRequest(BaseModel):
    url: str

class TextRequest(BaseModel):
    text: str
    
# ---------- NEW: Background Task Logic ----------

def run_analysis_task(task_id: str, url: str):
    """This function runs in the background and contains all our original logic."""
    try:
        # Step 1: Scrape
        scraped_data = fetch_post_data_from_any_url(url)
        caption = scraped_data.get("caption", "")
        media_url = scraped_data.get("media_urls", [None])[0]
        
        # Step 2: Analyze Text
        text_preds = predict_caption(caption) if caption and caption != "No caption found." else []

        # Step 3: Analyze Image
        image_preds = []
        media_data_url = None
        if media_url:
            try:
                response = requests.get(media_url, timeout=15)
                response.raise_for_status()
                image = Image.open(BytesIO(response.content))
                image_preds = predict_image(image)
                encoded_image = base64.b64encode(response.content).decode("utf-8")
                media_data_url = f"data:image/jpeg;base64,{encoded_image}"
            except Exception as e:
                print(f"Image processing failed: {e}")
        
        # Store the final, successful result
        results[task_id] = {
            "status": "complete",
            "data": {
                "caption": caption,
                "media_data_url": media_data_url,
                "text_predictions": text_preds,
                "image_predictions": image_preds,
            }
        }
    except Exception as e:
        print(f"Task {task_id} failed: {e}")
        # Store the error message
        results[task_id] = {"status": "failed", "error": str(e)}

# ---------- UPDATED AND NEW API Endpoints ----------

@app.post("/api/predict_url")
async def predict_from_url(req: UrlRequest, background_tasks: BackgroundTasks):
    """UPDATED: This endpoint now starts a background task and returns a task ID immediately."""
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Empty URL provided.")

    task_id = str(uuid.uuid4())
    results[task_id] = {"status": "pending"} # Set initial status
    
    # Start the long-running job in the background
    background_tasks.add_task(run_analysis_task, task_id, url)
    
    # Return immediately to the frontend
    return {"message": "Analysis started", "task_id": task_id}

@app.get("/api/result/{task_id}")
def get_result(task_id: str):
    """NEW: Frontend polls this endpoint to get the result."""
    result = results.get(task_id)
    if not result:
        raise HTTPException(status_code=404, detail="Task ID not found.")
    return result
    
@app.post("/api/predict_text")
async def predict_from_text(req: TextRequest):
    # This synchronous endpoint remains the same
    text = req.text.strip()
    if not text: raise HTTPException(status_code=400, detail="Empty text provided.")
    try:
        text_preds = await asyncio.to_thread(predict_caption, text)
        return {"caption": text, "text_predictions": text_preds}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

@app.get("/api/health")
def health():
    return {"status": "ok"}