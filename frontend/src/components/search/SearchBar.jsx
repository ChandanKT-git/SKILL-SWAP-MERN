import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { searchAPI } from '../../utils/api';
import { useDebounce } from '../../hooks/useDebounce';

const SearchBar = ({ onSearch, placeholder = "Search for skills or users...", className = "" }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const searchRef = useRef(null);
    const suggestionsRef = useRef(null);
    const debouncedQuery = useDebounce(query, 300);

    // Fetch suggestions when debounced query changes
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (debouncedQuery.trim().length < 2) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            setIsLoading(true);
            try {
                const response = await searchAPI.getSearchSuggestions({
                    query: debouncedQuery,
                    limit: 8
                });
                setSuggestions(response.data.suggestions || []);
                setShowSuggestions(true);
                setSelectedIndex(-1);
            } catch (error) {
                console.error('Failed to fetch suggestions:', error);
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSuggestions();
    }, [debouncedQuery]);

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setQuery(value);

        if (value.trim().length === 0) {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) {
            if (e.key === 'Enter') {
                handleSearch(query);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    handleSuggestionClick(suggestions[selectedIndex]);
                } else {
                    handleSearch(query);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setSelectedIndex(-1);
                searchRef.current?.blur();
                break;
            default:
                break;
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion.text);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        handleSearch(suggestion.text, suggestion.type);
    };

    const handleSearch = (searchQuery = query, type = 'general') => {
        if (searchQuery.trim()) {
            onSearch({
                query: searchQuery.trim(),
                type
            });
        }
    };

    const clearSearch = () => {
        setQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        onSearch({ query: '', type: 'general' });
    };

    const getSuggestionIcon = (type) => {
        switch (type) {
            case 'skill':
                return '🎯';
            case 'user':
                return '👤';
            case 'category':
                return '📁';
            default:
                return '🔍';
        }
    };

    return (
        <div ref={searchRef} className={`relative ${className}`}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0) {
                            setShowSuggestions(true);
                        }
                    }}
                    placeholder={placeholder}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg 
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                             placeholder-gray-500 text-gray-900 bg-white
                             transition-colors duration-200"
                />

                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center 
                                 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Clear search"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Suggestions dropdown */}
            {(showSuggestions || isLoading) && (
                <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 
                             rounded-lg shadow-lg max-h-64 overflow-y-auto"
                >
                    {isLoading ? (
                        <div className="px-4 py-3 text-center text-gray-500">
                            <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                            Searching...
                        </div>
                    ) : suggestions.length > 0 ? (
                        <ul className="py-1">
                            {suggestions.map((suggestion, index) => (
                                <li key={`${suggestion.type}-${suggestion.text}-${index}`}>
                                    <button
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 
                                                  flex items-center space-x-3 transition-colors
                                                  ${index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}`}
                                    >
                                        <span className="text-lg">
                                            {getSuggestionIcon(suggestion.type)}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                                {suggestion.text}
                                            </div>
                                            {suggestion.description && (
                                                <div className="text-sm text-gray-500 truncate">
                                                    {suggestion.description}
                                                </div>
                                            )}
                                        </div>
                                        {suggestion.count && (
                                            <span className="text-xs text-gray-400 bg-gray-100 
                                                           px-2 py-1 rounded-full">
                                                {suggestion.count}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : query.trim().length >= 2 ? (
                        <div className="px-4 py-3 text-center text-gray-500">
                            No suggestions found
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default SearchBar;