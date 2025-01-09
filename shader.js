export const createWarpFilter = () => {
    const fragSrc = `
        precision highp float;

        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;

        // Usually provided by Pixi's filter system
        uniform vec2 dimensions;
        uniform vec4 inputSize;
        uniform vec4 outputFrame;

        // Increase warpAmount to intensify distortion
        // You can play with these values
        vec2 warpAmount = vec2(1.0 / 8.0, 1.0 / 8.0);

        // Higher power (e.g. pos^4) for even more extreme warping near the edges
        vec2 warp(vec2 pos) {
            // Transform from [0..1] to [-1..1]
            pos = pos * 2.0 - 1.0;

            // Apply a stronger pincushion effect: x^4 or y^4
            // This ensures the warp is minimal near center and bigger near edges
            float x2 = pos.x * pos.x;  // pos.x^2
            float y2 = pos.y * pos.y;  // pos.y^2
            float x4 = x2 * x2;        // pos.x^4
            float y4 = y2 * y2;        // pos.y^4
            x4 = x4 * x4;
            y4 = y4 * y4;

            // Multiply pos by (1.0 + something), to warp outward or inward
            pos *= vec2(
                1.0 + y4 * warpAmount.x,
                1.0 + x4 * warpAmount.y
            );

            // Transform back to [0..1]
            return pos * 0.5 + 0.5;
        }

        void main() {
            // Get coordinate in normalized space
            vec2 coord = vTextureCoord;

            // Convert from normalized coords to absolute tex coords
            coord = coord * inputSize.xy / outputFrame.zw;

            // Warp them
            coord = warp(coord);

            // Convert back to proper texture coordinates
            coord = coord * inputSize.zw * outputFrame.zw;

            // Sample the texture at the new (warped) coords
            gl_FragColor = texture2D(uSampler, coord);
        }
    `
    .split('\n')
    .reduce((c, a) => c + a.trim() + '\n');

    return fragSrc;
};

export function createGradientFilter() {
    // Language: GLSL
    const fragmentShader = `
        precision mediump float;

        // Time uniform we’ll animate
        uniform float uTime;

        // Four colors (RGBA)
        uniform vec4 uColor1;
        uniform vec4 uColor2;
        uniform vec4 uColor3;
        uniform vec4 uColor4;

        // Standard Pixi varyings
        varying vec2 vTextureCoord;

        void main(void) {
            // We'll use vTextureCoord (between 0.0 and 1.0 in both x and y)
            // to create a 2D gradient, then modulate by uTime to animate.

            // For a simple effect, let's create two intermediate blends:
            //   colorA between uColor1 and uColor2
            //   colorB between uColor3 and uColor4
            // and then cross-fade between colorA and colorB.

            float blendX = vTextureCoord.x + 0.5 * sin(uTime * 0.5);
            float blendY = vTextureCoord.y + 0.5 * cos(uTime * 0.5);

            // clamp blend to [0.0, 1.0]
            blendX = clamp(blendX, 0.0, 1.0);
            blendY = clamp(blendY, 0.0, 1.0);

            vec4 colorA = mix(uColor1, uColor2, blendX);
            vec4 colorB = mix(uColor3, uColor4, blendY);

            // final color
            vec4 finalColor = mix(colorA, colorB, 0.5 + 0.5 * sin(uTime));
            
            gl_FragColor = finalColor;
        }
    `;

    return fragmentShader;
}

