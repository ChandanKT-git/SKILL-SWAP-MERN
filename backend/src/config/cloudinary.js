const cloudinary = require('cloudinary').v2;
const config = require('./index');

/**
 * Cloudinary configuration for image uploads with optimization and caching
 */
class CloudinaryConfig {
    constructor() {
        this.isConfigured = false;
        this.urlCache = new Map(); // Simple in-memory cache for transformed URLs
        this.cacheMaxSize = 1000;
        this.cacheMaxAge = 3600000; // 1 hour in milliseconds
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

            // Configure Cloudinary with optimization settings
            cloudinary.config({
                cloud_name: config.cloudinary.cloudName,
                api_key: config.cloudinary.apiKey,
                api_secret: config.cloudinary.apiSecret,
                secure: true,
                // Enable automatic format and quality optimization
                default_transformation: [
                    { fetch_format: 'auto', quality: 'auto' }
                ]
            });

            this.isConfigured = true;
            console.log('✅ Cloudinary configured successfully with optimization');
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
     * Upload image to Cloudinary with optimization
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
            quality: 'auto:good', // Automatic quality with good balance
            fetch_format: 'auto', // Automatic format selection (WebP, AVIF, etc.)
            flags: 'progressive', // Progressive JPEG loading
            // Optimize file size while maintaining quality
            transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ]
        };

        const result = await cloudinary.uploader.upload(filePath, {
            ...defaultOptions,
            ...options,
        });

        return result;
    }

    /**
     * Upload profile image with specific optimizations
     * @param {string} filePath - Path to the file to upload
     * @param {string} userId - User ID for naming
     * @returns {Promise<Object>} Upload result
     */
    async uploadProfileImage(filePath, userId) {
        return this.uploadImage(filePath, {
            folder: 'skillswap/profiles',
            public_id: `profile_${userId}`,
            overwrite: true,
            transformation: [
                { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            // Generate responsive image variants
            eager: [
                { width: 150, height: 150, crop: 'thumb', gravity: 'face' },
                { width: 300, height: 300, crop: 'fill', gravity: 'face' }
            ],
            eager_async: true
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

        // Clear from cache if exists
        this.clearCacheForPublicId(publicId);

        return await cloudinary.uploader.destroy(publicId);
    }

    /**
     * Generate optimized transformation URL with caching
     * @param {string} publicId - Public ID of the image
     * @param {Object} transformations - Transformation options
     * @returns {string} Transformed image URL
     */
    getOptimizedUrl(publicId, transformations = {}) {
        if (!this.isConfigured || !publicId) {
            return null;
        }

        const cacheKey = `${publicId}_${JSON.stringify(transformations)}`;

        // Check cache first
        const cached = this.getCachedUrl(cacheKey);
        if (cached) {
            return cached;
        }

        // Default optimizations
        const defaultTransformations = {
            quality: 'auto:good',
            fetch_format: 'auto',
            flags: 'progressive',
            ...transformations
        };

        const url = cloudinary.url(publicId, defaultTransformations);

        // Cache the URL
        this.cacheUrl(cacheKey, url);

        return url;
    }

    /**
     * Generate transformation URL (legacy method)
     * @param {string} publicId - Public ID of the image
     * @param {Object} transformations - Transformation options
     * @returns {string} Transformed image URL
     */
    getTransformedUrl(publicId, transformations = {}) {
        return this.getOptimizedUrl(publicId, transformations);
    }

    /**
     * Get responsive image URLs for different screen sizes
     * @param {string} publicId - Public ID of the image
     * @returns {Object} Object with URLs for different sizes
     */
    getResponsiveUrls(publicId) {
        if (!this.isConfigured || !publicId) {
            return null;
        }

        return {
            thumbnail: this.getOptimizedUrl(publicId, { width: 150, height: 150, crop: 'thumb' }),
            small: this.getOptimizedUrl(publicId, { width: 300, height: 300, crop: 'fill' }),
            medium: this.getOptimizedUrl(publicId, { width: 500, height: 500, crop: 'fill' }),
            large: this.getOptimizedUrl(publicId, { width: 1000, height: 1000, crop: 'limit' }),
            original: this.getOptimizedUrl(publicId, {})
        };
    }

    /**
     * Cache a URL
     * @param {string} key - Cache key
     * @param {string} url - URL to cache
     */
    cacheUrl(key, url) {
        // Implement simple LRU by removing oldest entries when cache is full
        if (this.urlCache.size >= this.cacheMaxSize) {
            const firstKey = this.urlCache.keys().next().value;
            this.urlCache.delete(firstKey);
        }

        this.urlCache.set(key, {
            url,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached URL if valid
     * @param {string} key - Cache key
     * @returns {string|null} Cached URL or null
     */
    getCachedUrl(key) {
        const cached = this.urlCache.get(key);

        if (!cached) {
            return null;
        }

        // Check if cache entry is still valid
        if (Date.now() - cached.timestamp > this.cacheMaxAge) {
            this.urlCache.delete(key);
            return null;
        }

        return cached.url;
    }

    /**
     * Clear cache entries for a specific public ID
     * @param {string} publicId - Public ID to clear from cache
     */
    clearCacheForPublicId(publicId) {
        for (const key of this.urlCache.keys()) {
            if (key.startsWith(publicId)) {
                this.urlCache.delete(key);
            }
        }
    }

    /**
     * Clear entire URL cache
     */
    clearCache() {
        this.urlCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.urlCache.size,
            maxSize: this.cacheMaxSize,
            maxAge: this.cacheMaxAge
        };
    }
}

// Create singleton instance
const cloudinaryConfig = new CloudinaryConfig();

// Export both the config instance and the cloudinary object
module.exports = cloudinary;
module.exports.config = cloudinaryConfig;