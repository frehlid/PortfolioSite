import React, { createContext, useState, useContext } from 'react';

// Create a Context for the highlighted application
const HighlightContext = createContext();

export const HighlightProvider = ({ children }) => {
    const [highlightedApp, setHighlightedApp] = useState(null);

    return (
        <HighlightContext.Provider value={{ highlightedApp, setHighlightedApp }}>
            {children}
        </HighlightContext.Provider>
    );
};

export const useHighlight = () => useContext(HighlightContext);
