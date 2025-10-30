import React, { useState, useEffect } from 'react';
import {
    FunnelIcon,
    XMarkIcon,
    ChevronDownIcon,
    MapPinIcon,
    StarIcon,
    ClockIcon,
    AcademicCapIcon
} from '@heroicons/react/24/outline';
import { SKILL_LEVELS, SKILL_LEVEL_LABELS } from '../../utils/constants';
import { useSkillCategories } from '../../hooks/useApi';

const FilterPanel = ({
    filters,
    onFiltersChange,
    isOpen,
    onToggle,
    className = ""
}) => {
    const [localFilters, setLocalFilters] = useState(filters);
    const [expandedSections, setExpandedSections] = useState({
        location: true,
        rating: true,
        availability: true,
        skillLevel: true,
        category: false
    });

    const { data: categories = [] } = useSkillCategories();

    // Update local filters when props change
    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleFilterChange = (key, value) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        onFiltersChange(newFilters);
    };

    const handleArrayFilterChange = (key, value, checked) => {
        const currentArray = localFilters[key] || [];
        let newArray;

        if (checked) {
            newArray = [...currentArray, value];
        } else {
            newArray = currentArray.filter(item => item !== value);
        }

        handleFilterChange(key, newArray);
    };

    const clearAllFilters = () => {
        const clearedFilters = {
            location: '',
            minRating: 0,
            maxDistance: '',
            availability: [],
            skillLevel: [],
            categories: [],
            sortBy: 'relevance'
        };
        setLocalFilters(clearedFilters);
        onFiltersChange(clearedFilters);
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (localFilters.location) count++;
        if (localFilters.minRating > 0) count++;
        if (localFilters.maxDistance) count++;
        if (localFilters.availability?.length > 0) count++;
        if (localFilters.skillLevel?.length > 0) count++;
        if (localFilters.categories?.length > 0) count++;
        return count;
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const FilterSection = ({ title, isExpanded, onToggle, children, icon: Icon }) => (
        <div className="border-b border-gray-200 last:border-b-0">
            <button
                onClick={onToggle}
                className="w-full px-4 py-3 flex items-center justify-between 
                         text-left hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center space-x-2">
                    {Icon && <Icon className="h-4 w-4 text-gray-500" />}
                    <span className="font-medium text-gray-900">{title}</span>
                </div>
                <ChevronDownIcon
                    className={`h-4 w-4 text-gray-500 transition-transform 
                              ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>
            {isExpanded && (
                <div className="px-4 pb-4">
                    {children}
                </div>
            )}
        </div>
    );

    const availabilityOptions = [
        { value: 'weekdays', label: 'Weekdays' },
        { value: 'weekends', label: 'Weekends' },
        { value: 'mornings', label: 'Mornings' },
        { value: 'afternoons', label: 'Afternoons' },
        { value: 'evenings', label: 'Evenings' }
    ];

    const sortOptions = [
        { value: 'relevance', label: 'Most Relevant' },
        { value: 'rating', label: 'Highest Rated' },
        { value: 'distance', label: 'Nearest' },
        { value: 'newest', label: 'Newest Members' },
        { value: 'sessions', label: 'Most Sessions' }
    ];

    if (!isOpen) {
        return (
            <button
                onClick={onToggle}
                className={`inline-flex items-center space-x-2 px-4 py-2 
                          border border-gray-300 rounded-lg hover:bg-gray-50 
                          transition-colors ${className}`}
            >
                <FunnelIcon className="h-4 w-4" />
                <span>Filters</span>
                {getActiveFilterCount() > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full 
                                   px-2 py-1 min-w-[20px] text-center">
                        {getActiveFilterCount()}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                    <FunnelIcon className="h-5 w-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                    {getActiveFilterCount() > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full 
                                       px-2 py-1 min-w-[20px] text-center">
                            {getActiveFilterCount()}
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    {getActiveFilterCount() > 0 && (
                        <button
                            onClick={clearAllFilters}
                            className="text-sm text-blue-600 hover:text-blue-800 
                                     transition-colors"
                        >
                            Clear all
                        </button>
                    )}
                    <button
                        onClick={onToggle}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Filter Sections */}
            <div className="max-h-96 overflow-y-auto">
                {/* Location */}
                <FilterSection
                    title="Location"
                    icon={MapPinIcon}
                    isExpanded={expandedSections.location}
                    onToggle={() => toggleSection('location')}
                >
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="Enter city or zip code"
                            value={localFilters.location || ''}
                            onChange={(e) => handleFilterChange('location', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md 
                                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Distance (miles)
                            </label>
                            <select
                                value={localFilters.maxDistance || ''}
                                onChange={(e) => handleFilterChange('maxDistance', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Any distance</option>
                                <option value="5">Within 5 miles</option>
                                <option value="10">Within 10 miles</option>
                                <option value="25">Within 25 miles</option>
                                <option value="50">Within 50 miles</option>
                            </select>
                        </div>
                    </div>
                </FilterSection>

                {/* Rating */}
                <FilterSection
                    title="Minimum Rating"
                    icon={StarIcon}
                    isExpanded={expandedSections.rating}
                    onToggle={() => toggleSection('rating')}
                >
                    <div className="space-y-2">
                        {[4, 3, 2, 1].map(rating => (
                            <label key={rating} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="minRating"
                                    value={rating}
                                    checked={localFilters.minRating === rating}
                                    onChange={(e) => handleFilterChange('minRating', parseInt(e.target.value))}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex items-center space-x-1">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon
                                            key={i}
                                            className={`h-4 w-4 ${i < rating
                                                    ? 'text-yellow-400 fill-current'
                                                    : 'text-gray-300'
                                                }`}
                                        />
                                    ))}
                                    <span className="text-sm text-gray-600">& up</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </FilterSection>

                {/* Availability */}
                <FilterSection
                    title="Availability"
                    icon={ClockIcon}
                    isExpanded={expandedSections.availability}
                    onToggle={() => toggleSection('availability')}
                >
                    <div className="space-y-2">
                        {availabilityOptions.map(option => (
                            <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={localFilters.availability?.includes(option.value) || false}
                                    onChange={(e) => handleArrayFilterChange('availability', option.value, e.target.checked)}
                                    className="text-blue-600 focus:ring-blue-500 rounded"
                                />
                                <span className="text-sm text-gray-700">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </FilterSection>

                {/* Skill Level */}
                <FilterSection
                    title="Skill Level"
                    icon={AcademicCapIcon}
                    isExpanded={expandedSections.skillLevel}
                    onToggle={() => toggleSection('skillLevel')}
                >
                    <div className="space-y-2">
                        {Object.entries(SKILL_LEVEL_LABELS).map(([value, label]) => (
                            <label key={value} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={localFilters.skillLevel?.includes(value) || false}
                                    onChange={(e) => handleArrayFilterChange('skillLevel', value, e.target.checked)}
                                    className="text-blue-600 focus:ring-blue-500 rounded"
                                />
                                <span className="text-sm text-gray-700">{label}</span>
                            </label>
                        ))}
                    </div>
                </FilterSection>

                {/* Categories */}
                {categories.length > 0 && (
                    <FilterSection
                        title="Categories"
                        icon={FunnelIcon}
                        isExpanded={expandedSections.category}
                        onToggle={() => toggleSection('category')}
                    >
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {categories.map(category => (
                                <label key={category.name} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localFilters.categories?.includes(category.name) || false}
                                        onChange={(e) => handleArrayFilterChange('categories', category.name, e.target.checked)}
                                        className="text-blue-600 focus:ring-blue-500 rounded"
                                    />
                                    <span className="text-sm text-gray-700">
                                        {category.name}
                                        {category.count && (
                                            <span className="text-gray-400 ml-1">({category.count})</span>
                                        )}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </FilterSection>
                )}
            </div>

            {/* Sort Options */}
            <div className="p-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort by
                </label>
                <select
                    value={localFilters.sortBy || 'relevance'}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md 
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default FilterPanel;