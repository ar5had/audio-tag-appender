# Audio Tag Appender

A Node.js application that adds audio tags (like station identifiers) to the beginning and end of audio files.

## Features

- Supports both MP3 and WAV formats
- Preserves original audio quality
- Maintains original audio properties (sample rate, channels, bitrate)
- Progress tracking with colorful console output
- Easy configuration via environment variables

## Prerequisites

- Node.js (v12 or higher)
- FFmpeg installed on your system

### Installing FFmpeg

- **macOS**: `brew install ffmpeg`
- **Windows**: Download from [FFmpeg official website](https://ffmpeg.org/download.html)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ar5had/audio-tag-appender.git
   cd audio-tag-appender
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

1. Place your audio files in the `audio` directory
2. Update the paths in `.env` file
3. Run the application:
   ```bash
   npm start
   ```

## File Structure

```
audio-tag-appender/
├── audio/                          # Place your audio files here
│   ├── example-main.wav            # Your main audio file
│   └── example-station-tag.wav     # Your station tag file
├── output/                         # Processed files will be saved here
├── index.js                        # Main application file
├── package.json                    # Project dependencies
└── .env                            # Configuration file
```

## Environment Variables in .env files

- `MAIN_AUDIO_PATH`: Path to your main audio file
- `RADIO_TAG_PATH`: Path to your station tag audio file
- `OUTPUT_PATH`: Where to save the processed file

## License

This project is licensed under the ISC License - a permissive free software license published by the Internet Systems Consortium (ISC). It is functionally equivalent to the simplified BSD and MIT licenses, removing some language that is no longer necessary.

Key points of the ISC license:
- You can freely use, modify, and distribute the software
- You must include the original copyright notice
- The software comes with no warranty
- The author is not liable for any damages

See the [LICENSE](LICENSE) file for the full license text.
