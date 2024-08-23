import React from 'react';
import Application from "./Application";
import MenuBar from './MenuBar';
import { ZIndexProvider } from './ZIndexContext'; 
import CRTScreenEffect from './CRTScreenEffect';

function Screen() {

    return(
        <div>
            <CRTScreenEffect />
            <ZIndexProvider>
                <MenuBar />
            <Application title="app1" content="this is test content"/>
            <Application title="app2" content="this is also test content"/>
            </ZIndexProvider>
        </div>
    );
}

export default Screen;