import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SearchBar from '../components/search/SearchBar';
import FilterPanel from '../components/search/FilterPanel';
import SearchResults from '../components/search/SearchResults';
import { useSearchUsers, useTrendingSkills } from '../hooks/useApi';
import { PAGINATION } from '../utils/constants';
import toast from 'react-hot-toast';

const Search = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // State for search and filters
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [filters, setFilters] = useState({
        location: searchParams.get('location') || '',
        minRating: parseInt(searchParams.get('minRating')) || 0,
        maxDistance: searchParams.get('maxDistance') || '',
        availability: searchParams.get('availability')?.split(',').filter(Boolean) || [],
        skillLevel: searchParams.get('skillLevel')?.split(',').filter(Boolean) || [],
        categories: searchParams.get('categories')?.split(',').filter(Boolean) || [],
        sortBy: searchParams.get('sortBy') || 'relevance'
    });
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

    // Build search parameters
    const searchParameters = {
        skill: searchQuery,
        page: currentPage,
        limit: PAGINATION.DEFAULT_PAGE_SIZE,
        ...filters,
        // Convert arrays to comma-separated strings for API
        availability: filters.availability.join(','),
        skillLevel: filters.skillLevel.join(','),
        categories: filters.categories.join(',')
    };

    // API calls
    const {
        data: searchData,
        isLoading,
        error,
        refetch
    } = useSearchUsers(searchParameters);

    const { data: trendingSkills = [] } = useTrendingSkills();

    // Update URL when search parameters change
    useEffect(() => {
        const params = new URLSearchParams();

        if (searchQuery) params.set('q', searchQuery);
        if (filters.location) params.set('location', filters.location);
        if (filters.minRating > 0) params.set('minRating', filters.minRating.toString());
        if (filters.maxDistance) params.set('maxDistance', filters.maxDistance);
        if (filters.availability.length > 0) params.set('availability', filters.availability.join(','));
        if (filters.skillLevel.length > 0) params.set('skillLevel', filters.skillLevel.join(','));
        if (filters.categories.length > 0) params.set('categories', filters.categories.join(','));
        if (filters.sortBy !== 'relevance') params.set('sortBy', filters.sortBy);
        if (currentPage > 1) params.set('page', currentPage.toString());

        setSearchParams(params);
    }, [searchQuery, filters, currentPage, setSearchParams]);

    const handleSearch = ({ query, type }) => {
        setSearchQuery(query);
        setCurrentPage(1);

        // If it's a specific type search, we might want to add it to filters
        if (type === 'category' && query) {
            setFilters(prev => ({
                ...prev,
                categories: [query]
            }));
        }
    };

    const handleFiltersChange = (newFilters) => {
        setFilters(newFilters);
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleBookSession = (user) => {
        // Navigate to session booking page with user pre-selected
        navigate(`/sessions/book?userId=${user._id}`);
    };

    const handleTrendingSkillClick = (skill) => {
        setSearchQuery(skill);
        setCurrentPage(1);
    };

    const results = searchData?.users || [];
    const pagination = {
        currentPage,
        totalPages: searchData?.totalPages || 1,
        pageSize: searchData?.pageSize || PAGINATION.DEFAULT_PAGE_SIZE,
        hasNextPage: searchData?.hasNextPage || false,
        hasPrevPage: searchData?.hasPrevPage || false
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Find Your Next Learning Partner
                    </h1>
                    <p className="text-gray-600">
                        Discover skilled individuals in your area and start learning together
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <SearchBar
                        onSearch={handleSearch}
                        className="max-w-2xl"
                    />
                </div>

                {/* Trending Skills */}
                {!searchQuery && trendingSkills.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Trending Skills
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {trendingSkills.slice(0, 10).map((skill, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleTrendingSkillClick(skill.name)}
                                    className="inline-flex items-center px-3 py-1.5 rounded-full 
                                             text-sm font-medium bg-blue-100 text-blue-800 
                                             hover:bg-blue-200 transition-colors"
                                >
                                    {skill.name}
                                    {skill.count && (
                                        <span className="ml-1 text-blue-600">
                                            ({skill.count})
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Filters Sidebar */}
                    <div className="lg:w-80 flex-shrink-0">
                        <div className="sticky top-6">
                            <FilterPanel
                                filters={filters}
                                onFiltersChange={handleFiltersChange}
                                isOpen={isFilterPanelOpen}
                                onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                                className="lg:!block"
                            />
                        </div>
                    </div>

                    {/* Search Results */}
                    <div className="flex-1">
                        <SearchResults
                            results={results}
                            isLoading={isLoading}
                            error={error}
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            onBookSession={handleBookSession}
                            searchQuery={searchQuery}
                            totalResults={searchData?.totalResults || 0}
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                {!searchQuery && !isLoading && (
                    <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Quick Actions
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => handleSearch({ query: 'programming', type: 'skill' })}
                                className="p-4 text-left border border-gray-200 rounded-lg 
                                         hover:bg-gray-50 transition-colors"
                            >
                                <div className="text-2xl mb-2">💻</div>
                                <h3 className="font-medium text-gray-900">Programming</h3>
                                <p className="text-sm text-gray-600">
                                    Find developers and coding mentors
                                </p>
                            </button>

                            <button
                                onClick={() => handleSearch({ query: 'design', type: 'skill' })}
                                className="p-4 text-left border border-gray-200 rounded-lg 
                                         hover:bg-gray-50 transition-colors"
                            >
                                <div className="text-2xl mb-2">🎨</div>
                                <h3 className="font-medium text-gray-900">Design</h3>
                                <p className="text-sm text-gray-600">
                                    Connect with designers and artists
                                </p>
                            </button>

                            <button
                                onClick={() => handleSearch({ query: 'language', type: 'skill' })}
                                className="p-4 text-left border border-gray-200 rounded-lg 
                                         hover:bg-gray-50 transition-colors"
                            >
                                <div className="text-2xl mb-2">🗣️</div>
                                <h3 className="font-medium text-gray-900">Languages</h3>
                                <p className="text-sm text-gray-600">
                                    Practice with native speakers
                                </p>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Search;