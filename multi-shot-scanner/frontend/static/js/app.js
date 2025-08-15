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
            // Try different camera configurations for better iOS compatibility
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920, max: 1920 },
                    height: { ideal: 1080, max: 1080 }
                },
                audio: false
            };
            
            // Request camera permission
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.currentStream;
            
            // Important: Set video attributes for iOS
            this.video.setAttribute('autoplay', '');
            this.video.setAttribute('muted', '');
            this.video.setAttribute('playsinline', '');
            
            // Play video explicitly
            await this.video.play();
            
            this.elements.cameraContainer.style.display = 'block';
            this.elements.startCamera.style.display = 'none';
            this.elements.captureImage.style.display = 'inline-flex';
            this.elements.stopCamera.style.display = 'inline-flex';
        } catch (error) {
            console.error('Camera error:', error);
            // Fallback for iOS
            try {
                const fallbackConstraints = {
                    video: true,
                    audio: false
                };
                this.currentStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                this.video.srcObject = this.currentStream;
                await this.video.play();
                
                this.elements.cameraContainer.style.display = 'block';
                this.elements.startCamera.style.display = 'none';
                this.elements.captureImage.style.display = 'inline-flex';
                this.elements.stopCamera.style.display = 'inline-flex';
            } catch (fallbackError) {
                alert('Camera access failed. Please ensure you are using Safari and have granted camera permissions.');
            }
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
        
        this.video.srcObject = null;
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
        const container = this.elements.cropCanvas.parentElement;
        
        // Set initial crop box size and position
        const initialSize = Math.min(canvasWidth * 0.8, canvasHeight * 0.8);
        cropBox.style.width = initialSize + 'px';
        cropBox.style.height = (initialSize * 0.75) + 'px';
        cropBox.style.left = ((canvasWidth - initialSize) / 2) + 'px';
        cropBox.style.top = '20px';
        
        // Clear existing resize handles
        cropBox.innerHTML = '';
        
        // Add resize handles
        const handles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
        handles.forEach(handle => {
            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle resize-' + handle;
            resizeHandle.style.cssText = `
                position: absolute;
                background: #4a90e2;
                border: 2px solid white;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                z-index: 10;
            `;
            
            // Position handles
            switch(handle) {
                case 'nw': resizeHandle.style.top = '-6px'; resizeHandle.style.left = '-6px'; break;
                case 'ne': resizeHandle.style.top = '-6px'; resizeHandle.style.right = '-6px'; break;
                case 'sw': resizeHandle.style.bottom = '-6px'; resizeHandle.style.left = '-6px'; break;
                case 'se': resizeHandle.style.bottom = '-6px'; resizeHandle.style.right = '-6px'; break;
                case 'n': resizeHandle.style.top = '-6px'; resizeHandle.style.left = '50%'; resizeHandle.style.transform = 'translateX(-50%)'; break;
                case 's': resizeHandle.style.bottom = '-6px'; resizeHandle.style.left = '50%'; resizeHandle.style.transform = 'translateX(-50%)'; break;
                case 'e': resizeHandle.style.right = '-6px'; resizeHandle.style.top = '50%'; resizeHandle.style.transform = 'translateY(-50%)'; break;
                case 'w': resizeHandle.style.left = '-6px'; resizeHandle.style.top = '50%'; resizeHandle.style.transform = 'translateY(-50%)'; break;
            }
            
            cropBox.appendChild(resizeHandle);
        });
        
        this.makeCropBoxInteractive();
    }

    makeCropBoxInteractive() {
        const cropBox = this.elements.cropBox;
        const canvas = this.elements.cropCanvas;
        let isDragging = false;
        let isResizing = false;
        let currentHandle = null;
        let startX, startY, startWidth, startHeight, startLeft, startTop;
        
        // Make crop box draggable
        cropBox.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle')) {
                isResizing = true;
                currentHandle = e.target.className.split('resize-')[1];
                startX = e.clientX;
                startY = e.clientY;
                startWidth = parseInt(cropBox.style.width);
                startHeight = parseInt(cropBox.style.height);
                startLeft = cropBox.offsetLeft;
                startTop = cropBox.offsetTop;
            } else {
                isDragging = true;
                startX = e.clientX - cropBox.offsetLeft;
                startY = e.clientY - cropBox.offsetTop;
            }
            e.preventDefault();
        });
        
        // Touch events for mobile
        cropBox.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            if (e.target.classList.contains('resize-handle')) {
                isResizing = true;
                currentHandle = e.target.className.split('resize-')[1];
                startX = touch.clientX;
                startY = touch.clientY;
                startWidth = parseInt(cropBox.style.width);
                startHeight = parseInt(cropBox.style.height);
                startLeft = cropBox.offsetLeft;
                startTop = cropBox.offsetTop;
            } else {
                isDragging = true;
                startX = touch.clientX - cropBox.offsetLeft;
                startY = touch.clientY - cropBox.offsetTop;
            }
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const newLeft = e.clientX - startX;
                const newTop = e.clientY - startY;
                
                // Constrain to canvas bounds
                cropBox.style.left = Math.max(0, Math.min(newLeft, canvas.width - cropBox.offsetWidth)) + 'px';
                cropBox.style.top = Math.max(0, Math.min(newTop, canvas.height - cropBox.offsetHeight)) + 'px';
            } else if (isResizing) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;
                
                // Handle resize based on handle position
                if (currentHandle.includes('e')) newWidth = startWidth + dx;
                if (currentHandle.includes('w')) {
                    newWidth = startWidth - dx;
                    newLeft = startLeft + dx;
                }
                if (currentHandle.includes('s')) newHeight = startHeight + dy;
                if (currentHandle.includes('n')) {
                    newHeight = startHeight - dy;
                    newTop = startTop + dy;
                }
                
                // Apply constraints
                if (newWidth > 50 && newLeft >= 0 && newLeft + newWidth <= canvas.width) {
                    cropBox.style.width = newWidth + 'px';
                    cropBox.style.left = newLeft + 'px';
                }
                if (newHeight > 50 && newTop >= 0 && newTop + newHeight <= canvas.height) {
                    cropBox.style.height = newHeight + 'px';
                    cropBox.style.top = newTop + 'px';
                }
            }
        });
        
        // Touch move for mobile
        document.addEventListener('touchmove', (e) => {
            if (!isDragging && !isResizing) return;
            
            const touch = e.touches[0];
            
            if (isDragging) {
                const newLeft = touch.clientX - startX;
                const newTop = touch.clientY - startY;
                
                cropBox.style.left = Math.max(0, Math.min(newLeft, canvas.width - cropBox.offsetWidth)) + 'px';
                cropBox.style.top = Math.max(0, Math.min(newTop, canvas.height - cropBox.offsetHeight)) + 'px';
            } else if (isResizing) {
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;
                
                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;
                
                if (currentHandle.includes('e')) newWidth = startWidth + dx;
                if (currentHandle.includes('w')) {
                    newWidth = startWidth - dx;
                    newLeft = startLeft + dx;
                }
                if (currentHandle.includes('s')) newHeight = startHeight + dy;
                if (currentHandle.includes('n')) {
                    newHeight = startHeight - dy;
                    newTop = startTop + dy;
                }
                
                if (newWidth > 50 && newLeft >= 0 && newLeft + newWidth <= canvas.width) {
                    cropBox.style.width = newWidth + 'px';
                    cropBox.style.left = newLeft + 'px';
                }
                if (newHeight > 50 && newTop >= 0 && newTop + newHeight <= canvas.height) {
                    cropBox.style.height = newHeight + 'px';
                    cropBox.style.top = newTop + 'px';
                }
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            isResizing = false;
            currentHandle = null;
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
            isResizing = false;
            currentHandle = null;
        });
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