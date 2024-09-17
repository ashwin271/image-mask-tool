// DOM elements
const canvas = document.getElementById('canvas');
const maskCanvas = document.getElementById('maskCanvas');
const ctx = canvas.getContext('2d');
const maskCtx = maskCanvas.getContext('2d');
const toolSizeValue = document.getElementById('toolSizeValue');
const maskToolBtn = document.getElementById('maskTool');
const unmaskToolBtn = document.getElementById('unmaskTool');
const rectMaskToolBtn = document.getElementById('rectMaskTool');
const dropArea = document.getElementById('dropArea');
const imageUpload = document.getElementById('imageUpload');

// State variables
let drawing = false;
let toolMode = 'mask';
let history = [];
let historyIndex = -1;
let startX, startY, currentX, currentY;

// Event listeners
imageUpload.addEventListener('change', handleImageUpload);
document.getElementById('exportMask').addEventListener('click', exportMask);
document.getElementById('clearMask').addEventListener('click', clearMask);
document.getElementById('toolSize').addEventListener('input', updateToolSize);
maskToolBtn.addEventListener('click', () => setToolMode('mask'));
unmaskToolBtn.addEventListener('click', () => setToolMode('unmask'));
rectMaskToolBtn.addEventListener('click', () => setToolMode('rectMask'));
document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);

// Add keyboard shortcuts for undo (Ctrl+Z) and redo (Ctrl+Y)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
    }
});

// Initialize tool size display
toolSizeValue.textContent = document.getElementById('toolSize').value;

// Hide maskCanvas initially
maskCanvas.classList.add('hidden');

// Image upload handler
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Resize canvases to match image
            canvas.width = img.width;
            canvas.height = img.height;
            maskCanvas.width = img.width;
            maskCanvas.height = img.height;
            // Adjust canvas display size for responsiveness
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            maskCanvas.style.width = '100%';
            maskCanvas.style.height = 'auto';
            // Clear previous drawings
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            // Draw the image
            ctx.drawImage(img, 0, 0);
            // Show the mask canvas
            maskCanvas.classList.remove('hidden');
            // Hide the drop area overlay
            dropArea.classList.add('hidden');
            // Reset history
            history = [];
            historyIndex = -1;
            saveHistory();
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

// Drawing event listeners for mouse
maskCanvas.addEventListener('mousedown', startDrawing);
maskCanvas.addEventListener('mouseup', stopDrawing);
maskCanvas.addEventListener('mouseleave', stopDrawing);
maskCanvas.addEventListener('mousemove', draw);

// Drawing event listeners for touch
maskCanvas.addEventListener('touchstart', startDrawingTouch, { passive: false });
maskCanvas.addEventListener('touchmove', drawTouch, { passive: false });
maskCanvas.addEventListener('touchend', stopDrawingTouch, { passive: false });
maskCanvas.addEventListener('touchcancel', stopDrawingTouch, { passive: false });

// Helper function to get mouse or touch position
function getPointerPos(e) {
    const rect = maskCanvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
        return {
            x: (e.touches[0].clientX - rect.left) * (maskCanvas.width / rect.width),
            y: (e.touches[0].clientY - rect.top) * (maskCanvas.height / rect.height)
        };
    } else {
        return {
            x: (e.clientX - rect.left) * (maskCanvas.width / rect.width),
            y: (e.clientY - rect.top) * (maskCanvas.height / rect.height)
        };
    }
}

// Touch event handlers
function startDrawingTouch(e) {
    e.preventDefault();
    const pos = getPointerPos(e);
    startX = pos.x;
    startY = pos.y;
    drawing = true;
    if (toolMode === 'rectMask') {
        currentX = startX;
        currentY = startY;
    } else {
        setToolSettings();
        drawTouchMove(pos.x, pos.y);
    }
}

function drawTouch(e) {
    e.preventDefault();
    if (!drawing) return;
    const pos = getPointerPos(e);
    if (toolMode === 'rectMask') {
        currentX = pos.x;
        currentY = pos.y;
        drawDottedRect();
    } else {
        drawTouchMove(pos.x, pos.y);
    }
}

function stopDrawingTouch(e) {
    e.preventDefault();
    if (!drawing) return;
    drawing = false;
    if (toolMode === 'rectMask') {
        const pos = getPointerPos(e);
        const rectWidth = pos.x - startX;
        const rectHeight = pos.y - startY;
        applyRectMask(startX, startY, rectWidth, rectHeight);
    } else {
        saveHistory();
        maskCtx.globalCompositeOperation = 'source-over';
    }
}

