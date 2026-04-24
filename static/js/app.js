// DOM Elements - Upload
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const previewImage = document.getElementById('previewImage');
const clearButton = document.getElementById('clearButton');

// DOM Elements - Tabs
const uploadTab = document.getElementById('uploadTab');
const drawTab = document.getElementById('drawTab');
const uploadContent = document.getElementById('uploadContent');
const drawContent = document.getElementById('drawContent');

// DOM Elements - Canvas
const drawingCanvas = document.getElementById('drawingCanvas');
const ctx = drawingCanvas ? drawingCanvas.getContext('2d') : null;
const brushTool = document.getElementById('brushTool');
const eraserTool = document.getElementById('eraserTool');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const brushSizeValue = document.getElementById('brushSizeValue');
const clearCanvas = document.getElementById('clearCanvas');
const undoCanvas = document.getElementById('undoCanvas');
const submitDrawing = document.getElementById('submitDrawing');

// DOM Elements - Results
const loading = document.getElementById('loading');
const resultsSection = document.getElementById('resultsSection');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const topPrediction = document.getElementById('topPrediction');
const topConfidence = document.getElementById('topConfidence');
const topPokemonImage = document.getElementById('topPokemonImage');
const predictionsList = document.getElementById('predictionsList');
const tryAgainButton = document.getElementById('tryAgainButton');
const errorTryAgainButton = document.getElementById('errorTryAgainButton');

// State
let selectedFile = null;
let isDrawing = false;
let currentTool = 'brush';
let currentColor = '#000000';
let currentBrushSize = 5;
let canvasHistory = [];

// === Event Listeners === //

// Click to upload
uploadZone.addEventListener('click', () => {
    fileInput.click();
});

// File input change
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
});

// Drag and drop events
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleFile(file);
    } else {
        showError('Please drop an image file');
    }
});

// Clear button
clearButton.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUpload();
});

// Try again buttons
tryAgainButton.addEventListener('click', resetUpload);
errorTryAgainButton.addEventListener('click', resetUpload);

// === Tab Switching === //
uploadTab.addEventListener('click', () => switchTab('upload'));
drawTab.addEventListener('click', () => switchTab('draw'));

// === Canvas Event Listeners === //
if (drawingCanvas) {
    // Mouse events
    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('mouseout', stopDrawing);

    // Touch events for mobile
    drawingCanvas.addEventListener('touchstart', handleTouchStart);
    drawingCanvas.addEventListener('touchmove', handleTouchMove);
    drawingCanvas.addEventListener('touchend', stopDrawing);
}

// Tool selection
brushTool.addEventListener('click', () => selectTool('brush'));
eraserTool.addEventListener('click', () => selectTool('eraser'));

// Color picker
colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
});

// Color presets
document.querySelectorAll('.color-preset').forEach(preset => {
    preset.addEventListener('click', (e) => {
        const color = e.target.getAttribute('data-color');
        currentColor = color;
        colorPicker.value = color;
    });
});

// Brush size
brushSize.addEventListener('input', (e) => {
    currentBrushSize = e.target.value;
    brushSizeValue.textContent = e.target.value;
});

// Canvas actions
clearCanvas.addEventListener('click', clearCanvasDrawing);
undoCanvas.addEventListener('click', undoCanvasDrawing);
submitDrawing.addEventListener('click', submitCanvasDrawing);

// === Core Functions === //

/**
 * Handle file selection
 */
function handleFile(file) {
    selectedFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        uploadZone.style.display = 'none';
        previewSection.style.display = 'block';

        // Auto-submit for prediction
        setTimeout(() => {
            submitPrediction();
        }, 500);
    };
    reader.readAsDataURL(file);
}

/**
 * Submit image for prediction
 */
async function submitPrediction() {
    if (!selectedFile) {
        showError('No file selected');
        return;
    }

    // Hide preview and show loading
    previewSection.style.display = 'none';
    loading.style.display = 'block';
    resultsSection.style.display = 'none';
    errorMessage.style.display = 'none';

    // Create form data
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
        // Send request to backend
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        // Hide loading
        loading.style.display = 'none';

        if (data.success) {
            displayResults(data);
        } else {
            showError(data.error || 'An error occurred during prediction');
        }
    } catch (error) {
        loading.style.display = 'none';
        showError('Network error: ' + error.message);
    }
}

