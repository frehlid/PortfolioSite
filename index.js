// CLASS TO CREATE SCENE
// -----------------------------------------------------
class PixiScene {
    constructor() {
        this.renderer = PIXI.autoDetectRenderer({
            width: window.innerWidth,
            height: window.innerHeight,
            transparent: true
        });
        this.app = new PIXI.Container();
        document.body.appendChild(this.renderer.view);
      
        // SHADER START
        // -----------------
        
      const fragSrc = `precision highp float;
  varying vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform vec2 dimensions;
  uniform vec4 inputSize;
  uniform vec4 outputFrame;

  vec2 warpAmount = vec2( 1.0 / 64.0, 1.0 / 16.0 );

  vec2 warp(vec2 pos)
  {
    // warping by the center of filterArea
    pos = pos * 2.0 - 1.0;
    pos *= vec2(
      1.0 + (pos.y * pos.y) * warpAmount.x,
      1.0 + (pos.x * pos.x) * warpAmount.y
    );
    return pos * 0.5 + 0.5;;
  }
   
  void main() {
    vec2 coord = vTextureCoord;
    coord = coord * inputSize.xy / outputFrame.zw;
    coord = warp( coord );
    coord = coord * inputSize.zw * outputFrame.zw;
    gl_FragColor = texture2D( uSampler, coord );
  }
`.split('\n').reduce( (c, a) => c + a.trim() + '\n' );

        const filter = new PIXI.Filter(null, fragSrc);
        filter.apply = (filterManager, input, output, clear) => {
        filterManager.applyFilter(filter, input, output, clear)
        };
        this.app.filters = [ filter ];
        filter.padding = 10;
        // SHADER END
        // -----------------
      
        this.$titles = document.querySelectorAll('.webGl__text');
        this.titles = Array.from(this.$titles).map($el => new TitlePixi($el, this.app));
        this.update();
    }

    update() {
        requestAnimationFrame(this.update.bind(this));
        this.titles.forEach((title) => {
            title.update()
        });
        this.renderer.render(this.app);
    }
}


// CLASS TO CREATE TITLE
// -----------------------------------------------------
class TitlePixi {
    constructor($el, stage) {
        this.stage = stage;
        this.title = $el;
        this.text = new PIXI.Text(this.title.innerHTML, {
            fontFamily: "Arial",
            fontSize: ((window.innerWidth * 15) / 100) + 'px',
            fill: "transparent",
            stroke: "white",
            strokeThickness: 1
        });
        this.text.resolution = 2;

        this.getPosition();
        this.stage.addChild(this.text);

        this.addListeners();
    }

    getPosition() {
        const {width, height, top, left} = this.title.getBoundingClientRect();
        this.text.position.set(left, top);
    };

    addListeners() {
        this.title.addEventListener("mouseenter", () => {
            this.text.style.fill = "white";
        });
        this.title.addEventListener("mouseleave", () => {
            this.text.style.fill = "transparent";
        })
    };

    update() {
        if (!this.text) return;
        this.getPosition();
    }
}

document.addEventListener('DOMContentLoaded', () => {
		new PixiScene();
});
