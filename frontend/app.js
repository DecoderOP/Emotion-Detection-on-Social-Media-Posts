// app.js (Complete and Updated)

// Base URL for your backend API
const API_BASE_URL = "http://127.0.0.1:8000"; // Adjust if your backend runs elsewhere

// Get references to all the necessary DOM elements
const els = {
  url: document.getElementById("ig-url"),
  processUrl: document.getElementById("process-url"),
  clearUrl: document.getElementById("clear-url"),
  text: document.getElementById("caption-text"),
  processText: document.getElementById("process-text"),
  clearText: document.getElementById("clear-text"),
  captionPreview: document.getElementById("caption-preview"),
  predList: document.getElementById("pred-list"),
  loaderArea: document.getElementById("loader-area"),
  scrapedImage: document.getElementById("scraped-image"),
  mediaPlaceholder: document.getElementById("media-placeholder"),
  imagePredList: document.getElementById("image-pred-list"),
};

// Helper function to show the loader
const showLoader = () => {
  els.loaderArea.classList.remove('hidden');
};

// Helper function to hide the loader
const hideLoader = () => {
  els.loaderArea.classList.add('hidden');
};

// Create a distinct gradient for each label index
const makeGradientForIndex = (i) => {
  const hue = (i * 47) % 360;
  const color1 = `hsl(${hue} 95% 65%)`;
  const color2 = `hsl(${(hue + 40) % 360} 85% 56%)`;
  return `linear-gradient(90deg, ${color1}, ${color2})`;
};

// Renders prediction bars into a specified container element
const renderPredictions = (container, predictions, placeholderText) => {
  container.innerHTML = ""; // Clear previous results
  if (!predictions || predictions.length === 0) {
    container.innerHTML = `<div class="text-dark-muted">${placeholderText}</div>`;
    return;
  }
  
  predictions.forEach((pred, idx) => {
    const percentage = Math.round(pred.score * 100);
    const predictionHtml = `
      <div class="flex items-center space-x-4">
        <div class="w-24 text-sm font-medium text-dark-muted">${pred.label}</div>
        <div class="flex-1 bg-dark-background rounded-full h-2.5">
          <div class="rounded-full h-2.5 transition-all duration-500" style="width: ${percentage}%; background: ${makeGradientForIndex(idx)};"></div>
        </div>
        <div class="w-10 text-sm font-medium text-dark-muted text-right">${percentage}%</div>
      </div>
    `;
    container.innerHTML += predictionHtml;
  });
};

// Renders the scraped image using its Base64 data URL
const renderMedia = (media_data_url) => {
  if (media_data_url) {
    els.scrapedImage.src = media_data_url;
    els.scrapedImage.classList.remove('hidden');
    els.mediaPlaceholder.classList.add('hidden');
  } else {
    els.scrapedImage.src = ""; // Clear the src
    els.scrapedImage.classList.add('hidden');
    els.mediaPlaceholder.classList.remove('hidden');
  }
};

// Event listener for "Process URL" button
els.processUrl.addEventListener("click", async () => {
  const url = els.url.value.trim();
  if (!url) return;
  
  // Reset UI
  els.captionPreview.textContent = "Processing URL...";
  renderPredictions(els.predList, [], "No text predictions yet.");
  renderPredictions(els.imagePredList, [], "No image predictions yet.");
  renderMedia(null);
  showLoader();
  
  try {
    const res = await fetch(API_BASE_URL + "/api/predict_url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "An unknown server error occurred." }));
      throw new Error(err.detail);
    }
    
    const data = await res.json();
    
    // Render all parts of the new API response
    els.captionPreview.textContent = data.caption || "No caption found.";
    renderMedia(data.media_data_url);
    renderPredictions(els.predList, data.text_predictions, "No text predictions returned.");
    renderPredictions(els.imagePredList, data.image_predictions, "No image predictions returned.");
    
  } catch (err) {
    console.error(err);
    els.captionPreview.textContent = "Error: " + err.message;
    els.predList.innerHTML = `<div class="text-rose-400">Prediction failed. Check console for details.</div>`;
    els.imagePredList.innerHTML = "";
  } finally {
    hideLoader();
  }
});

// Event listener for "Process Text" button (handles text-only predictions)
els.processText.addEventListener("click", async () => {
  const text = els.text.value.trim();
  if (!text) return;
  
  // This endpoint is not in the final app.py, but keeping the logic as per your original file
  // You would need to add a /api/predict_text endpoint to your final app.py for this to work
  console.warn("Note: The /api/predict_text endpoint is not part of the final integrated backend.");

  els.captionPreview.textContent = "Processing text...";
  renderPredictions(els.predList, [], "No predictions yet.");
  renderPredictions(els.imagePredList, [], "No image predictions yet.");
  renderMedia(null);
  showLoader();
  
  // This part would require a separate /api/predict_text endpoint in the final app.py
  // For now, it will likely fail unless you've added it.
  try {
    const res = await fetch(API_BASE_URL + "/api/predict_text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Server error" }));
      throw new Error(err.detail);
    }
    
    const data = await res.json();
    els.captionPreview.textContent = data.caption || "No caption found.";
    renderPredictions(els.predList, data.text_predictions, "No predictions returned.");
    
  } catch (err) {
    console.error(err);
    els.captionPreview.textContent = "Error: " + err.message;
    els.predList.innerHTML = `<div class="text-rose-400">Prediction failed.</div>`;
  } finally {
    hideLoader();
  }
});

// Event listeners for "Clear" buttons
els.clearUrl.addEventListener("click", () => els.url.value = "");
els.clearText.addEventListener("click", () => els.text.value = "");