/**
 * Display prediction results
 */
function displayResults(data) {
    // Show results section
    resultsSection.style.display = 'block';

    // Display top prediction
    topPrediction.textContent = data.top_prediction;
    topConfidence.textContent = `${data.predictions[0].probability}% confidence`;

    // Display top Pokemon image
    if (data.predictions[0].image_url) {
        topPokemonImage.src = data.predictions[0].image_url;
        topPokemonImage.style.display = 'block';
    } else {
        topPokemonImage.style.display = 'none';
    }

    // Display Pokedex info
    const pokedexInfo = document.getElementById('pokedexInfo');
    if (data.pokemon_info) {
        const pokemonNumber = document.getElementById('pokemonNumber');
        const pokedexDescription = document.getElementById('pokedexDescription');
        const statsGrid = document.getElementById('statsGrid');

        // Debug: log the pokemon_info to see what we're getting
        console.log('Pokemon Info:', data.pokemon_info);

        // Display Pokemon number
        if (data.pokemon_info.number) {
            pokemonNumber.textContent = `#${String(data.pokemon_info.number).padStart(4, '0')}`;
            pokemonNumber.style.display = 'inline-block';
        } else {
            pokemonNumber.style.display = 'none';
        }

        // Display description with type emojis
        const descriptionText = data.pokemon_info.type_emojis
            ? `${data.pokemon_info.type_emojis} ${data.pokemon_info.description}`
            : data.pokemon_info.description;
        console.log('Description with emojis:', descriptionText);
        pokedexDescription.textContent = descriptionText;

        // Display stats
        statsGrid.innerHTML = '';
        const stats = data.pokemon_info.stats;
        const maxStat = 255; // Maximum possible stat value

        Object.entries(stats).forEach(([statName, statValue]) => {
            const statBar = document.createElement('div');
            statBar.className = 'stat-bar';

            const percentage = (statValue / maxStat) * 100;

            statBar.innerHTML = `
                <div class="stat-info">
                    <span class="stat-name">${statName}</span>
                    <span class="stat-value">${statValue}</span>
                </div>
                <div class="stat-bar-container">
                    <div class="stat-bar-fill" data-width="${percentage}"></div>
                </div>
            `;

            statsGrid.appendChild(statBar);
        });

        pokedexInfo.style.display = 'block';

        // Animate stat bars
        setTimeout(() => {
            const statBars = document.querySelectorAll('.stat-bar-fill');
            statBars.forEach(bar => {
                const width = bar.getAttribute('data-width');
                bar.style.width = width + '%';
            });
        }, 100);
    } else {
        pokedexInfo.style.display = 'none';
    }

    // Clear previous predictions
    predictionsList.innerHTML = '';

    // Display top 5 predictions
    data.predictions.forEach((pred, index) => {
        const item = document.createElement('div');
        item.className = 'prediction-item';

        const imageHTML = pred.image_url
            ? `<img src="${pred.image_url}" class="prediction-pokemon-image" alt="${pred.name}">`
            : '';

        item.innerHTML = `
            ${imageHTML}
            <div class="prediction-content">
                <div class="prediction-header">
                    <span class="prediction-name">#${index + 1} ${pred.name}</span>
                    <span class="prediction-probability">${pred.probability}%</span>
                </div>
                <div class="probability-bar-container">
                    <div class="probability-bar" data-width="${pred.probability}"></div>
                </div>
            </div>
        `;

        predictionsList.appendChild(item);
    });

    // Animate probability bars
    setTimeout(() => {
        const bars = document.querySelectorAll('.probability-bar');
        bars.forEach(bar => {
            const width = bar.getAttribute('data-width');
            bar.style.width = width + '%';
        });
    }, 100);
}

/**
 * Show error message
 */
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
    resultsSection.style.display = 'none';
    loading.style.display = 'none';
    previewSection.style.display = 'none';

    // Show appropriate content based on active tab
    if (drawTab.classList.contains('active')) {
        drawContent.style.display = 'block';
        uploadZone.style.display = 'none';
    } else {
        uploadZone.style.display = 'block';
        drawContent.style.display = 'none';
    }
}

/**
 * Reset to upload state
 */
