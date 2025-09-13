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
            
            // Add technical tag information with HTML formatting
            displayData += `<div class="tag-info">`;
            displayData += this.getTagTechnicalInfo(event);
            displayData += `</div>\n\n`;
            
            // Add NDEF records information
            displayData += `<div class="ndef-info">`;
            displayData += `NDEF Records Information:\n`;
            displayData += `Number of records: ${records.length}\n`;
            displayData += `Timestamp: ${new Date().toLocaleString()}\n`;
            displayData += `</div>\n\n`;
            
            if (records.length > 0) {
                records.forEach((record, index) => {
                    displayData += `<div class="record-info">`;
                    displayData += `Record ${index + 1}:\n`;
                    displayData += `- Type: ${record.recordType}\n`;
                    displayData += `- TNF (Type Name Format): ${record.tnf}\n`;
                    displayData += `- MIME Type: ${record.mediaType || 'N/A'}\n`;
                    displayData += `- ID: ${record.id || 'N/A'}\n`;
                    displayData += `- Data Length: ${record.data ? record.data.byteLength : 0} bytes\n`;
                    
                    // Parse data based on record type
                    const parsedData = this.parseRecordData(record);
                    displayData += parsedData;
                    displayData += `</div>\n\n`;
                });
            } else {
                displayData += `<div class="record-info">`;
                displayData += `No NDEF records found on this tag.\n`;
                displayData += `This tag may not be NDEF formatted or may be empty.\n`;
                displayData += `</div>\n\n`;
            }

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

    getTagTechnicalInfo(event) {
        let info = `Tag Technical Information:\n`;
        
        try {
            // Get tag information if available
            if (event.serialNumber) {
                info += `- Serial Number: ${this.formatSerialNumber(event.serialNumber)}\n`;
            }
            
            // Try to get additional tag properties
            if (event.tag) {
                const tag = event.tag;
                
                // Tag type information
                if (tag.tech) {
                    info += `- Technologies Available: ${tag.tech.join(', ')}\n`;
                }
                
                // Try to get ATQA and SAK if available
                if (tag.atqa) {
                    info += `- ATQA: 0x${tag.atqa.toString(16).padStart(4, '0')}\n`;
                }
                
                if (tag.sak) {
                    info += `- SAK: 0x${tag.sak.toString(16).padStart(2, '0')}\n`;
                }
                
                // Determine tag type based on available technologies
                const tagType = this.determineTagType(tag.tech || []);
                info += `- Tag Type: ${tagType}\n`;
                
                // Memory information if available
                const memoryInfo = this.getMemoryInfo(tag);
                if (memoryInfo) {
                    info += `- Memory Information: ${memoryInfo}\n`;
                }
                
                // Additional properties
                if (tag.maxSize) {
                    info += `- Maximum Size: ${tag.maxSize} bytes\n`;
                }
                
                if (tag.isWritable !== undefined) {
                    info += `- Writable: ${tag.isWritable ? 'Yes' : 'No'}\n`;
                }
                
                if (tag.canMakeReadOnly !== undefined) {
                    info += `- Can Make Read-Only: ${tag.canMakeReadOnly ? 'Yes' : 'No'}\n`;
                }
            }
            
            // Fallback information if detailed tag info is not available
            if (!event.tag) {
                info += `- Note: Detailed tag information not available\n`;
                info += `- This may be due to browser limitations or tag type\n`;
            }
            
        } catch (error) {
            info += `- Error reading tag information: ${error.message}\n`;
        }
        
        return info;
    }

    formatSerialNumber(serialNumber) {
        if (Array.isArray(serialNumber)) {
            return serialNumber.map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
        }
        return serialNumber.toString();
    }

    determineTagType(technologies) {
        const techSet = new Set(technologies);
        
        // Common tag type mappings
        if (techSet.has('MifareClassic')) {
            return 'ISO 14443-3A - Mifare Classic';
        } else if (techSet.has('MifareUltralight')) {
            return 'ISO 14443-3A - Mifare Ultralight';
        } else if (techSet.has('NfcA') && techSet.has('NdefFormatable')) {
            return 'ISO 14443-3A - NDEF Formatable';
        } else if (techSet.has('NfcA')) {
            return 'ISO 14443-3A';
        } else if (techSet.has('NfcB')) {
            return 'ISO 14443-3B';
        } else if (techSet.has('NfcF')) {
            return 'ISO 18092 - FeliCa';
        } else if (techSet.has('NfcV')) {
            return 'ISO 15693 - I-CODE';
        } else if (techSet.has('IsoDep')) {
            return 'ISO 14443-4 - ISO-DEP';
        } else if (techSet.has('Ndef')) {
            return 'NDEF Tag';
        } else if (techSet.has('NdefFormatable')) {
            return 'NDEF Formatable Tag';
        } else {
            return `Unknown (${technologies.join(', ')})`;
        }
    }

    getMemoryInfo(tag) {
        try {
            // Try to determine memory size based on tag type
            const techSet = new Set(tag.tech || []);
            
            if (techSet.has('MifareClassic')) {
                // Mifare Classic memory sizes
                if (tag.maxSize) {
                    const kBytes = Math.floor(tag.maxSize / 1024);
                    return `${kBytes} kBytes: ${this.getMifareClassicSectorInfo(tag.maxSize)}`;
                }
                return 'Mifare Classic (size unknown)';
            } else if (techSet.has('MifareUltralight')) {
                return 'Mifare Ultralight (512 bytes)';
            } else if (tag.maxSize) {
                const kBytes = Math.floor(tag.maxSize / 1024);
                return `${kBytes} kBytes (${tag.maxSize} bytes)`;
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    getMifareClassicSectorInfo(maxSize) {
        // Calculate sector information for Mifare Classic
        const totalBytes = maxSize;
        const bytesPerBlock = 16;
        const totalBlocks = Math.floor(totalBytes / bytesPerBlock);
        
        if (totalBlocks <= 16) {
            // 1K: 16 sectors of 4 blocks
            return `${totalBlocks} sectors of 4 blocks (16 bytes each)`;
        } else if (totalBlocks <= 40) {
            // 4K: 32 sectors of 4 blocks and 8 sectors of 16 blocks
            return `32 sectors of 4 blocks and 8 sectors of 16 blocks (16 bytes each)`;
        } else {
            // 2K or other sizes
            return `${totalBlocks} blocks (16 bytes each)`;
        }
    }

    parseRecordData(record) {
        const decoder = new TextDecoder();
        let result = '';
        
        try {
            switch (record.recordType) {
                case 'empty':
                    result += `- Content: Empty record\n`;
                    break;
                    
                case 'text':
                    result += this.parseTextRecord(record, decoder);
                    break;
                    
                case 'url':
                    result += this.parseUrlRecord(record, decoder);
                    break;
                    
                case 'mime':
                    result += this.parseMimeRecord(record, decoder);
                    break;
                    
                case 'smart-poster':
                    result += this.parseSmartPosterRecord(record, decoder);
                    break;
                    
                case 'absolute-uri':
                    result += this.parseAbsoluteUriRecord(record, decoder);
                    break;
                    
                case 'external':
                    result += this.parseExternalRecord(record, decoder);
                    break;
                    
                default:
                    // Handle well-known record types
                    if (record.tnf === 1) { // Well-known type
                        result += this.parseWellKnownRecord(record, decoder);
                    } else {
                        result += this.parseGenericRecord(record, decoder);
                    }
            }
        } catch (error) {
            result += `- Error parsing record: ${error.message}\n`;
            result += `- Raw Data: ${this.formatRawData(record.data)}\n`;
        }
        
        return result;
    }

    parseTextRecord(record, decoder) {
        const data = record.data;
        if (data.byteLength === 0) {
            return `- Content: Empty text record\n`;
        }
        
        // Text record format: [Status byte][Language code][Text]
        const statusByte = data[0];
        const languageCodeLength = statusByte & 0x3F;
        const encoding = (statusByte & 0x80) ? 'UTF-16' : 'UTF-8';
        
        const languageCode = decoder.decode(data.slice(1, 1 + languageCodeLength));
        const text = decoder.decode(data.slice(1 + languageCodeLength), encoding);
        
        return `- Language: ${languageCode}\n- Encoding: ${encoding}\n- Text: ${text}\n`;
    }

    parseUrlRecord(record, decoder) {
        const data = record.data;
        if (data.byteLength === 0) {
            return `- Content: Empty URL record\n`;
        }
        
        // URL record format: [Prefix code][URL]
        const prefixCode = data[0];
        const urlPrefixes = [
            '', 'http://www.', 'https://www.', 'http://', 'https://',
            'tel:', 'mailto:', 'ftp://anonymous:anonymous@', 'ftp://ftp.',
            'ftps://', 'sftp://', 'smb://', 'nfs://', 'ftp://', 'dav://',
            'news:', 'telnet://', 'imap:', 'rtsp://', 'urn:', 'pop:',
            'sip:', 'sips:', 'tftp:', 'btspp://', 'btl2cap://', 'btgoep://',
            'tcpobex://', 'irdaobex://', 'file://', 'urn:epc:id:',
            'urn:epc:tag:', 'urn:epc:pat:', 'urn:epc:raw:', 'urn:epc:',
            'urn:nfc:'
        ];
        
        const prefix = urlPrefixes[prefixCode] || '';
        const url = decoder.decode(data.slice(1));
        const fullUrl = prefix + url;
        
        return `- URL: ${fullUrl}\n- Prefix Code: ${prefixCode}\n`;
    }

    parseMimeRecord(record, decoder) {
        const mimeType = record.mediaType || 'unknown';
        const data = record.data;
        
        if (data.byteLength === 0) {
            return `- MIME Type: ${mimeType}\n- Content: Empty MIME record\n`;
        }
        
        let content = '';
        try {
            // Try to decode as text first
            content = decoder.decode(data);
            
            // Check if it's JSON
            if (mimeType.includes('json')) {
                try {
                    const jsonData = JSON.parse(content);
                    content = JSON.stringify(jsonData, null, 2);
                } catch (e) {
                    // Not valid JSON, keep as text
                }
            }
        } catch (e) {
            content = this.formatRawData(data);
        }
        
        return `- MIME Type: ${mimeType}\n- Content:\n${content}\n`;
    }

    parseSmartPosterRecord(record, decoder) {
        // Smart Poster contains multiple NDEF records
        return `- Content: Smart Poster (contains multiple records)\n- Raw Data: ${this.formatRawData(record.data)}\n`;
    }

    parseAbsoluteUriRecord(record, decoder) {
        const uri = decoder.decode(record.data);
        return `- URI: ${uri}\n`;
    }

    parseExternalRecord(record, decoder) {
        const data = record.data;
        const type = record.mediaType || 'unknown';
        
        // Try to parse as text first
        let content = '';
        try {
            content = decoder.decode(data);
        } catch (e) {
            content = this.formatRawData(data);
        }
        
        return `- External Type: ${type}\n- Content: ${content}\n`;
    }

    parseWellKnownRecord(record, decoder) {
        const type = record.mediaType || 'unknown';
        const data = record.data;
        
        // Handle specific well-known types
        switch (type) {
            case 'application/vnd.wfa.wsc':
                return this.parseWifiConfigRecord(data, decoder);
            case 'application/vnd.bluetooth.ep.oob':
                return this.parseBluetoothConfigRecord(data, decoder);
            case 'text/vcard':
                return this.parseVCardRecord(data, decoder);
            case 'application/vnd.google.android.package':
                return this.parseAndroidAppRecord(data, decoder);
            default:
                return this.parseGenericWellKnownRecord(record, decoder);
        }
    }

    parseWifiConfigRecord(data, decoder) {
        // Parse WPS (Wi-Fi Protected Setup) configuration
        let result = `- Type: Wi-Fi Configuration\n`;
        try {
            const content = decoder.decode(data);
            result += `- WPS Data: ${content}\n`;
        } catch (e) {
            result += `- Raw WPS Data: ${this.formatRawData(data)}\n`;
        }
        return result;
    }

    parseBluetoothConfigRecord(data, decoder) {
        // Parse Bluetooth configuration
        let result = `- Type: Bluetooth Configuration\n`;
        try {
            const content = decoder.decode(data);
            result += `- BT Data: ${content}\n`;
        } catch (e) {
            result += `- Raw BT Data: ${this.formatRawData(data)}\n`;
        }
        return result;
    }

    parseVCardRecord(data, decoder) {
        // Parse vCard data
        let result = `- Type: vCard\n`;
        try {
            const content = decoder.decode(data);
            result += `- vCard Data:\n${content}\n`;
        } catch (e) {
            result += `- Raw vCard Data: ${this.formatRawData(data)}\n`;
        }
        return result;
    }

    parseAndroidAppRecord(data, decoder) {
        // Parse Android Application Record
        let result = `- Type: Android Application\n`;
        try {
            const content = decoder.decode(data);
            result += `- App Data: ${content}\n`;
        } catch (e) {
            result += `- Raw App Data: ${this.formatRawData(data)}\n`;
        }
        return result;
    }

    parseGenericWellKnownRecord(record, decoder) {
        const type = record.mediaType || 'unknown';
        const data = record.data;
        
        let result = `- Well-Known Type: ${type}\n`;
        try {
            const content = decoder.decode(data);
            result += `- Content: ${content}\n`;
        } catch (e) {
            result += `- Raw Data: ${this.formatRawData(data)}\n`;
        }
        return result;
    }

    parseGenericRecord(record, decoder) {
        const type = record.recordType;
        const data = record.data;
        
        let result = `- Generic Type: ${type}\n`;
        try {
            const content = decoder.decode(data);
            result += `- Content: ${content}\n`;
        } catch (e) {
            result += `- Raw Data: ${this.formatRawData(data)}\n`;
        }
        return result;
    }

    formatRawData(data) {
        if (!data || data.byteLength === 0) {
            return 'Empty';
        }
        
        // Convert to hex string
        const hex = Array.from(data)
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
        
        // Also try to show as ASCII if possible
        let ascii = '';
        try {
            ascii = Array.from(data)
                .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
                .join('');
        } catch (e) {
            ascii = 'Non-printable';
        }
        
        return `Hex: ${hex}\nASCII: ${ascii}`;
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
        this.dataDisplay.innerHTML = data;
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
