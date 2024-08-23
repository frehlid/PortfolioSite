import React, { createContext, useContext, useState } from 'react';

const ZIndexContext = createContext();

export const ZIndexProvider = ({ children }) => {
    const [globalZIndex, setGlobalZIndex] = useState(1);

    const getNextZIndex = () => {
        setGlobalZIndex((prevZIndex) => prevZIndex + 1);
        return globalZIndex + 1;
    };

    return (
        <ZIndexContext.Provider value={{ getNextZIndex }}>
            {children}
        </ZIndexContext.Provider>
    );
};

export const useZIndex = () => {
    return useContext(ZIndexContext);
};
