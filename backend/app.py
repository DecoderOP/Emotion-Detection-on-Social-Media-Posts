import asyncio
from io import BytesIO
import base64

# NEW: Import libraries for image handling and downloading
import requests
from PIL import Image

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Import our modularized functions
from scraper import fetch_post_data
from ml_models import load_models, predict_caption, predict_image

# ----------------- App Setup -----------------
app = FastAPI(title="Instagram Emotion Analysis API")

# Load models on startup
@app.on_event("startup")
def startup_event():
    load_models()

# Allow all origins for dev/demo; restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- API Request / Response Models ----------
class UrlRequest(BaseModel):
    url: str

# ---------- API Endpoints ----------

@app.post("/api/predict_url")
async def predict_from_url(req: UrlRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Empty URL provided.")

    try:
        scraped_data = await asyncio.to_thread(fetch_post_data, url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {e}")

    caption = scraped_data.get("caption", "")
    media_url = scraped_data.get("media_urls", [None])[0]
    
    text_preds = await asyncio.to_thread(predict_caption, caption) if caption and caption != "No caption found." else []

    image_preds = []
    # UPDATED: We will now create a data URL instead of just sending the media_url
    media_data_url = None 
    if media_url:
        try:
            response = requests.get(media_url, timeout=15)
            response.raise_for_status()
            image = Image.open(BytesIO(response.content))
            
            image_preds = await asyncio.to_thread(predict_image, image)

            # NEW: Encode the downloaded image into a Base64 data URL
            encoded_image = base64.b64encode(response.content).decode("utf-8")
            media_data_url = f"data:image/jpeg;base64,{encoded_image}"

        except Exception as e:
            print(f"Could not process image URL {media_url}. Error: {e}")
            pass

    # UPDATED: Return the new media_data_url to the frontend
    return {
        "caption": caption,
        "media_data_url": media_data_url, # Changed from media_url
        "text_predictions": text_preds,
        "image_predictions": image_preds,
    }
@app.get("/api/health")
def health():
    return {"status": "ok"}