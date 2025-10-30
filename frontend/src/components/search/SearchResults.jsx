import React from 'react';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    AdjustmentsHorizontalIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import UserCard from './UserCard';
import { PAGINATION } from '../../utils/constants';

const SearchResults = ({
    results = [],
    isLoading = false,
    error = null,
    pagination = {},
    onPageChange,
    onBookSession,
    searchQuery = '',
    totalResults = 0,
    className = ""
}) => {
    const {
        currentPage = 1,
        totalPages = 1,
        pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
        hasNextPage = false,
        hasPrevPage = false
    } = pagination;

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            onPageChange(page);
            // Scroll to top of results
            document.getElementById('search-results-top')?.scrollIntoView({
                behavior: 'smooth'
            });
        }
    };

    const renderPaginationButton = (page, isCurrent = false) => (
        <button
            key={page}
            onClick={() => handlePageChange(page)}
            disabled={isCurrent}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors
                      ${isCurrent
                    ? 'bg-blue-600 text-white cursor-default'
                    : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
        >
            {page}
        </button>
    );

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const pages = [];
        const maxVisiblePages = 7;

        if (totalPages <= maxVisiblePages) {
            // Show all pages
            for (let i = 1; i <= totalPages; i++) {
                pages.push(renderPaginationButton(i, i === currentPage));
            }
        } else {
            // Show first page
            pages.push(renderPaginationButton(1, currentPage === 1));

            if (currentPage > 3) {
                pages.push(
                    <span key="ellipsis1" className="px-3 py-2 text-gray-500">
                        ...
                    </span>
                );
            }

            // Show pages around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(renderPaginationButton(i, i === currentPage));
            }

            if (currentPage < totalPages - 2) {
                pages.push(
                    <span key="ellipsis2" className="px-3 py-2 text-gray-500">
                        ...
                    </span>
                );
            }

            // Show last page
            if (totalPages > 1) {
                pages.push(renderPaginationButton(totalPages, currentPage === totalPages));
            }
        }

        return (
            <div className="flex items-center justify-between border-t border-gray-200 
                          bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                    {/* Mobile pagination */}
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!hasPrevPage}
                        className="relative inline-flex items-center rounded-md border 
                                 border-gray-300 bg-white px-4 py-2 text-sm font-medium 
                                 text-gray-700 hover:bg-gray-50 disabled:opacity-50 
                                 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!hasNextPage}
                        className="relative ml-3 inline-flex items-center rounded-md 
                                 border border-gray-300 bg-white px-4 py-2 text-sm 
                                 font-medium text-gray-700 hover:bg-gray-50 
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>

                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700">
                            Showing{' '}
                            <span className="font-medium">
                                {((currentPage - 1) * pageSize) + 1}
                            </span>{' '}
                            to{' '}
                            <span className="font-medium">
                                {Math.min(currentPage * pageSize, totalResults)}
                            </span>{' '}
                            of{' '}
                            <span className="font-medium">{totalResults}</span>{' '}
                            results
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={!hasPrevPage}
                            className="relative inline-flex items-center rounded-md 
                                     border border-gray-300 bg-white px-2 py-2 text-sm 
                                     font-medium text-gray-500 hover:bg-gray-50 
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeftIcon className="h-5 w-5" />
                        </button>

                        <div className="flex space-x-1">
                            {pages}
                        </div>

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={!hasNextPage}
                            className="relative inline-flex items-center rounded-md 
                                     border border-gray-300 bg-white px-2 py-2 text-sm 
                                     font-medium text-gray-500 hover:bg-gray-50 
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRightIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (error) {
        return (
            <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
                <div className="text-red-500 mb-4">
                    <AdjustmentsHorizontalIcon className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Search Error
                </h3>
                <p className="text-gray-600 mb-4">
                    {error.message || 'Something went wrong while searching. Please try again.'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 
                             transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
            {/* Results Header */}
            <div id="search-results-top" className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Search Results
                        </h2>
                        {searchQuery && (
                            <p className="text-sm text-gray-600 mt-1">
                                Results for "{searchQuery}"
                            </p>
                        )}
                    </div>

                    {totalResults > 0 && (
                        <div className="text-sm text-gray-600">
                            {totalResults.toLocaleString()} {totalResults === 1 ? 'result' : 'results'}
                        </div>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="p-8 text-center">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-current 
                                  border-t-transparent text-blue-600 rounded-full mb-4"></div>
                    <p className="text-gray-600">Searching for users...</p>
                </div>
            )}

            {/* No Results */}
            {!isLoading && results.length === 0 && (
                <div className="p-8 text-center">
                    <div className="text-gray-400 mb-4">
                        <MagnifyingGlassIcon className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No results found
                    </h3>
                    <p className="text-gray-600 mb-4">
                        {searchQuery
                            ? `We couldn't find any users matching "${searchQuery}". Try adjusting your search or filters.`
                            : 'Try searching for a skill or adjusting your filters to find users.'
                        }
                    </p>
                    <div className="text-sm text-gray-500">
                        <p>Suggestions:</p>
                        <ul className="mt-2 space-y-1">
                            <li>• Check your spelling</li>
                            <li>• Try more general terms</li>
                            <li>• Remove some filters</li>
                            <li>• Browse popular skills</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Results Grid */}
            {!isLoading && results.length > 0 && (
                <>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {results.map((user) => (
                                <UserCard
                                    key={user._id}
                                    user={user}
                                    onBookSession={onBookSession}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Pagination */}
                    {renderPagination()}
                </>
            )}
        </div>
    );
};

export default SearchResults;