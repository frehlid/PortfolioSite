export const createWarpFilter = () => {
    const fragSrc = `
        precision highp float;
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform vec2 dimensions;
        uniform vec4 inputSize;
        uniform vec4 outputFrame;

        vec2 warpAmount = vec2(1.0 / 64.0, 1.0 / 16.0);

        vec2 warp(vec2 pos) {
            // Warp by the center of filterArea
            pos = pos * 2.0 - 1.0;
            pos *= vec2(
                1.0 + (pos.y * pos.y) * warpAmount.x,
                1.0 + (pos.x * pos.x) * warpAmount.y
            );
            return pos * 0.5 + 0.5;
        }

        void main() {
            vec2 coord = vTextureCoord;
            coord = coord * inputSize.xy / outputFrame.zw;
            coord = warp(coord);
            coord = coord * inputSize.zw * outputFrame.zw;
            gl_FragColor = texture2D(uSampler, coord);
        }
    `.split('\n').reduce((c, a) => c + a.trim() + '\n');

    const filter = new PIXI.Filter(null, fragSrc);
    filter.apply = (filterManager, input, output, clear) => {
        filterManager.applyFilter(filter, input, output, clear);
    };
    filter.padding = 10;
    return filter;
};

