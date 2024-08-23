import React, { useRef, useEffect } from 'react';
import Application from "./Application";
import MenuBar from './MenuBar';
import { ZIndexProvider } from './ZIndexContext'; 
import { GlobalCanvas, SmoothScrollbar } from '@14islands/r3f-scroll-rig'
import '@14islands/r3f-scroll-rig/css'
import CRTScreenEffect from './CRTScreenEffect';


function Screen() {



    return(
        <div className='distortion'>
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