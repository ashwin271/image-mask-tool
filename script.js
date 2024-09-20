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
const clearImageBtn = document.getElementById('clearImage');

// State variables
let drawing = false;
let toolMode = 'mask';
let maskOperations = []; // Array to store individual mask operations
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
clearImageBtn.addEventListener('click', clearImage);

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
            // Draw image on canvas
            ctx.drawImage(img, 0, 0);
            // Show maskCanvas and clearImageBtn
            maskCanvas.classList.remove('hidden');
            clearImageBtn.classList.remove('hidden');
            dropArea.classList.add('hidden');
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

// Clear image handler
function clearImage() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCanvas.classList.add('hidden');
    clearImageBtn.classList.add('hidden');
    dropArea.classList.remove('hidden');
    maskOperations = [];
    // Reset the file input element
    imageUpload.value = '';
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
    // Reset mask operations
    maskOperations = [];
}

// Update tool size display
function updateToolSize(event) {
    toolSizeValue.textContent = event.target.value;
    // Redraw all masks to apply new tool size
    redrawAllMasks();
}

// Set tool mode (mask/unmask/rectMask)
function setToolMode(mode) {
    toolMode = mode;
    maskToolBtn.classList.toggle('active', mode === 'mask');
    unmaskToolBtn.classList.toggle('active', mode === 'unmask');
    rectMaskToolBtn.classList.toggle('active', mode === 'rectMask');
}

// Undo function
function undo() {
    if (maskOperations.length > 0) {
        maskOperations.pop();
        redrawAllMasks();
    }
}

// Redo function
function redo() {
    // Redo functionality can be implemented with a separate redo stack if needed
    alert('Redo functionality not implemented.');
}

// Redraw all masks
function redrawAllMasks() {
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskOperations.forEach(operation => {
        if (operation.toolMode === 'mask') {
            maskCtx.globalCompositeOperation = 'source-over';
            maskCtx.strokeStyle = 'red';
            maskCtx.lineWidth = document.getElementById('toolSize').value;
            maskCtx.lineCap = 'round';
            maskCtx.beginPath();
            if (operation.paths && operation.paths.length > 0) {
                maskCtx.moveTo(operation.paths[0].x, operation.paths[0].y);
                operation.paths.forEach(point => {
                    maskCtx.lineTo(point.x, point.y);
                });
                maskCtx.stroke();
                maskCtx.closePath();
            }
        } else if (operation.toolMode === 'unmask') {
            maskCtx.globalCompositeOperation = 'destination-out';
            maskCtx.strokeStyle = 'rgba(0,0,0,1)';
            maskCtx.lineWidth = document.getElementById('toolSize').value;
            maskCtx.lineCap = 'round';
            maskCtx.beginPath();
            if (operation.paths && operation.paths.length > 0) {
                maskCtx.moveTo(operation.paths[0].x, operation.paths[0].y);
                operation.paths.forEach(point => {
                    maskCtx.lineTo(point.x, point.y);
                });
                maskCtx.stroke();
                maskCtx.closePath();
            }
        } else if (operation.toolMode === 'rectMask') {
            maskCtx.globalCompositeOperation = operation.action === 'mask' ? 'source-over' : 'destination-out';
            maskCtx.fillStyle = operation.action === 'mask' ? 'red' : 'rgba(0,0,0,1)';
            maskCtx.fillRect(operation.x, operation.y, operation.width, operation.height);
            maskCtx.strokeStyle = 'red';
            maskCtx.strokeRect(operation.x, operation.y, operation.width, operation.height);
        }
    });
    maskCtx.globalCompositeOperation = 'source-over';
}

// Apply rectangular mask
function applyRectMask(x, y, width, height) {
    if (toolMode === 'mask') {
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.fillStyle = 'red'; // Change mask color to red
    } else if (toolMode === 'unmask') {
        maskCtx.globalCompositeOperation = 'destination-out';
        maskCtx.fillStyle = 'rgba(0,0,0,1)';
    }
    maskCtx.fillRect(x, y, width, height);
    maskCtx.strokeStyle = 'red';
    maskCtx.strokeRect(x, y, width, height);
    saveHistory();
    maskCtx.globalCompositeOperation = 'source-over';
}

// Save history for undo functionality
function saveHistory() {
    const imgData = maskCanvas.toDataURL();
    maskOperations.push(imgData);
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

// Utility function to get the correct coordinates
function getCanvasCoordinates(event) {
    const rect = maskCanvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (maskCanvas.width / rect.width),
        y: (event.clientY - rect.top) * (maskCanvas.height / rect.height)
    };
}

// Drawing logic for mask tools
maskCanvas.addEventListener('mousedown', (e) => {
    drawing = true;
    const coords = getCanvasCoordinates(e);
    startX = coords.x;
    startY = coords.y;
    if (toolMode === 'rectMask') {
        currentX = startX;
        currentY = startY;
    }
});

maskCanvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const coords = getCanvasCoordinates(e);
    currentX = coords.x;
    currentY = coords.y;
    if (toolMode === 'mask' || toolMode === 'unmask') {
        drawLine(startX, startY, currentX, currentY);
        startX = currentX;
        startY = currentY;
    }
});

maskCanvas.addEventListener('mouseup', () => {
    if (drawing) {
        drawing = false;
        if (toolMode === 'rectMask') {
            applyRectMask(startX, startY, currentX - startX, currentY - startY);
        } else {
            saveHistory();
        }
    }
});

maskCanvas.addEventListener('mouseout', () => {
    if (drawing) {
        drawing = false;
        if (toolMode === 'rectMask') {
            applyRectMask(startX, startY, currentX - startX, currentY - startY);
        } else {
            saveHistory();
        }
    }
});

function drawLine(x1, y1, x2, y2) {
    maskCtx.beginPath();
    maskCtx.moveTo(x1, y1);
    maskCtx.lineTo(x2, y2);
    maskCtx.strokeStyle = toolMode === 'mask' ? 'red' : 'rgba(0,0,0,1)';
    maskCtx.lineWidth = document.getElementById('toolSize').value;
    maskCtx.lineCap = 'round';
    maskCtx.globalCompositeOperation = toolMode === 'mask' ? 'source-over' : 'destination-out';
    maskCtx.stroke();
    maskCtx.closePath();
}