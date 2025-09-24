// app.js (Updated with Polling Logic)

const API_BASE_URL = "http://127.0.0.1:8000";

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
  loaderText: document.querySelector("#loader-area p"), // Get the loader text element
};

// --- Helper Functions (showLoader, hideLoader, etc. remain the same) ---
const showLoader = (message = "Analyzing sentiment...") => {
  els.loaderText.textContent = message;
  els.loaderArea.classList.remove('hidden');
};

const hideLoader = () => {
  els.loaderArea.classList.add('hidden');
};

// --- Render functions (renderPredictions, renderMedia remain the same) ---
const makeGradientForIndex = (i) => {
  const hue = (i * 47) % 360;
  const color1 = `hsl(${hue} 95% 65%)`;
  const color2 = `hsl(${(hue + 40) % 360} 85% 56%)`;
  return `linear-gradient(90deg, ${color1}, ${color2})`;
};

const renderPredictions = (container, predictions, placeholderText) => {
  container.innerHTML = "";
  if (!predictions || predictions.length === 0) {
    container.innerHTML = `<div class="text-dark-muted">${placeholderText}</div>`;
    return;
  }
  predictions.forEach((pred, idx) => {
    const percentage = Math.round(pred.score * 100);
    container.innerHTML += `
      <div class="flex items-center space-x-4">
        <div class="w-24 text-sm font-medium text-dark-muted">${pred.label}</div>
        <div class="flex-1 bg-dark-background rounded-full h-2.5">
          <div class="rounded-full h-2.5 transition-all duration-500" style="width: ${percentage}%; background: ${makeGradientForIndex(idx)};"></div>
        </div>
        <div class="w-10 text-sm font-medium text-dark-muted text-right">${percentage}%</div>
      </div>`;
  });
};

const renderMedia = (media_data_url) => {
  if (media_data_url) {
    els.scrapedImage.src = media_data_url;
    els.scrapedImage.classList.remove('hidden');
    els.mediaPlaceholder.classList.add('hidden');
  } else {
    els.scrapedImage.src = "";
    els.scrapedImage.classList.add('hidden');
    els.mediaPlaceholder.classList.remove('hidden');
  }
};


// ---------- NEW POLLING LOGIC ----------
let pollingInterval;

const pollForResult = (taskId) => {
  // Stop any previous polling
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/result/${taskId}`);
      if (!res.ok) return; // Silently ignore errors, wait for next poll
      
      const result = await res.json();
      
      if (result.status === "pending") {
        console.log("Task is still pending...");
        showLoader("Analysis in progress... This may take a while if rate limits are hit.");
      } else if (result.status === "complete") {
        console.log("Task complete!", result.data);
        clearInterval(pollingInterval); // Stop polling
        hideLoader();
        
        // Render the final data
        const data = result.data;
        els.captionPreview.textContent = data.caption || "No caption found.";
        renderMedia(data.media_data_url);
        renderPredictions(els.predList, data.text_predictions, "No text predictions.");
        renderPredictions(els.imagePredList, data.image_predictions, "No image predictions.");
      } else if (result.status === "failed") {
        console.error("Task failed:", result.error);
        clearInterval(pollingInterval); // Stop polling
        hideLoader();
        els.captionPreview.textContent = `Error: ${result.error}`;
      }
    } catch (e) {
      console.error("Polling failed:", e);
    }
  }, 10000); // Poll every 5 seconds
};

// --- UPDATED Event listener for "Process URL" button ---
els.processUrl.addEventListener("click", async () => {
  const url = els.url.value.trim();
  if (!url) return;
  
  // Reset UI
  els.captionPreview.textContent = "Submitting URL for analysis...";
  renderPredictions(els.predList, [], "No text predictions yet.");
  renderPredictions(els.imagePredList, [], "No image predictions yet.");
  renderMedia(null);
  showLoader("Submitting task...");
  if (pollingInterval) clearInterval(pollingInterval); // Clear old polling
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/predict_url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Server error" }));
      throw new Error(err.detail);
    }
    
    const data = await res.json();
    // Start polling for the result using the received task_id
    pollForResult(data.task_id);
    
  } catch (err) {
    console.error(err);
    els.captionPreview.textContent = `Error: ${err.message}`;
    hideLoader();
  }
});

// Event listeners for "Clear" buttons
els.clearUrl.addEventListener("click", () => els.url.value = "");
els.clearText.addEventListener("click", () => els.text.value = "");

// The text-only prediction can remain synchronous as it's very fast
els.processText.addEventListener("click", async () => {
    // ... (Your original synchronous text prediction logic can go here)
});