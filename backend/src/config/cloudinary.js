const cloudinary = require('cloudinary').v2;
const config = require('./index');

/**
 * Cloudinary configuration for image uploads
 */
class CloudinaryConfig {
    constructor() {
        this.isConfigured = false;
        this.initializeCloudinary();
    }

    /**
     * Initialize Cloudinary configuration
     */
    initializeCloudinary() {
        try {
            // Check if Cloudinary configuration is available
            if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
                console.warn('⚠️ Cloudinary not configured - image uploads will be disabled');
                this.isConfigured = false;
                return;
            }

            // Configure Cloudinary
            cloudinary.config({
                cloud_name: config.cloudinary.cloudName,
                api_key: config.cloudinary.apiKey,
                api_secret: config.cloudinary.apiSecret,
                secure: true,
            });

            this.isConfigured = true;
            console.log('✅ Cloudinary configured successfully');
        } catch (error) {
            console.error('❌ Failed to configure Cloudinary:', error.message);
            this.isConfigured = false;
        }
    }

    /**
     * Check if Cloudinary is properly configured
     * @returns {boolean} True if configured
     */
    isReady() {
        return this.isConfigured;
    }

    /**
     * Upload image to Cloudinary
     * @param {string} filePath - Path to the file to upload
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} Upload result
     */
    async uploadImage(filePath, options = {}) {
        if (!this.isConfigured) {
            throw new Error('Cloudinary is not configured');
        }

        const defaultOptions = {
            resource_type: 'image',
            quality: 'auto',
            fetch_format: 'auto',
        };

        return await cloudinary.uploader.upload(filePath, {
            ...defaultOptions,
            ...options,
        });
    }

    /**
     * Delete image from Cloudinary
     * @param {string} publicId - Public ID of the image to delete
     * @returns {Promise<Object>} Deletion result
     */
    async deleteImage(publicId) {
        if (!this.isConfigured) {
            throw new Error('Cloudinary is not configured');
        }

        return await cloudinary.uploader.destroy(publicId);
    }

    /**
     * Generate transformation URL
     * @param {string} publicId - Public ID of the image
     * @param {Object} transformations - Transformation options
     * @returns {string} Transformed image URL
     */
    getTransformedUrl(publicId, transformations = {}) {
        if (!this.isConfigured) {
            return null;
        }

        return cloudinary.url(publicId, transformations);
    }
}

// Create singleton instance
const cloudinaryConfig = new CloudinaryConfig();

// Export both the config instance and the cloudinary object
module.exports = cloudinary;
module.exports.config = cloudinaryConfig;