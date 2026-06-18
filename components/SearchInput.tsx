
import React from 'react';

interface SearchInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder }) => {
    return (
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="p-2.5 rounded-lg border border-gray-600 bg-gray-800 text-white w-72 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
        />
    );
};

export default SearchInput;