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

// Drawing event listeners
maskCanvas.addEventListener('mousedown', startDrawing);
maskCanvas.addEventListener('mouseup', stopDrawing);
maskCanvas.addEventListener('mouseleave', stopDrawing);
maskCanvas.addEventListener('mousemove', draw);

// Drawing functions
function startDrawing(e) {
    if (maskCanvas.classList.contains('hidden')) return;
    drawing = true;
    startX = e.offsetX;
    startY = e.offsetY;
    if (toolMode === 'rectMask') {
        currentX = startX;
        currentY = startY;
    } else {
        // Set composite operation based on tool mode
        if (toolMode === 'mask') {
            maskCtx.globalCompositeOperation = 'source-over';
            maskCtx.strokeStyle = 'rgba(255, 0, 0, 1)'; // Red for mask
        } else if (toolMode === 'unmask') {
            maskCtx.globalCompositeOperation = 'destination-out';
            maskCtx.strokeStyle = 'rgba(0, 0, 0, 1)'; // Color doesn't matter when erasing
        }
        maskCtx.lineWidth = document.getElementById('toolSize').value;
        maskCtx.lineCap = 'round';
        draw(e); // Start drawing immediately for mask/unmask tools
    }
}

function stopDrawing(e) {
    if (!drawing) return;
    drawing = false;
    if (toolMode === 'rectMask') {
        // Set composite operation for rectMask
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.fillStyle = 'rgba(255, 0, 0, 1)'; // Fully opaque red
        const rectWidth = e.offsetX - startX;
        const rectHeight = e.offsetY - startY;
        maskCtx.fillRect(startX, startY, rectWidth, rectHeight);
        saveHistory();
        // Reset composite operation
        maskCtx.globalCompositeOperation = 'source-over';
    } else {
        saveHistory();
        // Reset composite operation
        maskCtx.globalCompositeOperation = 'source-over';
    }
}

function draw(e) {
    if (!drawing) return;
    if (toolMode === 'rectMask') {
        currentX = e.offsetX;
        currentY = e.offsetY;
        drawDottedRect();
    } else {
        maskCtx.beginPath();
        maskCtx.moveTo(startX, startY);
        maskCtx.lineTo(e.offsetX, e.offsetY);
        maskCtx.stroke();
        maskCtx.closePath();

        startX = e.offsetX;
        startY = e.offsetY;
    }
}

function drawDottedRect() {
    // To provide a visual guide without altering the mask
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