// Mouse event handlers
function startDrawing(e) {
    if (maskCanvas.classList.contains('hidden')) return;
    const pos = getPointerPos(e);
    startX = pos.x;
    startY = pos.y;
    drawing = true;
    if (toolMode === 'rectMask') {
        currentX = startX;
        currentY = startY;
    } else {
        setToolSettings();
        drawMove(pos.x, pos.y);
    }
}

function stopDrawing(e) {
    if (!drawing) return;
    drawing = false;
    const pos = getPointerPos(e);
    if (toolMode === 'rectMask') {
        const rectWidth = pos.x - startX;
        const rectHeight = pos.y - startY;
        applyRectMask(startX, startY, rectWidth, rectHeight);
    } else {
        saveHistory();
        maskCtx.globalCompositeOperation = 'source-over';
    }
}

function draw(e) {
    if (!drawing) return;
    const pos = getPointerPos(e);
    if (toolMode === 'rectMask') {
        currentX = pos.x;
        currentY = pos.y;
        drawDottedRect();
    } else {
        drawMove(pos.x, pos.y);
    }
}

// Drawing functions for mouse
function drawMove(x, y) {
    maskCtx.beginPath();
    maskCtx.moveTo(startX, startY);
    maskCtx.lineTo(x, y);
    maskCtx.stroke();
    maskCtx.closePath();

    startX = x;
    startY = y;
}

// Drawing functions for touch
function drawTouchMove(x, y) {
    maskCtx.beginPath();
    maskCtx.moveTo(startX, startY);
    maskCtx.lineTo(x, y);
    maskCtx.stroke();
    maskCtx.closePath();

    startX = x;
    startY = y;
}

// Set tool settings based on current mode
function setToolSettings() {
    if (toolMode === 'mask') {
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.strokeStyle = 'rgba(255, 0, 0, 1)'; // Red for mask
    } else if (toolMode === 'unmask') {
        maskCtx.globalCompositeOperation = 'destination-out';
        maskCtx.strokeStyle = 'rgba(0, 0, 0, 1)'; // Color doesn't matter when erasing
    }
    maskCtx.lineWidth = document.getElementById('toolSize').value;
    maskCtx.lineCap = 'round';
}

// Apply rectangular mask
function applyRectMask(x, y, width, height) {
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = 'rgba(255, 0, 0, 1)'; // Fully opaque red
    maskCtx.fillRect(x, y, width, height);
    saveHistory();
    maskCtx.globalCompositeOperation = 'source-over';
}

// Draw dotted rectangle for visual feedback
function drawDottedRect() {
    // Clear and redraw the mask to prevent permanent changes
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    restoreHistory();
    maskCtx.setLineDash([5, 3]);
    maskCtx.strokeStyle = 'rgba(255, 0, 0, 1)'; // Red for rect mask
    maskCtx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    maskCtx.setLineDash([]);
}

// Export mask function
function exportMask() {
    if (maskCanvas.classList.contains('hidden')) {
        alert('Please upload an image first.');
        return;
    }
    const link = document.createElement('a');
    link.href = maskCanvas.toDataURL('image/png');
    link.download = 'mask.png';
    link.click();
}

// Clear mask function
function clearMask() {
    if (maskCanvas.classList.contains('hidden')) {
        alert('Please upload an image first.');
        return;
    }
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    saveHistory();
}

// Update tool size display
function updateToolSize(event) {
    toolSizeValue.textContent = event.target.value;
}

// Set tool mode (mask/unmask/rectMask)
function setToolMode(mode) {
    toolMode = mode;
    maskToolBtn.classList.toggle('active', mode === 'mask');
    unmaskToolBtn.classList.toggle('active', mode === 'unmask');
    rectMaskToolBtn.classList.toggle('active', mode === 'rectMask');
}

// History management functions
function saveHistory() {
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    history.push(maskCanvas.toDataURL());
    historyIndex++;
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreHistory();
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreHistory();
    }
}

function restoreHistory() {
    const img = new Image();
    img.onload = function() {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskCtx.drawImage(img, 0, 0);
    }
    img.src = history[historyIndex];
}

// Drag and Drop functionality
dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleImageUpload({ target: { files: [file] } });
});

// Make drop area clickable to open file explorer
dropArea.addEventListener('click', () => {
    if (!dropArea.classList.contains('hidden')) {
        imageUpload.click();
    }
});