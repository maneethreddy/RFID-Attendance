// NFC Scanner Application
class NFCScanner {
    constructor() {
        this.isScanning = false;
        this.reader = null;
        this.lastTagData = null; // Store the last scanned tag data
        this.initializeElements();
        this.bindEvents();
        this.checkNFCSupport();
        
        // Make this instance globally accessible for export functions
        window.nfcScanner = this;
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
            // Check if event and message exist
            if (!event) {
                throw new Error('No event data received');
            }
            
            const message = event.message;
            if (!message) {
                throw new Error('No message data in NFC tag');
            }
            
            const records = message.records;
            if (!records) {
                throw new Error('No records found in NFC message');
            }
            
            // Ensure records is iterable (array-like)
            if (!Array.isArray(records) && typeof records[Symbol.iterator] !== 'function') {
                throw new Error('Records data is not iterable');
            }
            
            // Create structured data object for technical display
            const tagData = this.createStructuredTagData(event, records);
            
            // Store for export functionality
            this.lastTagData = tagData;
            
            let displayData = this.formatTechnicalDisplay(tagData);

            this.displayResults(displayData);
            this.updateUI('ready', 'Tag scanned successfully!');
            
            // Auto-stop scanning after successful read
            setTimeout(() => {
                this.stopScanning();
            }, 2000);

        } catch (error) {
            console.error('Error processing NFC data:', error);
            
            // Provide more specific error messages based on error type
            let errorMessage = 'Error processing NFC tag data: ';
            
            if (error.message.includes('No event data received')) {
                errorMessage += 'No data received from NFC reader. Please try scanning again.';
            } else if (error.message.includes('No message data in NFC tag')) {
                errorMessage += 'This NFC tag appears to be empty or unformatted.';
            } else if (error.message.includes('No records found in NFC message')) {
                errorMessage += 'No readable data found on this NFC tag.';
            } else if (error.message.includes('Records data is not iterable')) {
                errorMessage += 'Invalid data format on this NFC tag.';
            } else if (error.name === 'DataError') {
                errorMessage += 'Invalid data format on NFC tag.';
            } else if (error.name === 'NetworkError') {
                errorMessage += 'Network error while reading NFC tag.';
            } else if (error.name === 'SecurityError') {
                errorMessage += 'Security error - NFC access may be restricted.';
            } else {
                errorMessage += error.message || 'Unknown error occurred.';
            }
            
            this.showError(errorMessage);
        }
    }

    createStructuredTagData(event, records) {
        const timestamp = new Date();
        const tagData = {
            scan_info: {
                timestamp: timestamp.toISOString(),
                timestamp_unix: Math.floor(timestamp.getTime() / 1000),
                scanner_version: "1.0.0"
            },
            tag_technical: {
                detected: true,
                type: "Unknown",
                technologies: [],
                memory_info: null,
                serial_number: null,
                atqa: null,
                sak: null,
                max_size: null,
                is_writable: null,
                can_make_readonly: null
            },
            ndef_message: {
                has_message: !!event.message,
                record_count: records ? records.length : 0,
                records: []
            },
            raw_data: {
                event_keys: Object.keys(event || {}),
                message_keys: event.message ? Object.keys(event.message) : []
            }
        };

        // Try to extract technical information
        try {
            if (event.serialNumber) {
                tagData.tag_technical.serial_number = this.formatSerialNumber(event.serialNumber);
            }

            if (event.tag) {
                const tag = event.tag;
                
                if (tag.tech) {
                    tagData.tag_technical.technologies = Array.from(tag.tech);
                    tagData.tag_technical.type = this.determineTagType(tag.tech);
                }
                
                if (tag.atqa !== undefined) {
                    tagData.tag_technical.atqa = `0x${tag.atqa.toString(16).padStart(4, '0')}`;
                }
                
                if (tag.sak !== undefined) {
                    tagData.tag_technical.sak = `0x${tag.sak.toString(16).padStart(2, '0')}`;
                }
                
                if (tag.maxSize !== undefined) {
                    tagData.tag_technical.max_size = tag.maxSize;
                    tagData.tag_technical.memory_info = this.getMemoryInfo(tag);
                }
                
                if (tag.isWritable !== undefined) {
                    tagData.tag_technical.is_writable = tag.isWritable;
                }
                
                if (tag.canMakeReadOnly !== undefined) {
                    tagData.tag_technical.can_make_readonly = tag.canMakeReadOnly;
                }
            }
        } catch (error) {
            tagData.tag_technical.error = error.message;
        }

        // Process NDEF records
        if (records && records.length > 0) {
            const recordsArray = Array.isArray(records) ? records : Array.from(records);
            tagData.ndef_message.records = recordsArray.map((record, index) => {
                return this.createStructuredRecord(record, index);
            });
        }

        return tagData;
    }

    createStructuredRecord(record, index) {
        const structuredRecord = {
            index: index,
            record_type: record.recordType || "unknown",
            tnf: record.tnf || 0,
            media_type: record.mediaType || null,
            id: record.id || null,
            data: {
                byte_length: record.data ? record.data.byteLength : 0,
                hex: null,
                ascii: null,
                parsed_content: null
            },
            parsing_error: null
        };

        // Process data
        if (record.data && record.data.byteLength > 0) {
            try {
                const dataArray = Array.from(record.data);
                structuredRecord.data.hex = dataArray
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join(' ');
                
                structuredRecord.data.ascii = dataArray
                    .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
                    .join('');
                
                // Try to parse content
                structuredRecord.data.parsed_content = this.parseRecordDataStructured(record);
            } catch (error) {
                structuredRecord.parsing_error = error.message;
            }
        }

        return structuredRecord;
    }

    parseRecordDataStructured(record) {
        if (!record || !record.data) return null;

        const decoder = new TextDecoder();
        const parsed = {
            type: record.recordType,
            content: null,
            metadata: {}
        };

        try {
            switch (record.recordType) {
                case 'text':
                    const statusByte = record.data[0];
                    const languageCodeLength = statusByte & 0x3F;
                    const encoding = (statusByte & 0x80) ? 'UTF-16' : 'UTF-8';
                    const languageCode = decoder.decode(record.data.slice(1, 1 + languageCodeLength));
                    const text = decoder.decode(record.data.slice(1 + languageCodeLength));
                    
                    parsed.content = text;
                    parsed.metadata = { language: languageCode, encoding: encoding };
                    break;
                    
                case 'url':
                    const prefixCode = record.data[0];
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
                    const url = decoder.decode(record.data.slice(1));
                    
                    parsed.content = prefix + url;
                    parsed.metadata = { prefix_code: prefixCode };
                    break;
                    
                default:
                    try {
                        parsed.content = decoder.decode(record.data);
                    } catch (e) {
                        parsed.content = null;
                    }
            }
        } catch (error) {
            parsed.content = null;
            parsed.error = error.message;
        }

        return parsed;
    }

    formatTechnicalDisplay(tagData) {
        let display = '';
        
        // Header with export options
        display += `<div class="technical-header">`;
        display += `<h3>📊 NFC Tag Technical Analysis</h3>`;
        display += `<div class="export-buttons">`;
        display += `<button onclick="window.nfcScanner.exportData('json')" class="export-btn">Export JSON</button>`;
        display += `<button onclick="window.nfcScanner.exportData('csv')" class="export-btn">Export CSV</button>`;
        display += `<button onclick="window.nfcScanner.exportData('raw')" class="export-btn">Copy Raw Data</button>`;
        display += `</div>`;
        display += `</div>\n\n`;

        // JSON Preview
        display += `<div class="json-section">`;
        display += `<h4>🔧 Structured Data (JSON)</h4>`;
        display += `<pre class="json-display">${JSON.stringify(tagData, null, 2)}</pre>`;
        display += `</div>\n\n`;

        // Quick Summary
        display += `<div class="summary-section">`;
        display += `<h4>📋 Quick Summary</h4>`;
        display += `<table class="summary-table">`;
        display += `<tr><td><strong>Scan Time:</strong></td><td>${tagData.scan_info.timestamp}</td></tr>`;
        display += `<tr><td><strong>Tag Type:</strong></td><td>${tagData.tag_technical.type}</td></tr>`;
        display += `<tr><td><strong>Technologies:</strong></td><td>${tagData.tag_technical.technologies.join(', ') || 'Unknown'}</td></tr>`;
        display += `<tr><td><strong>Records Found:</strong></td><td>${tagData.ndef_message.record_count}</td></tr>`;
        if (tagData.tag_technical.serial_number) {
            display += `<tr><td><strong>Serial Number:</strong></td><td>${tagData.tag_technical.serial_number}</td></tr>`;
        }
        if (tagData.tag_technical.max_size) {
            display += `<tr><td><strong>Memory Size:</strong></td><td>${tagData.tag_technical.max_size} bytes</td></tr>`;
        }
        display += `</table>`;
        display += `</div>\n\n`;

        // Record Details
        if (tagData.ndef_message.records.length > 0) {
            display += `<div class="records-section">`;
            display += `<h4>📝 NDEF Records Detail</h4>`;
            tagData.ndef_message.records.forEach((record, index) => {
                display += `<div class="record-detail">`;
                display += `<h5>Record ${index + 1}</h5>`;
                display += `<table class="record-table">`;
                display += `<tr><td><strong>Type:</strong></td><td>${record.record_type}</td></tr>`;
                display += `<tr><td><strong>TNF:</strong></td><td>${record.tnf}</td></tr>`;
                display += `<tr><td><strong>Data Length:</strong></td><td>${record.data.byte_length} bytes</td></tr>`;
                if (record.data.hex) {
                    display += `<tr><td><strong>Hex Data:</strong></td><td><code class="hex-data">${record.data.hex}</code></td></tr>`;
                }
                if (record.data.parsed_content && record.data.parsed_content.content) {
                    display += `<tr><td><strong>Content:</strong></td><td>${record.data.parsed_content.content}</td></tr>`;
                }
                display += `</table>`;
                display += `</div>`;
            });
            display += `</div>\n\n`;
        }

        return display;
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
        // Check if record exists
        if (!record) {
            return '- Error: Record is null or undefined\n';
        }
        
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
        if (!data) {
            return 'No data available';
        }
        
        if (data.byteLength === 0) {
            return 'Empty';
        }
        
        // Convert to hex string
        let hex = '';
        let ascii = '';
        
        try {
            const dataArray = Array.from(data);
            hex = dataArray
                .map(b => b.toString(16).padStart(2, '0'))
                .join(' ');
            
            // Also try to show as ASCII if possible
            ascii = dataArray
                .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
                .join('');
        } catch (e) {
            hex = 'Unable to convert to hex';
            ascii = 'Unable to convert to ASCII';
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

    exportData(format) {
        if (!this.lastTagData) {
            alert('No tag data available to export. Please scan a tag first.');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        switch (format) {
            case 'json':
                this.downloadJSON(this.lastTagData, `nfc-tag-data-${timestamp}.json`);
                break;
            case 'csv':
                this.downloadCSV(this.lastTagData, `nfc-tag-data-${timestamp}.csv`);
                break;
            case 'raw':
                this.copyToClipboard(JSON.stringify(this.lastTagData, null, 2));
                break;
            default:
                alert('Unknown export format');
        }
    }

    downloadJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage(`JSON data exported as ${filename}`);
    }

    downloadCSV(data, filename) {
        let csv = 'Field,Value\n';
        
        // Add scan info
        csv += `Timestamp,${data.scan_info.timestamp}\n`;
        csv += `Unix Timestamp,${data.scan_info.timestamp_unix}\n`;
        csv += `Scanner Version,${data.scan_info.scanner_version}\n`;
        
        // Add tag technical info
        csv += `Tag Detected,${data.tag_technical.detected}\n`;
        csv += `Tag Type,${data.tag_technical.type}\n`;
        csv += `Technologies,"${data.tag_technical.technologies.join(', ')}"\n`;
        csv += `Serial Number,${data.tag_technical.serial_number || 'N/A'}\n`;
        csv += `ATQA,${data.tag_technical.atqa || 'N/A'}\n`;
        csv += `SAK,${data.tag_technical.sak || 'N/A'}\n`;
        csv += `Max Size,${data.tag_technical.max_size || 'N/A'}\n`;
        csv += `Is Writable,${data.tag_technical.is_writable || 'N/A'}\n`;
        csv += `Can Make Read-Only,${data.tag_technical.can_make_readonly || 'N/A'}\n`;
        
        // Add NDEF message info
        csv += `Has NDEF Message,${data.ndef_message.has_message}\n`;
        csv += `Record Count,${data.ndef_message.record_count}\n`;
        
        // Add records
        data.ndef_message.records.forEach((record, index) => {
            csv += `Record ${index + 1} Type,${record.record_type}\n`;
            csv += `Record ${index + 1} TNF,${record.tnf}\n`;
            csv += `Record ${index + 1} Data Length,${record.data.byte_length}\n`;
            csv += `Record ${index + 1} Hex Data,"${record.data.hex || ''}"\n`;
            csv += `Record ${index + 1} ASCII Data,"${record.data.ascii || ''}"\n`;
            if (record.data.parsed_content && record.data.parsed_content.content) {
                csv += `Record ${index + 1} Content,"${record.data.parsed_content.content}"\n`;
            }
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage(`CSV data exported as ${filename}`);
    }

    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showSuccessMessage('Raw data copied to clipboard!');
            }).catch(() => {
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showSuccessMessage('Raw data copied to clipboard!');
        } catch (err) {
            alert('Failed to copy to clipboard. Please copy manually from the JSON display.');
        }
        
        document.body.removeChild(textArea);
    }

    showSuccessMessage(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 3000);
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
