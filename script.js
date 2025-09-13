// NFC Scanner Application
class NFCScanner {
    constructor() {
        this.isScanning = false;
        this.reader = null;
        this.initializeElements();
        this.bindEvents();
        this.checkNFCSupport();
    }

    initializeElements() {
        this.scanButton = document.getElementById('scanButton');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.resultsSection = document.getElementById('resultsSection');
        this.dataDisplay = document.getElementById('dataDisplay');
        this.errorSection = document.getElementById('errorSection');
        this.errorMessage = document.getElementById('errorMessage');
        this.clearButton = document.getElementById('clearButton');
    }

    bindEvents() {
        this.scanButton.addEventListener('click', () => this.toggleScanning());
        this.clearButton.addEventListener('click', () => this.clearResults());
    }

    checkNFCSupport() {
        if (!('NDEFReader' in window)) {
            this.showError('NFC is not supported on this device or browser. Please use a modern browser with NFC support on an Android device or Chrome on Android.');
            this.scanButton.disabled = true;
            return false;
        }
        return true;
    }

    async toggleScanning() {
        if (this.isScanning) {
            this.stopScanning();
        } else {
            await this.startScanning();
        }
    }

    async startScanning() {
        try {
            this.reader = new NDEFReader();
            
            // Check if NFC is available
            await this.reader.scan();
            
            this.isScanning = true;
            this.updateUI('scanning', 'Scanning for NFC tags...');
            this.scanButton.innerHTML = '<span class="button-icon">⏹️</span><span class="button-text">Stop Scanning</span>';
            this.scanButton.disabled = false;
            this.hideError();

            // Set up event listeners
            this.reader.addEventListener('reading', (event) => this.handleNFCReading(event));
            this.reader.addEventListener('readingerror', (event) => this.handleNFCError(event));

        } catch (error) {
            console.error('Error starting NFC scan:', error);
            this.handleScanError(error);
        }
    }

    stopScanning() {
        this.isScanning = false;
        this.updateUI('ready', 'Ready to scan');
        this.scanButton.innerHTML = '<span class="button-icon">📡</span><span class="button-text">Start Scanning</span>';
        
        if (this.reader) {
            // Note: NDEFReader doesn't have a stop method, but we can reset our state
            this.reader = null;
        }
    }

    handleNFCReading(event) {
        console.log('NFC tag detected:', event);
        
        try {
            const message = event.message;
            const records = message.records;
            
            let displayData = `NFC Tag Detected!\n\n`;
            displayData += `Number of records: ${records.length}\n\n`;
            
            records.forEach((record, index) => {
                displayData += `Record ${index + 1}:\n`;
                displayData += `- Type: ${record.recordType}\n`;
                displayData += `- MIME Type: ${record.mediaType || 'N/A'}\n`;
                displayData += `- ID: ${record.id || 'N/A'}\n`;
                
                // Decode the data based on record type
                if (record.recordType === 'text') {
                    const decoder = new TextDecoder();
                    const text = decoder.decode(record.data);
                    displayData += `- Text: ${text}\n`;
                } else if (record.recordType === 'url') {
                    const decoder = new TextDecoder();
                    const url = decoder.decode(record.data);
                    displayData += `- URL: ${url}\n`;
                } else if (record.recordType === 'mime') {
                    const decoder = new TextDecoder();
                    const mimeData = decoder.decode(record.data);
                    displayData += `- MIME Data: ${mimeData}\n`;
                } else {
                    // For other record types, show raw data
                    const decoder = new TextDecoder();
                    try {
                        const data = decoder.decode(record.data);
                        displayData += `- Data: ${data}\n`;
                    } catch (e) {
                        displayData += `- Raw Data: ${Array.from(record.data).map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`;
                    }
                }
                displayData += `\n`;
            });

            this.displayResults(displayData);
            this.updateUI('ready', 'Tag scanned successfully!');
            
            // Auto-stop scanning after successful read
            setTimeout(() => {
                this.stopScanning();
            }, 2000);

        } catch (error) {
            console.error('Error processing NFC data:', error);
            this.showError('Error processing NFC tag data: ' + error.message);
        }
    }

    handleNFCError(event) {
        console.error('NFC reading error:', event);
        this.showError('Error reading NFC tag: ' + event.message);
        this.updateUI('error', 'Scan failed');
        this.stopScanning();
    }

    handleScanError(error) {
        let errorMessage = 'Failed to start NFC scanning: ';
        
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Permission denied. Please allow NFC access and try again.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage += 'NFC is not supported on this device.';
        } else if (error.name === 'NotReadableError') {
            errorMessage += 'NFC reader is not available or already in use.';
        } else {
            errorMessage += error.message;
        }
        
        this.showError(errorMessage);
        this.updateUI('error', 'Scan failed');
    }

    updateUI(status, text) {
        this.statusIndicator.className = `status-indicator ${status}`;
        this.statusText.textContent = text;
    }

    displayResults(data) {
        this.dataDisplay.textContent = data;
        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    clearResults() {
        this.dataDisplay.textContent = '';
        this.resultsSection.style.display = 'none';
        this.updateUI('ready', 'Ready to scan');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorSection.style.display = 'block';
        this.errorSection.scrollIntoView({ behavior: 'smooth' });
    }

    hideError() {
        this.errorSection.style.display = 'none';
    }
}

// Initialize the NFC Scanner when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new NFCScanner();
});

// Add some additional utility functions
window.addEventListener('beforeunload', () => {
    // Clean up any active NFC readers
    if (window.nfcScanner && window.nfcScanner.reader) {
        window.nfcScanner.stopScanning();
    }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && window.nfcScanner && window.nfcScanner.isScanning) {
        window.nfcScanner.stopScanning();
    }
});
