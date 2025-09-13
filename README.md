# NFC Tag Scanner

A simple HTML, CSS, and JavaScript application that uses the device's built-in NFC reader to scan NFC tags and display their data.

## Features

- 📱 **NFC Tag Scanning**: Uses the Web NFC API to read NFC tags
- 🎨 **Modern UI**: Beautiful, responsive design with smooth animations
- 📊 **Data Display**: Shows detailed information about scanned tags
- ⚠️ **Error Handling**: Comprehensive error handling and user feedback
- 📱 **Mobile Optimized**: Designed for mobile devices with NFC capability

## Requirements

- **Device**: Android device with NFC capability
- **Browser**: Chrome 89+ or Edge 89+ (Web NFC API support)
- **Connection**: HTTPS connection (required for security)
- **Permissions**: NFC permission must be granted

## How to Use

1. **Open the Application**: 
   - For local testing, you can use a local HTTPS server
   - For production, deploy to a web server with HTTPS

2. **Start Scanning**:
   - Click the "Start Scanning" button
   - Hold your device close to an NFC tag
   - Wait for the scan to complete

3. **View Results**:
   - Scanned data will appear in the results section
   - Data includes record type, content, and metadata
   - Use "Clear Results" to reset

## Supported NFC Record Types

### Standard NDEF Record Types
- **Empty Records**: Empty NDEF records
- **Text Records**: Plain text with language and encoding detection
- **URL Records**: Web links with prefix code support (35+ URL prefixes)
- **MIME Records**: Various data formats with JSON parsing
- **Smart Poster Records**: Multi-record containers
- **Absolute URI Records**: Complete URI references
- **External Records**: Custom application data

### Well-Known Record Types
- **Wi-Fi Configuration**: WPS (Wi-Fi Protected Setup) data
- **Bluetooth Configuration**: Bluetooth pairing data
- **vCard Records**: Contact information
- **Android Application Records**: App installation data
- **Generic Well-Known**: Any well-known type with proper parsing

### Advanced Features
- **TNF (Type Name Format) Detection**: Identifies record structure
- **Language Detection**: For text records (UTF-8/UTF-16)
- **URL Prefix Expansion**: Converts prefix codes to full URLs
- **JSON Parsing**: Pretty-prints JSON MIME content
- **Raw Data Fallback**: Hex and ASCII display for unknown formats
- **Error Handling**: Graceful handling of parsing errors

## Browser Compatibility

| Browser | Android | iOS | Desktop |
|---------|---------|-----|---------|
| Chrome 89+ | ✅ | ❌ | ❌ |
| Edge 89+ | ✅ | ❌ | ❌ |
| Firefox | ❌ | ❌ | ❌ |
| Safari | ❌ | ❌ | ❌ |

## Local Development

To run this application locally with HTTPS:

### Option 1: Using Python
```bash
# Python 3
python -m http.server 8000

# Then access via https://localhost:8000 (you may need to accept security warnings)
```

### Option 2: Using Node.js (http-server)
```bash
# Install http-server globally
npm install -g http-server

# Run with HTTPS
http-server -S -C cert.pem -K key.pem -p 8000
```

### Option 3: Using Live Server (VS Code)
- Install the "Live Server" extension
- Right-click on `index.html` and select "Open with Live Server"
- Note: This may not work for NFC due to HTTPS requirements

## File Structure

```
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Troubleshooting

### Common Issues

1. **"NFC is not supported"**
   - Ensure you're using Chrome 89+ or Edge 89+ on Android
   - Check that your device has NFC capability

2. **"Permission denied"**
   - Grant NFC permissions when prompted
   - Ensure the site is served over HTTPS

3. **"NFC reader not available"**
   - Close other apps that might be using NFC
   - Restart the browser
   - Check device NFC settings

4. **"Not readable"**
   - Ensure the NFC tag is compatible
   - Try holding the device closer to the tag
   - Some tags may require specific positioning

### Testing Without NFC Tags

If you don't have NFC tags for testing, you can:
- Use NFC-enabled credit cards (be careful with personal data)
- Purchase NFC tags online (NTAG213, NTAG215, NTAG216 are common)
- Use NFC-enabled devices to create tags

## Security Notes

- The Web NFC API only works over HTTPS for security reasons
- Be cautious when scanning unknown NFC tags
- The application only reads data and doesn't write to tags
- Personal information on NFC tags should be handled carefully

## Future Enhancements

- Write data to NFC tags
- Support for more NFC tag formats
- Data export functionality
- Tag history and favorites
- Offline mode support

## License

This project is open source and available under the MIT License.