function resetUpload() {
    selectedFile = null;
    fileInput.value = '';
    previewImage.src = '';
    topPokemonImage.src = '';
    topPokemonImage.style.display = 'none';
    uploadZone.style.display = 'block';
    previewSection.style.display = 'none';
    loading.style.display = 'none';
    resultsSection.style.display = 'none';
    errorMessage.style.display = 'none';

    // Hide pokedex info
    const pokedexInfo = document.getElementById('pokedexInfo');
    if (pokedexInfo) {
        pokedexInfo.style.display = 'none';
    }
}

// === Utility Functions === //

/**
 * Format Pokemon name (capitalize words, handle special cases)
 */
function formatPokemonName(name) {
    return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// === Tab Functions === //

/**
 * Switch between upload and draw tabs
 */
function switchTab(tab) {
    if (tab === 'upload') {
        uploadTab.classList.add('active');
        drawTab.classList.remove('active');
        uploadContent.classList.add('active');
        uploadContent.style.display = 'block';
        drawContent.classList.remove('active');
        drawContent.style.display = 'none';
    } else {
        drawTab.classList.add('active');
        uploadTab.classList.remove('active');
        drawContent.classList.add('active');
        drawContent.style.display = 'block';
        uploadContent.classList.remove('active');
        uploadContent.style.display = 'none';
    }
    // Reset states when switching tabs
    resetUpload();
}

// === Canvas Drawing Functions === //

/**
 * Initialize canvas with white background
 */
function initCanvas() {
    if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        saveCanvasState();
    }
}

/**
 * Save current canvas state for undo
 */
function saveCanvasState() {
    canvasHistory.push(ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height));
    // Limit history to 20 states
    if (canvasHistory.length > 20) {
        canvasHistory.shift();
    }
}

/**
 * Select drawing tool
 */
function selectTool(tool) {
    currentTool = tool;

    if (tool === 'brush') {
        brushTool.classList.add('active');
        eraserTool.classList.remove('active');
    } else {
        eraserTool.classList.add('active');
        brushTool.classList.remove('active');
    }
}

/**
 * Get mouse/touch position relative to canvas
 */
function getCanvasPosition(e) {
    const rect = drawingCanvas.getBoundingClientRect();
    const scaleX = drawingCanvas.width / rect.width;
    const scaleY = drawingCanvas.height / rect.height;

    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

/**
 * Start drawing
 */
function startDrawing(e) {
    isDrawing = true;
    const pos = getCanvasPosition(e);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

/**
 * Draw on canvas
 */
function draw(e) {
    if (!isDrawing) return;

    const pos = getCanvasPosition(e);

    ctx.lineWidth = currentBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'brush') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
    } else {
        ctx.globalCompositeOperation = 'destination-out';
    }

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

/**
 * Stop drawing
 */
function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        saveCanvasState();
    }
}

/**
 * Handle touch start
 */
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    drawingCanvas.dispatchEvent(mouseEvent);
}

/**
 * Handle touch move
 */
function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    drawingCanvas.dispatchEvent(mouseEvent);
}

/**
 * Clear canvas
 */
function clearCanvasDrawing() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    canvasHistory = [];
    saveCanvasState();
}

/**
 * Undo last action
 */
function undoCanvasDrawing() {
    if (canvasHistory.length > 1) {
        canvasHistory.pop(); // Remove current state
        const previousState = canvasHistory[canvasHistory.length - 1];
        ctx.putImageData(previousState, 0, 0);
    }
}

/**
 * Submit canvas drawing for prediction
 */
async function submitCanvasDrawing() {
    // Convert canvas to blob
    drawingCanvas.toBlob(async (blob) => {
        if (!blob) {
            showError('Failed to process drawing');
            return;
        }

        // Show loading
        drawContent.style.display = 'none';
        loading.style.display = 'block';
        resultsSection.style.display = 'none';
        errorMessage.style.display = 'none';

        // Create form data
        const formData = new FormData();
        formData.append('image', blob, 'drawing.png');

        try {
            // Send request to backend
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            // Hide loading
            loading.style.display = 'none';

            if (data.success) {
                displayResults(data);
            } else {
                showError(data.error || 'An error occurred during prediction');
            }
        } catch (error) {
            loading.style.display = 'none';
            showError('Network error: ' + error.message);
        }
    }, 'image/png');
}

// Initialize canvas on page load
if (drawingCanvas) {
    initCanvas();
}
