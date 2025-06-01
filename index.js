require('dotenv').config();
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

/**
 * Formats a log message with color
 * @param {string} message - The message to log
 * @param {string} color - The color to use
 * @param {boolean} isBright - Whether to use bright color
 * @returns {string} - Colored message
 */
function colorLog(message, color = 'white', isBright = false) {
    return `${isBright ? colors.bright : ''}${colors[color]}${message}${colors.reset}`;
}

/**
 * Gets the audio format from the file extension
 * @param {string} filePath - Path to the audio file
 * @returns {string} - Audio format (e.g., 'mp3', 'wav')
 */
function getAudioFormat(filePath) {
    return path.extname(filePath).toLowerCase().slice(1);
}

/**
 * Validates that all audio files have compatible formats
 * @param {string} mainAudio - Path to the main audio file
 * @param {string} radioTag - Path to the radio tag audio
 * @param {string} outputPath - Path for the output file
 * @throws {Error} If formats are incompatible or unsupported
 */
function validateAudioFormats(mainAudio, radioTag, outputPath) {
    const supportedFormats = ['mp3', 'wav'];
    const mainFormat = getAudioFormat(mainAudio);
    const tagFormat = getAudioFormat(radioTag);
    const outputFormat = getAudioFormat(outputPath);

    // Check if formats are supported
    [mainFormat, tagFormat, outputFormat].forEach(format => {
        if (!supportedFormats.includes(format)) {
            throw new Error(colorLog(`Unsupported audio format: ${format}. Supported formats are: ${supportedFormats.join(', ')}`, 'red', true));
        }
    });
}

/**
 * Appends a radio tag to both start and end of a main audio file
 * @param {string} mainAudio - Path to the main audio file
 * @param {string} radioTag - Path to the radio tag audio to append at both start and end
 * @param {string} outputPath - Path where the final audio will be saved
 * @returns {Promise} - Resolves when the processing is complete
 */
