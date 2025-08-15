// File: frontend/static/js/app.js
class MultiShotScanner {
    constructor() {
        this.video = document.getElementById('video');
        this.capturedImages = [];
        this.currentStream = null;
        this.currentCropIndex = -1;
        this.cropData = {};
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.elements = {
            startCamera: document.getElementById('startCamera'),
            captureImage: document.getElementById('captureImage'),
            stopCamera: document.getElementById('stopCamera'),
            cameraContainer: document.getElementById('cameraContainer'),
            capturedImagesDiv: document.getElementById('capturedImages'),
            stitchControls: document.getElementById('stitchControls'),
            stitchImages: document.getElementById('stitchImages'),
            stitchedResult: document.getElementById('stitchedResult'),
            stitchedCanvas: document.getElementById('stitchedCanvas'),
            codeInput: document.getElementById('codeInput'),
            reactCode: document.getElementById('reactCode'),
            aiControls: document.getElementById('aiControls'),
            sendToAI: document.getElementById('sendToAI'),
            result: document.getElementById('result'),
            resultContent: document.getElementById('resultContent'),
            cropModal: document.getElementById('cropModal'),
            cropCanvas: document.getElementById('cropCanvas'),
            cropBox: document.getElementById('cropBox'),
            applyCrop: document.getElementById('applyCrop'),
            cancelCrop: document.getElementById('cancelCrop')
        };
    }

