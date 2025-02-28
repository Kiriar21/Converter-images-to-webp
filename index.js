const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    inputDir: './src', 
    outputDir: './out', 
    quality: 80, //(0-100)
    resize: { // null - without change
        // width: 800, 
        // height: 600 
    },
    filenamePrefix: 'image_', 
    filenameSuffix: '', 
    startCounter: 1, // First number to renumerate files
};

// Main function to convert image
async function convertToWebP(inputPath, outputPath, counter) {
    try {
        const originalStats = fs.statSync(inputPath); 

        let image = sharp(inputPath)
            .webp({ quality: config.quality }) 
            .withMetadata() 
            .removeAlpha() // Delete alpha channel if exist
            .normalize(); // Normalize colors

        // If resize is set
        if (config.resize.width && config.resize.height) {
            image = image.resize(config.resize.width, config.resize.height);
        }

        // Filename
        const filename = `${config.filenamePrefix}${counter}${config.filenameSuffix}.webp`;
        const finalOutputPath = path.join(outputPath, filename);

        await image.toFile(finalOutputPath); 

        const finalStats = fs.statSync(finalOutputPath); 

        const sizeChange = finalStats.size - originalStats.size;
        const sizeChangePercent = ((sizeChange / originalStats.size) * 100).toFixed(2);

        // Display information
        console.log('------------------------');
        console.log(`${counter}. Conversion done:`);
        console.log(`- Name before: ${path.basename(inputPath)}`);
        console.log(`- Size before: ${originalStats.size} bytes`);
        console.log(`- Name after: ${filename}`);
        console.log(`- Size after: ${finalStats.size} bytes`);
        console.log(`- Size changes: ${sizeChange > 0 ? '+' : ''}${sizeChange} bytes (${sizeChange > 0 ? '+' : ''}${sizeChangePercent}%)`);
        console.log('------------------------');

        // Return information about conversion
        return {
            success: true,
            originalSize: originalStats.size,
            finalSize: finalStats.size,
            sizeChange,
            sizeChangePercent,
            reducedSize: sizeChange > 0
        };

    } catch (error) {
        console.error(`Error while conversion: ${error}`);
        return {
            success: false,
            error: error.message
        };
    }
}

// Function to convert multiple images
async function convertMultipleImages(inputDir, outputDir) {
    const files = fs.readdirSync(inputDir);
    const images = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file)); 

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir); 
    }

    let counter = config.startCounter;
    let successCount = 0;
    let errorCount = 0;
    let reducedSizeCount = 0;
    let sameOrLargerSizeCount = 0;
    let totalOriginalSize = 0;
    let totalFinalSize = 0;

    const startTime = Date.now(); // Start timer

    const promises = images.map(image => {
        const inputPath = path.join(inputDir, image);
        return convertToWebP(inputPath, outputDir, counter++)
            .then(result => {
                if (result.success) {
                    successCount++;
                    totalOriginalSize += result.originalSize;
                    totalFinalSize += result.finalSize;

                    if (result.reducedSize) {
                        reducedSizeCount++;
                    } else {
                        sameOrLargerSizeCount++;
                    }

                } else {
                    errorCount++;
                }
            });
    });

    await Promise.all(promises); // Execute all conversions in parallel

    const endTime = Date.now(); // End timer
    const executionTimeInSeconds = (endTime - startTime) / 1000; // in seconds
    const executionTimeInMinutes = (executionTimeInSeconds / 60).toFixed(2); // in minutes

    // Calculate overall size change percentage
    const totalSizeChange = totalFinalSize - totalOriginalSize;
    const totalSizeChangePercent = isNaN((totalSizeChange / totalOriginalSize) * 100) 
                                    ? 0 
                                    : ((totalSizeChange / totalOriginalSize) * 100).toFixed(2);


    // Display final statistics
    console.log('------------------------');
    console.log(`Total images processed: ${images.length}`);
    console.log(`Successfully converted: ${successCount}`);
    console.log(`Failed to convert: ${errorCount}`);
    console.log(`Total execution time: ${executionTimeInSeconds} seconds (${executionTimeInMinutes} minutes)`);
    console.log(`Total size before: ${totalOriginalSize} bytes`);
    console.log(`Total size after: ${totalFinalSize} bytes`);
    console.log(`Total size change: ${totalSizeChange > 0 ? '+' : ''}${totalSizeChange} bytes (${totalSizeChangePercent}%)`);
    console.log(`Images with reduced size: ${reducedSizeCount}`);
    console.log(`Images with same or larger size: ${sameOrLargerSizeCount}`);
    console.log('------------------------');
}

// Automatic run script
convertMultipleImages(config.inputDir, config.outputDir);
