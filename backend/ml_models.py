import os
from typing import List, Dict, Any
from PIL import Image

import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from transformers import AutoImageProcessor, AutoModelForImageClassification as AutoImageModel

# --- Configuration ---
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
TEXT_MODEL_DIR = "../goemotions_model_complete"
IMAGE_MODEL_DIR = "../fer2013_emotion_model_final" # <-- Make sure this path is correct

# --- Global Model Storage ---
models = {}

def load_models():
    """Loads all ML models into the global 'models' dictionary on startup."""
    # --- Load Text Model ---
    print(f"Loading text model from: {TEXT_MODEL_DIR}")
    text_tokenizer = AutoTokenizer.from_pretrained(TEXT_MODEL_DIR)
    text_model = AutoModelForSequenceClassification.from_pretrained(TEXT_MODEL_DIR)
    text_model.to(DEVICE)
    text_model.eval()
    models['text_tokenizer'] = text_tokenizer
    models['text_model'] = text_model
    models['text_id2label'] = text_model.config.id2label
    print("Text model loaded.")

    # --- Load Image Model ---
    print(f"Loading image model from: {IMAGE_MODEL_DIR}")
    image_processor = AutoImageProcessor.from_pretrained(IMAGE_MODEL_DIR)
    image_model = AutoImageModel.from_pretrained(IMAGE_MODEL_DIR)
    image_model.to(DEVICE)
    image_model.eval()
    models['image_processor'] = image_processor
    models['image_model'] = image_model
    models['image_id2label'] = image_model.config.id2label
    print("Image model loaded.")

def predict_caption(caption: str) -> List[Dict[str, Any]]:
    """Predicts emotions from a text caption."""
    inputs = models['text_tokenizer'](caption, padding=True, truncation=True, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        logits = models['text_model'](**inputs).logits
    
    probs = F.softmax(logits, dim=-1).cpu().numpy()[0]
    top_preds = sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)[:7]
    return [{"label": models['text_id2label'][i], "score": float(probs[i])} for i in top_preds]

def predict_image(image: Image.Image) -> List[Dict[str, Any]]:
    """Predicts emotions from a PIL image."""
    if image.mode != "RGB":
        image = image.convert("RGB")
        
    inputs = models['image_processor'](images=image, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        logits = models['image_model'](**inputs).logits

    probs = F.softmax(logits, dim=-1).cpu().numpy()[0]
    top_preds = sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)[:7]
    return [{"label": models['image_id2label'][i], "score": float(probs[i])} for i in top_preds]