    attachEventListeners() {
        this.elements.startCamera.addEventListener('click', () => this.startCamera());
        this.elements.captureImage.addEventListener('click', () => this.captureImage());
        this.elements.stopCamera.addEventListener('click', () => this.stopCamera());
        this.elements.stitchImages.addEventListener('click', () => this.stitchImages());
        this.elements.sendToAI.addEventListener('click', () => this.sendToAI());
        this.elements.applyCrop.addEventListener('click', () => this.applyCrop());
        this.elements.cancelCrop.addEventListener('click', () => this.closeCropModal());
        
        document.querySelector('.close-modal').addEventListener('click', () => this.closeCropModal());
        
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyPreset(e.target.dataset.preset));
        });
    }

    async startCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };
            
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.currentStream;
            
            this.elements.cameraContainer.style.display = 'block';
            this.elements.startCamera.style.display = 'none';
            this.elements.captureImage.style.display = 'inline-flex';
            this.elements.stopCamera.style.display = 'inline-flex';
        } catch (error) {
            alert('Camera access failed: ' + error.message);
        }
    }

    captureImage() {
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        this.capturedImages.push({
            original: imageData,
            cropped: null,
            cropSettings: null
        });
        
        this.updateImageDisplay();
        
        if (this.capturedImages.length > 0) {
            this.elements.stitchControls.style.display = 'block';
        }
    }

    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        
        this.elements.cameraContainer.style.display = 'none';
        this.elements.startCamera.style.display = 'inline-flex';
        this.elements.captureImage.style.display = 'none';
        this.elements.stopCamera.style.display = 'none';
    }

    updateImageDisplay() {
        this.elements.capturedImagesDiv.innerHTML = '';
        
        this.capturedImages.forEach((img, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            
            if (img.cropped) {
                imageItem.innerHTML = `
                    <span class="crop-indicator">✂️</span>
                `;
            }
            
            const imgElement = document.createElement('img');
            imgElement.src = img.cropped || img.original;
            imgElement.onclick = () => this.openCropModal(index);
            
            const controls = document.createElement('div');
            controls.className = 'image-controls';
            controls.innerHTML = `
                <button onclick="scanner.openCropModal(${index})" style="background:#4a90e2;color:white;">✂️ Crop</button>
                <button onclick="scanner.moveImage(${index}, -1)" style="background:#f39c12;color:white;">↑</button>
                <button onclick="scanner.moveImage(${index}, 1)" style="background:#f39c12;color:white;">↓</button>
                <button onclick="scanner.removeImage(${index})" style="background:#e74c3c;color:white;">✕</button>
            `;
            
            imageItem.appendChild(imgElement);
            imageItem.appendChild(controls);
            this.elements.capturedImagesDiv.appendChild(imageItem);
        });
    }

    openCropModal(index) {
        this.currentCropIndex = index;
        this.elements.cropModal.style.display = 'flex';
        
        const img = new Image();
        img.onload = () => {
            const canvas = this.elements.cropCanvas;
            const ctx = canvas.getContext('2d');
            
            const maxWidth = 700;
            const scale = maxWidth / img.width;
            canvas.width = Math.min(img.width, maxWidth);
            canvas.height = img.height * (canvas.width / img.width);
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            this.initCropBox(canvas.width, canvas.height);
        };
        img.src = this.capturedImages[index].original;
    }

    initCropBox(canvasWidth, canvasHeight) {
        const cropBox = this.elements.cropBox;
        cropBox.style.left = '20px';
        cropBox.style.top = '20px';
        cropBox.style.width = (canvasWidth - 40) + 'px';
        cropBox.style.height = (canvasHeight - 40) + 'px';
        
        this.makeCropBoxDraggable();
    }

    makeCropBoxDraggable() {
        const cropBox = this.elements.cropBox;
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        cropBox.onmousedown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = cropBox.offsetLeft;
            initialY = cropBox.offsetTop;
        };
        
        document.onmousemove = (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            cropBox.style.left = (initialX + dx) + 'px';
            cropBox.style.top = (initialY + dy) + 'px';
        };
        
        document.onmouseup = () => {
            isDragging = false;
        };
    }

    applyPreset(preset) {
        const canvas = this.elements.cropCanvas;
        const cropBox = this.elements.cropBox;
        
        const presets = {
            code: { x: 0.05, y: 0.1, w: 0.9, h: 0.8 },
            figma: { x: 0.15, y: 0.05, w: 0.7, h: 0.85 },
            document: { x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
            full: { x: 0, y: 0, w: 1, h: 1 }
        };
        
        const settings = presets[preset];
        cropBox.style.left = (canvas.width * settings.x) + 'px';
        cropBox.style.top = (canvas.height * settings.y) + 'px';
        cropBox.style.width = (canvas.width * settings.w) + 'px';
        cropBox.style.height = (canvas.height * settings.h) + 'px';
    }

    applyCrop() {
        const canvas = this.elements.cropCanvas;
        const cropBox = this.elements.cropBox;
        
        const scaleX = canvas.width / canvas.offsetWidth;
        const scaleY = canvas.height / canvas.offsetHeight;
        
        const cropSettings = {
            x: (cropBox.offsetLeft - canvas.offsetLeft) * scaleX,
            y: (cropBox.offsetTop - canvas.offsetTop) * scaleY,
            width: cropBox.offsetWidth * scaleX,
            height: cropBox.offsetHeight * scaleY
        };
        
        const img = new Image();
        img.onload = () => {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cropSettings.width;
            cropCanvas.height = cropSettings.height;
            const ctx = cropCanvas.getContext('2d');
            
            const realScale = img.width / canvas.width;
            ctx.drawImage(img,
                cropSettings.x * realScale, cropSettings.y * realScale,
                cropSettings.width * realScale, cropSettings.height * realScale,
                0, 0, cropSettings.width, cropSettings.height
            );
            
            this.capturedImages[this.currentCropIndex].cropped = cropCanvas.toDataURL('image/jpeg', 0.9);
            this.capturedImages[this.currentCropIndex].cropSettings = cropSettings;
            
            this.updateImageDisplay();
            this.closeCropModal();
        };
        img.src = this.capturedImages[this.currentCropIndex].original;
    }

    closeCropModal() {
        this.elements.cropModal.style.display = 'none';
        this.currentCropIndex = -1;
    }

    moveImage(index, direction) {
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < this.capturedImages.length) {
            [this.capturedImages[index], this.capturedImages[newIndex]] = 
            [this.capturedImages[newIndex], this.capturedImages[index]];
            this.updateImageDisplay();
        }
    }

    removeImage(index) {
        this.capturedImages.splice(index, 1);
        this.updateImageDisplay();
        
        if (this.capturedImages.length === 0) {
            this.elements.stitchControls.style.display = 'none';
            this.elements.stitchedResult.style.display = 'none';
            this.elements.codeInput.style.display = 'none';
            this.elements.aiControls.style.display = 'none';
        }
    }

    async stitchImages() {
        if (this.capturedImages.length === 0) return;
        
        const canvas = this.elements.stitchedCanvas;
        const ctx = canvas.getContext('2d');
        
        let totalHeight = 0;
        let maxWidth = 0;
        const loadedImages = [];
        
        for (const imgData of this.capturedImages) {
            const img = new Image();
            await new Promise(resolve => {
                img.onload = () => {
                    loadedImages.push(img);
                    totalHeight += img.height;
                    maxWidth = Math.max(maxWidth, img.width);
                    resolve();
                };
                img.src = imgData.cropped || imgData.original;
            });
        }
        
        canvas.width = maxWidth;
        canvas.height = totalHeight;
        
        let currentY = 0;
        for (const img of loadedImages) {
            ctx.drawImage(img, 0, currentY);
            currentY += img.height;
        }
        
        this.elements.stitchedResult.style.display = 'block';
        this.elements.codeInput.style.display = 'block';
        this.elements.aiControls.style.display = 'block';
    }

    async sendToAI() {
        const stitchedImage = this.elements.stitchedCanvas.toDataURL('image/jpeg', 0.9);
        const reactCode = this.elements.reactCode.value;
        
        if (!reactCode.trim()) {
            alert('Please paste your React code first');
            return;
        }
        
        const payload = {
            image: stitchedImage,
            reactCode: reactCode,
            timestamp: new Date().toISOString(),
            imageCount: this.capturedImages.length
        };
        
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            this.elements.resultContent.textContent = JSON.stringify(result, null, 2);
            this.elements.result.style.display = 'block';
        } catch (error) {
            this.elements.resultContent.textContent = 'Error: ' + error.message;
            this.elements.result.style.display = 'block';
        }
    }
}

const scanner = new MultiShotScanner();