function appendRadioTag(mainAudio, radioTag, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            // Validate audio formats before processing
            validateAudioFormats(mainAudio, radioTag, outputPath);

            console.log(colorLog('\n🎵 Processing audio files...', 'magenta', true));
            
            ffmpeg.ffprobe(mainAudio, (err, metadata) => {
                if (err) {
                    reject(colorLog('Error analyzing audio file: ' + err.message, 'red', true));
                    return;
                }

                // Get audio stream info
                const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
                if (!audioStream) {
                    reject(colorLog('No audio stream found in main file', 'red', true));
                    return;
                }

                // Get sample rate info for all files to ensure they match
                console.log(colorLog('\n🔍 Analyzing audio files...', 'magenta', true));
                
                // Analyze radio tag file
                ffmpeg.ffprobe(radioTag, (err, radioTagInfo) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const radioTagStream = radioTagInfo.streams.find(stream => stream.codec_type === 'audio');
                    if (!radioTagStream) {
                        reject(new Error('No audio stream found in radio tag file'));
                        return;
                    }

                    // Create temporary files for converted audio if needed
                    const tempMainAudio = path.join(__dirname, 'temp_main.wav');
                    const tempRadioTag = path.join(__dirname, 'temp_tag.wav');
                    
                    // First, convert both files to WAV with same sample rate
                    console.log(colorLog('\n⚙️ Preparing audio files...', 'magenta', true));
                    
                    // Convert main audio to temp WAV
                    ffmpeg(mainAudio)
                        .outputOptions([
                            '-acodec', 'pcm_s16le',
                            '-ar', '44100',
                            '-ac', '2'
                        ])
                        .save(tempMainAudio)
                        .on('end', () => {
                            // Convert radio tag to temp WAV
                            ffmpeg(radioTag)
                                .outputOptions([
                                    '-acodec', 'pcm_s16le',
                                    '-ar', '44100',
                                    '-ac', '2'
                                ])
                                .save(tempRadioTag)
                                .on('end', () => {
                                    // Now concatenate the WAV files
                                    console.log(colorLog('\n🎵 Processing audio files...', 'magenta', true));

                                    // Create a temporary file for the concatenation list
                                    const tempList = path.join(__dirname, 'temp_list.txt');
                                    const fileContent = `file '${tempRadioTag}'\nfile '${tempMainAudio}'\nfile '${tempRadioTag}'`;
                                    fs.writeFileSync(tempList, fileContent);

                                    // Determine final output format settings
                                    const outputFormat = getAudioFormat(outputPath);
                                    const outputOptions = [];

                                    if (outputFormat === 'wav') {
                                        outputOptions.push(
                                            '-acodec', 'pcm_s16le',
                                            '-ar', '44100',
                                            '-ac', '2'
                                        );
                                    } else if (outputFormat === 'mp3') {
                                        outputOptions.push(
                                            '-acodec', 'libmp3lame',
                                            '-q:a', '0',
                                            '-ar', '44100',
                                            '-ac', '2'
                                        );
                                    }

                                    // Ensure output directory exists
                                    const outputDir = path.dirname(outputPath);
                                    if (!fs.existsSync(outputDir)) {
                                        fs.mkdirSync(outputDir, { recursive: true });
                                    }

                                    // Final concatenation
                                    ffmpeg()
                                        .input(tempList)
                                        .inputOptions([
                                            '-f', 'concat',
                                            '-safe', '0'
                                        ])
                                        .outputOptions(outputOptions)
                                        .output(outputPath)
                                        .on('progress', (progress) => {
                                            const percent = Math.round(progress.percent || 0);
                                            process.stdout.write(`\n${colorLog('⏱️  Processing: ', 'blue')}${colorLog(`${percent}%`, 'cyan')}`);
                                        })
                                        .on('end', () => {
                                            // Clean up temporary files
                                            [tempList, tempMainAudio, tempRadioTag].forEach(file => {
                                                if (fs.existsSync(file)) {
                                                    fs.unlinkSync(file);
                                                }
                                            });
                                            console.log(colorLog('\n\n✨ Processing completed!', 'green', true));
                                            resolve();
                                        })
                                        .on('error', (err) => {
                                            // Clean up temporary files
                                            [tempList, tempMainAudio, tempRadioTag].forEach(file => {
                                                if (fs.existsSync(file)) {
                                                    fs.unlinkSync(file);
                                                }
                                            });
                                            console.error(colorLog('\n❌ Error:', 'red', true), colorLog(err.message, 'red'));
                                            reject(err);
                                        })
                                        .run();
                                })
                                .on('error', (err) => {
                                    reject(err);
                                });
                        })
                        .on('error', (err) => {
                            reject(err);
                        });
                });
            });
        } catch (error) {
            reject(colorLog('\nError: ' + error.message, 'red', true));
        }
    });
}

// Main execution
if (require.main === module) {
    const mainAudio = process.env.MAIN_AUDIO_PATH;
    const radioTag = process.env.RADIO_TAG_PATH;
    const outputPath = process.env.OUTPUT_PATH;

    if (!mainAudio || !radioTag || !outputPath) {
        console.error(colorLog('\n❌ Missing required environment variables!', 'red', true));
        console.error(colorLog('\nRequired in .env file:', 'yellow'));
        console.error(colorLog('  • MAIN_AUDIO_PATH - Main audio file', 'cyan'));
        console.error(colorLog('  • RADIO_TAG_PATH - Radio tag audio file', 'cyan'));
        console.error(colorLog('  • OUTPUT_PATH - Output file location', 'cyan'));
        process.exit(1);
    }

    // Verify that all input files exist
    [mainAudio, radioTag].forEach(file => {
        if (!fs.existsSync(file)) {
            console.error(colorLog(`\n❌ File not found: ${file}`, 'red', true));
            process.exit(1);
        }
    });

    console.log(colorLog('\n📂 Processing files:', 'magenta', true));
    console.log(colorLog(`  • Main Audio: ${mainAudio}`, 'cyan'));
    console.log(colorLog(`  • Radio Tag: ${radioTag}`, 'cyan'));
    console.log(colorLog(`  • Output: ${outputPath}`, 'cyan'));

    appendRadioTag(mainAudio, radioTag, outputPath)
        .then(() => {
            console.log(colorLog(`\n📁 Saved to: ${outputPath}`, 'green', true));
        })
        .catch(err => {
            console.error(colorLog('\n❌ Error:', 'red', true), colorLog(err.message, 'red'));
            process.exit(1);
        });
} 