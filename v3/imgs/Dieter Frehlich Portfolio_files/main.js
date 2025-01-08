import { createWarpFilter, createGradientFilter } from "/shader.js";
import { CRTFilter } from "/node_modules/.vite/deps/@pixi_filter-crt.js?v=bd2a54d1";
import { AdvancedBloomFilter } from "/node_modules/.vite/deps/@pixi_filter-advanced-bloom.js?v=bd2a54d1";

class PixiScene {
    constructor() {
        this.renderer = null;
        this.app = null;
        this.bezelContainer = null;
        this.bezelGraphic = null;
        this.titleSpacing = 50;
        this.gradientUniforms = {
            uColor1: [132 / 255, 94 / 255, 194 / 255, 0.25],
            uColor2: [255 / 255, 111 / 255, 145 / 255, 0.25],
            uColor3: [255 / 255, 199 / 255, 95 / 255, 0.25],
            uColor4: [0 / 255, 129 / 255, 207 / 255, 0.25],
            uTime: 0.0,
        };
        this.gradientTime = 0;
        this.lastScrollTop = 0;
        this.scrollSpeed = 0;
        this.borderThickness = 10;
        this.borderColor = 0x0;
        this.borderAlpha = 1.0;
        this.cornerRadius = 50;
        this.borderGraphics = null;
        this.bgMask = null;
        this.richTexts = [];
    }

    async init() {
        this.initializeRenderer();
        this.initializeCustomCursor();
        this.initializeContainers();
        this.initializeFilters();
        this.createGradientBackground();
        this.createBordersAndMask();
        this.initializeDisplacementFilter();
        this.initializeBloomFilter();

        this.addFilters();

        this.parseContent();
        this.addEventListeners();
        this.update();
    }

    addFilters() {
        this.app.filters = [
            this.filter,
            this.crtFilter,
          //  this.bloomFilter,
        ];
        this.textContainer.filters = [this.bloomFilter];
        this.textContainer.filterArea = this.renderer.screen;
        this.contentContainer.filters = [this.displacementFilter];
        this.imageContainer.filters = [this.mildBloomFilter];
    }

    initializeRenderer() {
        this.renderer = PIXI.autoDetectRenderer({
            width: window.innerWidth,
            height: window.innerHeight,
            antialias: true,
            transparent: false,
        });
        this.app = new PIXI.Container({ antialias: true });
        document.body.appendChild(this.renderer.view);
        const interactionManager = new PIXI.interaction.InteractionManager(this.renderer);
        this.app.interaction = interactionManager;

    }

    initializeCustomCursor() {
        document.body.style.cursor = "none";
        this.customCursor = new PIXI.Graphics();
        this.customCursor.beginFill(0xffffff);
        this.customCursor.lineStyle(1, 0x000000, 1);
        this.customCursor.moveTo(0, 0);
        this.customCursor.lineTo(25, 10);
        this.customCursor.lineTo(10, 10);
        this.customCursor.lineTo(5, 20);
        this.customCursor.lineTo(0, 0);
        this.customCursor.endFill();
        this.customCursor.zIndex = 1000;
        this.app.addChild(this.customCursor);

        window.addEventListener("mousemove", (event) => {
            this.customCursor.position.set(event.clientX, event.clientY);
        });
    }

    initializeContainers() {
        this.bgContainer = new PIXI.Container();
        this.bezelContainer = new PIXI.Container();
        this.contentContainer = new PIXI.Container();
        this.textContainer = new PIXI.Container();

        // dummy fill to stop the bloom from getting cut off...
        const topExample = new PIXI.Graphics();
        topExample.beginFill(0x000000);
        topExample.drawRect(0, 0, window.innerWidth, window.innerHeight / 2);
        topExample.endFill();
        topExample.alpha=0;
        this.textContainer.addChild(topExample);

        this.imageContainer = new PIXI.Container();
        this.imageContainer.filterArea = this.renderer.screen;
       // this.imageContainer.addChild(topExample);
       this.contentContainer.addChild(this.imageContainer);

        this.contentContainer.addChild(this.textContainer);
        this.app.addChild(this.bgContainer);
        this.app.addChild(this.contentContainer);

    }

    initializeFilters() {
        const frag = createWarpFilter();
        this.filter = new PIXI.Filter(null, frag);
        this.crtFilter = new CRTFilter({
            curvature: 1,
            lineWidth: 3,
            lineContrast: 0.05,
            verticalLine: false,
            noise: 0.1,
            noiseSize: 1,
            seed: 0,
            time: 0,
            vignetting: 0,
            vignettingBlur: 0,
            vignettingAlpha: 0,
        });
        const gradientShader = createGradientFilter();
        this.gradientFilter = new PIXI.Filter(null, gradientShader, this.gradientUniforms);
        
    }

    createGradientBackground() {
        const gradientSprite = new PIXI.Sprite(PIXI.Texture.BLACK);
        gradientSprite.width = window.innerWidth;
        gradientSprite.height = window.innerHeight;
        gradientSprite.filters = [this.gradientFilter];
        this.bgContainer.addChild(gradientSprite);
    }

    createBordersAndMask() {
        this.borderGraphics = new PIXI.Graphics();
        this.drawBorder();
        this.bezelContainer.addChild(this.borderGraphics);

        this.bgMask = new PIXI.Graphics();
        this.drawMask();
        // this.bgContainer.addChild(this.bgMask);
        // this.txtContainer.addChild(this.bgMask);
        this.app.addChild(this.bgMask);
        // this.bgContainer.mask = this.bgMask;
        // this.txtContainer.mask = this.bgMask;
        this.app.mask = this.bgMask;
    }

    initializeDisplacementFilter() {
        const displacementTexture = PIXI.Texture.from("./displacement_map.png");
        this.cursorDisplacement = new PIXI.Sprite(displacementTexture);
        this.cursorDisplacement.anchor.set(0.5);
        this.cursorDisplacement.width = 250;
        this.cursorDisplacement.height = 250;

        this.displacementFilter = new PIXI.filters.DisplacementFilter(this.cursorDisplacement);
        this.displacementFilter.scale.set(2.5, 2.5);
        this.app.addChild(this.cursorDisplacement);

        window.addEventListener("mousemove", (event) => {
            this.cursorDisplacement.position.set(event.clientX, event.clientY);
        });
    }

    initializeBloomFilter() {
        this.bloomFilter = new AdvancedBloomFilter({
            threshold: 0.98,
            bloomScale: 1,
            brightness: 1.1,
            blur: 5,
            quality: 30,
            autoFit: true,
            padding:5,
        });
        this.mildBloomFilter = new AdvancedBloomFilter({
            threshold: 0.8,
            bloomScale: 0.2,
            brightness: 1,
            blur: 20,
            quality: 30,
            autoFit: true,
            padding:5,
        });
    }

    parseContent() {
        // Select all li elements
        this.$content = document.querySelectorAll("li");
        this.titles = [];
        this.sprites = []; // Keep track of ImagePixi instances
    
        for (let i = 0; i < this.$content.length; i++) {
            const $li = this.$content[i];
            this.parseSubElements($li, i);
        }
    }
    
    parseSubElements($element, index) {
        const $subElements = $element.children;
      
        for (let j = 0; j < $subElements.length; j++) {
          const $subElement = $subElements[j];
          const parentDiv = $subElement.closest('.collapsible-content');
      
          if ($subElement.tagName.toLowerCase() === "h1" || 
              $subElement.tagName.toLowerCase() === "h2") {
            // Unchanged: handle titles with TitlePixi, etc.
            const title = new TitlePixi(
              $subElement,
              this.textContainer,
              this.filter,
              index,
              this.titleSpacing,
              this.richTexts,
              this.sprites
            );
            this.titles.push(title);
      
          } else if ($subElement.tagName.toLowerCase() === "p") {

            const richText = new RichTextPixi($subElement, this.textContainer);
            
            richText.parentDiv = parentDiv;
          
            if (!this.richTexts) this.richTexts = [];
            this.richTexts.push(richText);
          } else if ($subElement.tagName.toLowerCase() === "img") {
            const imgPixi = new ImagePixi($subElement, this.imageContainer, 3500, this.mildBloomFilter);
            imgPixi.parentDiv = parentDiv;
            this.sprites.push(imgPixi);
      
          } else if ($subElement.tagName.toLowerCase() === "div") {
            this.parseSubElements($subElement, index);
          }
        }
      }
      

    addEventListeners() {
        window.addEventListener("resize", this.onResize.bind(this));
        window.addEventListener("scroll", this.handleScroll.bind(this));
    }

    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        this.scrollSpeed = (scrollTop - this.lastScrollTop) * 0.1;
        this.lastScrollTop = scrollTop;
    }

    drawBorder() {
        this.borderGraphics.clear();
        this.borderGraphics.lineStyle(this.borderThickness, this.borderColor, this.borderAlpha);
        this.borderGraphics.drawRoundedRect(
            this.borderThickness / 2,
            this.borderThickness / 2,
            window.innerWidth - this.borderThickness,
            window.innerHeight - this.borderThickness,
            this.cornerRadius
        );
    }

    drawMask() {
        this.bgMask.clear();
        this.bgMask.beginFill(0xffffff, 1);
        this.bgMask.drawRoundedRect(
            this.borderThickness / 2,
            this.borderThickness / 2,
            window.innerWidth - this.borderThickness,
            window.innerHeight - this.borderThickness,
            this.cornerRadius
        );
        this.bgMask.endFill();
    }

    update() {
        requestAnimationFrame(this.update.bind(this));
    
        this.crtFilter.time += 0.1;
        this.gradientTime += 0.002 + this.scrollSpeed;
        this.scrollSpeed *= 0.9;
        this.gradientFilter.uniforms.uTime = this.gradientTime;
    
        // Update titles
        this.titles.forEach((title) => title.update());
    
        // Update sprites
        this.sprites.forEach((sprite) => sprite.updatePosition());

        if (this.richTexts) {
            this.richTexts.forEach((richText) => {
              richText.updatePosition();
            });
        }

        if (this.videos) {
            this.videos.forEach((video) => {
                video.updatePosition();
            });
        }
    
        this.renderer.render(this.app);
    }
    

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.resize(width, height);
    
        const gradientSprite = this.bgContainer.children[0];
        if (gradientSprite) {
            gradientSprite.width = width;
            gradientSprite.height = height;
        }
    
        this.drawBorder();
        this.drawMask();
    
        // Update titles and sprites on resize
        this.titles.forEach((title) => title.resize());
        this.sprites.forEach((sprite) => sprite.resize());

        if (this.richTexts) {
            this.richTexts.forEach((rt) => {rt.onResize()});
        }
        if (this.videos) {
            this.videos.forEach((video) => {
                video.resize();
            });
        }
    }
    
}


class TitlePixi {
    constructor($el, stage, filter, index, spacing, richTexts, sprites) {
        this.stage = stage;
        this.title = $el;
        this.index = index;
        this.spacing = spacing;
        this.richTexts = richTexts;
        this.sprites = sprites;
        this.initializeText(filter);
        this.addListeners();
        this.updateFontSize();
        this.updatePosition();
    }

    initializeText(filter) {
        this.text = new PIXI.Text(this.title.textContent, {
            fontFamily: "Perfectly Nineties",
            fill: "white",
            align: "center",
        });
        this.text.resolution = 3;
        this.text.anchor.set(0.5);
        this.stage.addChild(this.text);
        this.title.pixiText = this.text;

        if (this.title.tagName.toLowerCase() === "h1") {
            this.text.style.letterSpacing = 2;
        } else if (this.title.tagName.toLowerCase() === "p" && !this.title.classList.contains("nohide")) {
            this.text.alpha = 0;
        }
    }

    fadePIXIText(pixiText, targetOpacity, duration = 300) {
        const steps = 10;
        const stepDuration = duration / steps;
        const delta = (targetOpacity - pixiText.alpha) / steps;
    
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            pixiText.alpha += delta;
    
            if (currentStep >= steps) {
                pixiText.alpha = targetOpacity;
                clearInterval(fadeInterval);
            }
        }, stepDuration);
    }
    

    addListeners() {
        const tagName = this.title.tagName.toLowerCase();
        
        if (tagName === "h2") {
            if (tagName === "h2") {
                this.title.addEventListener("mouseenter", () => {
                    this.text.style.fontSize += 5;
                });
                this.title.addEventListener("mouseleave", () => {
                    this.text.style.fontSize -= 5;
                });
            }    
            this.title.addEventListener("click", () => {
                const contentDiv = this.title.nextElementSibling;
                if (!contentDiv) return;
              
                contentDiv.classList.toggle("visible");
              
                // Find all RichTextPixi objects whose parentDiv is contentDiv
                const relevantRichTexts = this.richTexts.filter(
                  (r) => r.parentDiv === contentDiv
                );

                const relaventSprites = this.sprites.filter(
                    (s) => s.parentDiv === contentDiv
                );
                console.log(this.sprites);
              
                if (contentDiv.classList.contains("visible")) {
                  // Fade them in
                  relevantRichTexts.forEach((r) => r.fadeAll(1, 300));
                  relaventSprites.forEach(s => {s.fadeImage(1, 300)});
                } else {
                  // Fade them out
                  relevantRichTexts.forEach((r) => r.fadeAll(0, 300));
                  relaventSprites.forEach(s => {s.fadeImage(0, 300)});
                }
              });
              
              
        }
    }
        

    updateFontSize() {
        const tagName = this.title.tagName.toLowerCase();
        let sizeFactor = 0.05;

        if (tagName === "h1") {
            sizeFactor = 0.1;
        } else if (tagName === "p") {
            sizeFactor = 0.02;
        }

        const newFontSize = window.innerWidth * sizeFactor;
        this.text.style.fontSize = newFontSize;
        this.text.updateText();
    }

    updatePosition() {
        const { top } = this.title.getBoundingClientRect();
        const x = window.innerWidth / 2;
        let y = top;
        

        if (this.title.tagName.toLowerCase() === "p") {
            y -= window.innerWidth / 12; // Adjust this offset as needed
        }
        this.text.position.set(x, y);
    }

    update() {
        this.updatePosition();
    }

    resize() {
        this.updateFontSize();
        this.updatePosition();
    }
}


class RichTextPixi {
    constructor($el, stage) {
      this.$el = $el;         // The DOM <p>
      this.stage = stage;     
      this.allChunks = [];    // Will hold PIXI.Text objects + 'lineBreak' markers
      this.lines = [];        // Array of arrays, each is a line of text
      this.sizeFactor= 0.02;
      this.yOffset =0;


      this.normalStyle = new PIXI.TextStyle({
        fontFamily: "Perfectly Nineties",
        fontSize: window.innerWidth * this.sizeFactor,
        fill: "white",
      });
  
      this.boldStyle = new PIXI.TextStyle({
        fontFamily: "Perfectly Nineties",
        fontWeight: "bold",
        fontSize: window.innerWidth * this.sizeFactor,
        fill: "white",
      });
      // parse HTML node
      this.parseNodes();
  
      // build lines from chunks
      this.buildLines();
  
      // position them
      this.updatePosition();
    }
  
    parseNodes() {
      const childNodes = this.$el.childNodes;
      childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          // If there's any content, create PIXI text
          this.createPixiText(node.textContent, this.normalStyle);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName.toLowerCase() === "strong") {
            this.createPixiText(node.textContent, this.boldStyle);
          } 
          // If there's nested text in other tags, we can parse recursively
          else {
            node.childNodes.forEach((subNode) => {
              if (subNode.nodeType === Node.TEXT_NODE) {
                this.createPixiText(subNode.textContent, this.normalStyle);
              }
            });
          }
        }
      });
    }
  
    createPixiText(textStr, style) {
      if (!textStr.trim()) return;
  
      const segments = textStr.split("\n");
      segments.forEach((seg, i) => {
        if (seg.trim()) {
          const pixiText = new PIXI.Text(seg.trim(), style);
          pixiText.anchor.set(0, 0);
          pixiText.alpha = 0; // Start hidden
          if (this.$el.classList.contains("nohide")) {
            pixiText.alpha = 1;
          }
          pixiText.resolution = 3;
          this.stage.addChild(pixiText);
          this.allChunks.push(pixiText);
        }
        if (i < segments.length - 1) {
          this.allChunks.push({ type: "lineBreak" });
        }
      });
    }
  
    buildLines() {
      this.lines = [];
      let currentLine = [];
      let currentLineWidth = 0;
  
      const maxLineWidth = 800;  // pick a good max width
      this.allChunks.forEach((chunk) => {
        if (chunk.type === "lineBreak") {
          // push current line
          if (currentLine.length > 0) {
            this.lines.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
          }
        } else {
          chunk.updateText();
          const w = chunk.width;
  
          // if we exceed the max width, start new line
          if (currentLineWidth + w > maxLineWidth && currentLine.length > 0) {
            this.lines.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
          }
          currentLine.push(chunk);
          currentLineWidth += w;
        }
      });
  
      // push leftover
      if (currentLine.length > 0) {
        this.lines.push(currentLine);
      }
    }
  
    updatePosition() {
      // get bounding rect for top offset
      const rect = this.$el.getBoundingClientRect();
      const startY = rect.top + window.scrollY;
      this.yOffset = window.innerWidth / 10;
      let currentY = startY - this.yOffset;
      const chunkPadding = 5;
  
      const lineHeight = window.innerWidth / 24; // adjust for bigger or smaller spacing
  
      // center each line
      this.lines.forEach((line) => {
        const lineWidth = line.reduce((sum, c) => sum + c.width, 0);
        let currentX = (window.innerWidth / 2) - (lineWidth / 2);
  
        line.forEach((chunk) => {
      
          chunk.x = currentX; 
        
          chunk.y = currentY;
          currentX += chunk.width + chunkPadding;
        });
  
        currentY += lineHeight;
        
      });

    }

    onResize() {
        const newSize =  window.innerWidth * this.sizeFactor;
      
        // 2) Update your normal and bold TextStyles
        this.normalStyle.fontSize = newSize;
        this.boldStyle.fontSize = newSize;
      
        // 3) Re-apply the styles to each PIXI.Text chunk and update its text metrics
        this.allChunks.forEach((chunk) => {
          // Skip the lineBreak marker
          if (chunk.type === "lineBreak") return;
      
          // If it’s a bold chunk, set style to this.boldStyle
          // If normal, use this.normalStyle
          const isBold = chunk.style && chunk.style.fontWeight === "bold";
          chunk.style = isBold ? this.boldStyle : this.normalStyle;
          chunk.updateText();
        });
      
        this.buildLines();
      
        this.updatePosition();
      }
      
  
    fadeAll(targetAlpha, duration = 300) {
      const steps = 10;
      const stepDuration = duration / steps;
  
      this.allChunks.forEach((item) => {
        // skip lineBreak objects
        if (item.type === "lineBreak") return;
  
        const delta = (targetAlpha - item.alpha) / steps;
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
          currentStep++;
          item.alpha += delta;
          if (currentStep >= steps) {
            item.alpha = targetAlpha;
            clearInterval(fadeInterval);
          }
        }, stepDuration);
      });
    }
  
    resize() {
      // if you want to re-compute line wrapping on resize, do:
      // this.buildLines();
      this.updatePosition();
    }
  
    updatePositionOnScroll() {
      this.updatePosition();
    }
  }
  
class ImagePixi {
    constructor($el, stage, scale, bloomFilter) {
        this.$el = $el; // Reference to the DOM element
        this.stage = stage;
        this.scale = scale;

        this.initSprite();
        this.updatePosition();
        this.addListeners();
       // $el.style.opacity = 0;
       // $el.style.visibility = "hidden";
        
    }

    initSprite() {
        const imgSrc = this.$el.getAttribute("src");
        if (imgSrc) {
            const texture = PIXI.Texture.from(imgSrc);
            this.sprite = new PIXI.Sprite(texture);

            // Set anchor, scale, and add to stage
            this.sprite.anchor.set(0.5);
            
            // set scale based on window width
            const scale = window.innerWidth / this.scale;
            this.sprite.scale.set(scale);

            this.stage.addChild(this.sprite);

            if (this.$el.classList.contains("inline")) {
                this.sprite.alpha = 0;
            }

            const mask = new PIXI.Graphics();
            mask.beginFill(0xff00, 0.5);
            mask.drawRoundedRect(0, 0, this.sprite.width, this.sprite.height, 20); 
            mask.endFill();
            mask.x = this.sprite.x;
            mask.y = this.sprite.y;
        }
    }

    addListeners() {
        // Enable interaction on the sprite
        this.sprite.interactive = true;
        this.sprite.buttonMode = true;
    
        // Handle hover
        this.$el.addEventListener("mouseenter", () => {
            // Increase the Pixi sprite’s scale by 20%
            this.scale /= 1.2;
        });
    
        this.$el.addEventListener("mouseleave", () => {
            // Reset scale back to the original (as computed in updatePosition or constructor)
            this.scale *= 1.2;
        });

        this.$el.addEventListener("click", () => {
            const href = this.$el.getAttribute("href");
            if (href) {
                window.open(href, "_blank");
            }
        });

    }
    

    updatePosition() {
        const { top, left, width, height } = this.$el.getBoundingClientRect();
      
        let x = left + width / 2;
        let y = top + height / 2;

        if (this.$el.classList.contains("inline")) {
            y = top - window.innerWidth / 12;
            x = window.innerWidth / 2;
        }

        this.sprite.position.set(x, y);
       const scale = window.innerWidth / this.scale;
       this.sprite.scale.set(scale);
    }
    
    fadeImage(targetAlpha, duration = 300) {
        const steps = 10;
        const stepDuration = duration / steps;
        const delta = (targetAlpha - this.sprite.alpha) / steps;
    
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            this.sprite.alpha += delta;
    
            if (currentStep >= steps) {
                this.sprite.alpha = targetAlpha;
                clearInterval(fadeInterval);
            }
        }, stepDuration);
    }

    resize() {
        this.updatePosition();
    }

}

document.addEventListener("DOMContentLoaded", async () => {
    const scene = new PixiScene();
    await scene.init();
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlV2FycEZpbHRlciwgY3JlYXRlR3JhZGllbnRGaWx0ZXIgfSBmcm9tIFwiL3NoYWRlci5qc1wiO1xuaW1wb3J0IHsgQ1JURmlsdGVyIH0gZnJvbSBcIi9ub2RlX21vZHVsZXMvLnZpdGUvZGVwcy9AcGl4aV9maWx0ZXItY3J0LmpzP3Y9YmQyYTU0ZDFcIjtcbmltcG9ydCB7IEFkdmFuY2VkQmxvb21GaWx0ZXIgfSBmcm9tIFwiL25vZGVfbW9kdWxlcy8udml0ZS9kZXBzL0BwaXhpX2ZpbHRlci1hZHZhbmNlZC1ibG9vbS5qcz92PWJkMmE1NGQxXCI7XG5cbmNsYXNzIFBpeGlTY2VuZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMucmVuZGVyZXIgPSBudWxsO1xuICAgICAgICB0aGlzLmFwcCA9IG51bGw7XG4gICAgICAgIHRoaXMuYmV6ZWxDb250YWluZXIgPSBudWxsO1xuICAgICAgICB0aGlzLmJlemVsR3JhcGhpYyA9IG51bGw7XG4gICAgICAgIHRoaXMudGl0bGVTcGFjaW5nID0gNTA7XG4gICAgICAgIHRoaXMuZ3JhZGllbnRVbmlmb3JtcyA9IHtcbiAgICAgICAgICAgIHVDb2xvcjE6IFsxMzIgLyAyNTUsIDk0IC8gMjU1LCAxOTQgLyAyNTUsIDAuMjVdLFxuICAgICAgICAgICAgdUNvbG9yMjogWzI1NSAvIDI1NSwgMTExIC8gMjU1LCAxNDUgLyAyNTUsIDAuMjVdLFxuICAgICAgICAgICAgdUNvbG9yMzogWzI1NSAvIDI1NSwgMTk5IC8gMjU1LCA5NSAvIDI1NSwgMC4yNV0sXG4gICAgICAgICAgICB1Q29sb3I0OiBbMCAvIDI1NSwgMTI5IC8gMjU1LCAyMDcgLyAyNTUsIDAuMjVdLFxuICAgICAgICAgICAgdVRpbWU6IDAuMCxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5ncmFkaWVudFRpbWUgPSAwO1xuICAgICAgICB0aGlzLmxhc3RTY3JvbGxUb3AgPSAwO1xuICAgICAgICB0aGlzLnNjcm9sbFNwZWVkID0gMDtcbiAgICAgICAgdGhpcy5ib3JkZXJUaGlja25lc3MgPSAxMDtcbiAgICAgICAgdGhpcy5ib3JkZXJDb2xvciA9IDB4MDtcbiAgICAgICAgdGhpcy5ib3JkZXJBbHBoYSA9IDEuMDtcbiAgICAgICAgdGhpcy5jb3JuZXJSYWRpdXMgPSA1MDtcbiAgICAgICAgdGhpcy5ib3JkZXJHcmFwaGljcyA9IG51bGw7XG4gICAgICAgIHRoaXMuYmdNYXNrID0gbnVsbDtcbiAgICAgICAgdGhpcy5yaWNoVGV4dHMgPSBbXTtcbiAgICB9XG5cbiAgICBhc3luYyBpbml0KCkge1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZW5kZXJlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDdXN0b21DdXJzb3IoKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQ29udGFpbmVycygpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVGaWx0ZXJzKCk7XG4gICAgICAgIHRoaXMuY3JlYXRlR3JhZGllbnRCYWNrZ3JvdW5kKCk7XG4gICAgICAgIHRoaXMuY3JlYXRlQm9yZGVyc0FuZE1hc2soKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGlzcGxhY2VtZW50RmlsdGVyKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUJsb29tRmlsdGVyKCk7XG5cbiAgICAgICAgdGhpcy5hZGRGaWx0ZXJzKCk7XG5cbiAgICAgICAgdGhpcy5wYXJzZUNvbnRlbnQoKTtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVycygpO1xuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xuICAgIH1cblxuICAgIGFkZEZpbHRlcnMoKSB7XG4gICAgICAgIHRoaXMuYXBwLmZpbHRlcnMgPSBbXG4gICAgICAgICAgICB0aGlzLmZpbHRlcixcbiAgICAgICAgICAgIHRoaXMuY3J0RmlsdGVyLFxuICAgICAgICAgIC8vICB0aGlzLmJsb29tRmlsdGVyLFxuICAgICAgICBdO1xuICAgICAgICB0aGlzLnRleHRDb250YWluZXIuZmlsdGVycyA9IFt0aGlzLmJsb29tRmlsdGVyXTtcbiAgICAgICAgdGhpcy50ZXh0Q29udGFpbmVyLmZpbHRlckFyZWEgPSB0aGlzLnJlbmRlcmVyLnNjcmVlbjtcbiAgICAgICAgdGhpcy5jb250ZW50Q29udGFpbmVyLmZpbHRlcnMgPSBbdGhpcy5kaXNwbGFjZW1lbnRGaWx0ZXJdO1xuICAgICAgICB0aGlzLmltYWdlQ29udGFpbmVyLmZpbHRlcnMgPSBbdGhpcy5taWxkQmxvb21GaWx0ZXJdO1xuICAgIH1cblxuICAgIGluaXRpYWxpemVSZW5kZXJlcigpIHtcbiAgICAgICAgdGhpcy5yZW5kZXJlciA9IFBJWEkuYXV0b0RldGVjdFJlbmRlcmVyKHtcbiAgICAgICAgICAgIHdpZHRoOiB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgICAgIGhlaWdodDogd2luZG93LmlubmVySGVpZ2h0LFxuICAgICAgICAgICAgYW50aWFsaWFzOiB0cnVlLFxuICAgICAgICAgICAgdHJhbnNwYXJlbnQ6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hcHAgPSBuZXcgUElYSS5Db250YWluZXIoeyBhbnRpYWxpYXM6IHRydWUgfSk7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5yZW5kZXJlci52aWV3KTtcbiAgICAgICAgY29uc3QgaW50ZXJhY3Rpb25NYW5hZ2VyID0gbmV3IFBJWEkuaW50ZXJhY3Rpb24uSW50ZXJhY3Rpb25NYW5hZ2VyKHRoaXMucmVuZGVyZXIpO1xuICAgICAgICB0aGlzLmFwcC5pbnRlcmFjdGlvbiA9IGludGVyYWN0aW9uTWFuYWdlcjtcblxuICAgIH1cblxuICAgIGluaXRpYWxpemVDdXN0b21DdXJzb3IoKSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuY3Vyc29yID0gXCJub25lXCI7XG4gICAgICAgIHRoaXMuY3VzdG9tQ3Vyc29yID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcbiAgICAgICAgdGhpcy5jdXN0b21DdXJzb3IuYmVnaW5GaWxsKDB4ZmZmZmZmKTtcbiAgICAgICAgdGhpcy5jdXN0b21DdXJzb3IubGluZVN0eWxlKDEsIDB4MDAwMDAwLCAxKTtcbiAgICAgICAgdGhpcy5jdXN0b21DdXJzb3IubW92ZVRvKDAsIDApO1xuICAgICAgICB0aGlzLmN1c3RvbUN1cnNvci5saW5lVG8oMjUsIDEwKTtcbiAgICAgICAgdGhpcy5jdXN0b21DdXJzb3IubGluZVRvKDEwLCAxMCk7XG4gICAgICAgIHRoaXMuY3VzdG9tQ3Vyc29yLmxpbmVUbyg1LCAyMCk7XG4gICAgICAgIHRoaXMuY3VzdG9tQ3Vyc29yLmxpbmVUbygwLCAwKTtcbiAgICAgICAgdGhpcy5jdXN0b21DdXJzb3IuZW5kRmlsbCgpO1xuICAgICAgICB0aGlzLmN1c3RvbUN1cnNvci56SW5kZXggPSAxMDAwO1xuICAgICAgICB0aGlzLmFwcC5hZGRDaGlsZCh0aGlzLmN1c3RvbUN1cnNvcik7XG5cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmN1c3RvbUN1cnNvci5wb3NpdGlvbi5zZXQoZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGluaXRpYWxpemVDb250YWluZXJzKCkge1xuICAgICAgICB0aGlzLmJnQ29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMuYmV6ZWxDb250YWluZXIgPSBuZXcgUElYSS5Db250YWluZXIoKTtcbiAgICAgICAgdGhpcy5jb250ZW50Q29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMudGV4dENvbnRhaW5lciA9IG5ldyBQSVhJLkNvbnRhaW5lcigpO1xuXG4gICAgICAgIC8vIGR1bW15IGZpbGwgdG8gc3RvcCB0aGUgYmxvb20gZnJvbSBnZXR0aW5nIGN1dCBvZmYuLi5cbiAgICAgICAgY29uc3QgdG9wRXhhbXBsZSA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG4gICAgICAgIHRvcEV4YW1wbGUuYmVnaW5GaWxsKDB4MDAwMDAwKTtcbiAgICAgICAgdG9wRXhhbXBsZS5kcmF3UmVjdCgwLCAwLCB3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0IC8gMik7XG4gICAgICAgIHRvcEV4YW1wbGUuZW5kRmlsbCgpO1xuICAgICAgICB0b3BFeGFtcGxlLmFscGhhPTA7XG4gICAgICAgIHRoaXMudGV4dENvbnRhaW5lci5hZGRDaGlsZCh0b3BFeGFtcGxlKTtcblxuICAgICAgICB0aGlzLmltYWdlQ29udGFpbmVyID0gbmV3IFBJWEkuQ29udGFpbmVyKCk7XG4gICAgICAgIHRoaXMuaW1hZ2VDb250YWluZXIuZmlsdGVyQXJlYSA9IHRoaXMucmVuZGVyZXIuc2NyZWVuO1xuICAgICAgIC8vIHRoaXMuaW1hZ2VDb250YWluZXIuYWRkQ2hpbGQodG9wRXhhbXBsZSk7XG4gICAgICAgdGhpcy5jb250ZW50Q29udGFpbmVyLmFkZENoaWxkKHRoaXMuaW1hZ2VDb250YWluZXIpO1xuXG4gICAgICAgIHRoaXMuY29udGVudENvbnRhaW5lci5hZGRDaGlsZCh0aGlzLnRleHRDb250YWluZXIpO1xuICAgICAgICB0aGlzLmFwcC5hZGRDaGlsZCh0aGlzLmJnQ29udGFpbmVyKTtcbiAgICAgICAgdGhpcy5hcHAuYWRkQ2hpbGQodGhpcy5jb250ZW50Q29udGFpbmVyKTtcblxuICAgIH1cblxuICAgIGluaXRpYWxpemVGaWx0ZXJzKCkge1xuICAgICAgICBjb25zdCBmcmFnID0gY3JlYXRlV2FycEZpbHRlcigpO1xuICAgICAgICB0aGlzLmZpbHRlciA9IG5ldyBQSVhJLkZpbHRlcihudWxsLCBmcmFnKTtcbiAgICAgICAgdGhpcy5jcnRGaWx0ZXIgPSBuZXcgQ1JURmlsdGVyKHtcbiAgICAgICAgICAgIGN1cnZhdHVyZTogMSxcbiAgICAgICAgICAgIGxpbmVXaWR0aDogMyxcbiAgICAgICAgICAgIGxpbmVDb250cmFzdDogMC4wNSxcbiAgICAgICAgICAgIHZlcnRpY2FsTGluZTogZmFsc2UsXG4gICAgICAgICAgICBub2lzZTogMC4xLFxuICAgICAgICAgICAgbm9pc2VTaXplOiAxLFxuICAgICAgICAgICAgc2VlZDogMCxcbiAgICAgICAgICAgIHRpbWU6IDAsXG4gICAgICAgICAgICB2aWduZXR0aW5nOiAwLFxuICAgICAgICAgICAgdmlnbmV0dGluZ0JsdXI6IDAsXG4gICAgICAgICAgICB2aWduZXR0aW5nQWxwaGE6IDAsXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBncmFkaWVudFNoYWRlciA9IGNyZWF0ZUdyYWRpZW50RmlsdGVyKCk7XG4gICAgICAgIHRoaXMuZ3JhZGllbnRGaWx0ZXIgPSBuZXcgUElYSS5GaWx0ZXIobnVsbCwgZ3JhZGllbnRTaGFkZXIsIHRoaXMuZ3JhZGllbnRVbmlmb3Jtcyk7XG4gICAgICAgIFxuICAgIH1cblxuICAgIGNyZWF0ZUdyYWRpZW50QmFja2dyb3VuZCgpIHtcbiAgICAgICAgY29uc3QgZ3JhZGllbnRTcHJpdGUgPSBuZXcgUElYSS5TcHJpdGUoUElYSS5UZXh0dXJlLkJMQUNLKTtcbiAgICAgICAgZ3JhZGllbnRTcHJpdGUud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcbiAgICAgICAgZ3JhZGllbnRTcHJpdGUuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBncmFkaWVudFNwcml0ZS5maWx0ZXJzID0gW3RoaXMuZ3JhZGllbnRGaWx0ZXJdO1xuICAgICAgICB0aGlzLmJnQ29udGFpbmVyLmFkZENoaWxkKGdyYWRpZW50U3ByaXRlKTtcbiAgICB9XG5cbiAgICBjcmVhdGVCb3JkZXJzQW5kTWFzaygpIHtcbiAgICAgICAgdGhpcy5ib3JkZXJHcmFwaGljcyA9IG5ldyBQSVhJLkdyYXBoaWNzKCk7XG4gICAgICAgIHRoaXMuZHJhd0JvcmRlcigpO1xuICAgICAgICB0aGlzLmJlemVsQ29udGFpbmVyLmFkZENoaWxkKHRoaXMuYm9yZGVyR3JhcGhpY3MpO1xuXG4gICAgICAgIHRoaXMuYmdNYXNrID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcbiAgICAgICAgdGhpcy5kcmF3TWFzaygpO1xuICAgICAgICAvLyB0aGlzLmJnQ29udGFpbmVyLmFkZENoaWxkKHRoaXMuYmdNYXNrKTtcbiAgICAgICAgLy8gdGhpcy50eHRDb250YWluZXIuYWRkQ2hpbGQodGhpcy5iZ01hc2spO1xuICAgICAgICB0aGlzLmFwcC5hZGRDaGlsZCh0aGlzLmJnTWFzayk7XG4gICAgICAgIC8vIHRoaXMuYmdDb250YWluZXIubWFzayA9IHRoaXMuYmdNYXNrO1xuICAgICAgICAvLyB0aGlzLnR4dENvbnRhaW5lci5tYXNrID0gdGhpcy5iZ01hc2s7XG4gICAgICAgIHRoaXMuYXBwLm1hc2sgPSB0aGlzLmJnTWFzaztcbiAgICB9XG5cbiAgICBpbml0aWFsaXplRGlzcGxhY2VtZW50RmlsdGVyKCkge1xuICAgICAgICBjb25zdCBkaXNwbGFjZW1lbnRUZXh0dXJlID0gUElYSS5UZXh0dXJlLmZyb20oXCIuL2Rpc3BsYWNlbWVudF9tYXAucG5nXCIpO1xuICAgICAgICB0aGlzLmN1cnNvckRpc3BsYWNlbWVudCA9IG5ldyBQSVhJLlNwcml0ZShkaXNwbGFjZW1lbnRUZXh0dXJlKTtcbiAgICAgICAgdGhpcy5jdXJzb3JEaXNwbGFjZW1lbnQuYW5jaG9yLnNldCgwLjUpO1xuICAgICAgICB0aGlzLmN1cnNvckRpc3BsYWNlbWVudC53aWR0aCA9IDI1MDtcbiAgICAgICAgdGhpcy5jdXJzb3JEaXNwbGFjZW1lbnQuaGVpZ2h0ID0gMjUwO1xuXG4gICAgICAgIHRoaXMuZGlzcGxhY2VtZW50RmlsdGVyID0gbmV3IFBJWEkuZmlsdGVycy5EaXNwbGFjZW1lbnRGaWx0ZXIodGhpcy5jdXJzb3JEaXNwbGFjZW1lbnQpO1xuICAgICAgICB0aGlzLmRpc3BsYWNlbWVudEZpbHRlci5zY2FsZS5zZXQoMi41LCAyLjUpO1xuICAgICAgICB0aGlzLmFwcC5hZGRDaGlsZCh0aGlzLmN1cnNvckRpc3BsYWNlbWVudCk7XG5cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmN1cnNvckRpc3BsYWNlbWVudC5wb3NpdGlvbi5zZXQoZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGluaXRpYWxpemVCbG9vbUZpbHRlcigpIHtcbiAgICAgICAgdGhpcy5ibG9vbUZpbHRlciA9IG5ldyBBZHZhbmNlZEJsb29tRmlsdGVyKHtcbiAgICAgICAgICAgIHRocmVzaG9sZDogMC45OCxcbiAgICAgICAgICAgIGJsb29tU2NhbGU6IDEsXG4gICAgICAgICAgICBicmlnaHRuZXNzOiAxLjEsXG4gICAgICAgICAgICBibHVyOiA1LFxuICAgICAgICAgICAgcXVhbGl0eTogMzAsXG4gICAgICAgICAgICBhdXRvRml0OiB0cnVlLFxuICAgICAgICAgICAgcGFkZGluZzo1LFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5taWxkQmxvb21GaWx0ZXIgPSBuZXcgQWR2YW5jZWRCbG9vbUZpbHRlcih7XG4gICAgICAgICAgICB0aHJlc2hvbGQ6IDAuOCxcbiAgICAgICAgICAgIGJsb29tU2NhbGU6IDAuMixcbiAgICAgICAgICAgIGJyaWdodG5lc3M6IDEsXG4gICAgICAgICAgICBibHVyOiAyMCxcbiAgICAgICAgICAgIHF1YWxpdHk6IDMwLFxuICAgICAgICAgICAgYXV0b0ZpdDogdHJ1ZSxcbiAgICAgICAgICAgIHBhZGRpbmc6NSxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcGFyc2VDb250ZW50KCkge1xuICAgICAgICAvLyBTZWxlY3QgYWxsIGxpIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuJGNvbnRlbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwibGlcIik7XG4gICAgICAgIHRoaXMudGl0bGVzID0gW107XG4gICAgICAgIHRoaXMuc3ByaXRlcyA9IFtdOyAvLyBLZWVwIHRyYWNrIG9mIEltYWdlUGl4aSBpbnN0YW5jZXNcbiAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLiRjb250ZW50Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCAkbGkgPSB0aGlzLiRjb250ZW50W2ldO1xuICAgICAgICAgICAgdGhpcy5wYXJzZVN1YkVsZW1lbnRzKCRsaSwgaSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcGFyc2VTdWJFbGVtZW50cygkZWxlbWVudCwgaW5kZXgpIHtcbiAgICAgICAgY29uc3QgJHN1YkVsZW1lbnRzID0gJGVsZW1lbnQuY2hpbGRyZW47XG4gICAgICBcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCAkc3ViRWxlbWVudHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBjb25zdCAkc3ViRWxlbWVudCA9ICRzdWJFbGVtZW50c1tqXTtcbiAgICAgICAgICBjb25zdCBwYXJlbnREaXYgPSAkc3ViRWxlbWVudC5jbG9zZXN0KCcuY29sbGFwc2libGUtY29udGVudCcpO1xuICAgICAgXG4gICAgICAgICAgaWYgKCRzdWJFbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJoMVwiIHx8IFxuICAgICAgICAgICAgICAkc3ViRWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IFwiaDJcIikge1xuICAgICAgICAgICAgLy8gVW5jaGFuZ2VkOiBoYW5kbGUgdGl0bGVzIHdpdGggVGl0bGVQaXhpLCBldGMuXG4gICAgICAgICAgICBjb25zdCB0aXRsZSA9IG5ldyBUaXRsZVBpeGkoXG4gICAgICAgICAgICAgICRzdWJFbGVtZW50LFxuICAgICAgICAgICAgICB0aGlzLnRleHRDb250YWluZXIsXG4gICAgICAgICAgICAgIHRoaXMuZmlsdGVyLFxuICAgICAgICAgICAgICBpbmRleCxcbiAgICAgICAgICAgICAgdGhpcy50aXRsZVNwYWNpbmcsXG4gICAgICAgICAgICAgIHRoaXMucmljaFRleHRzLFxuICAgICAgICAgICAgICB0aGlzLnNwcml0ZXNcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLnRpdGxlcy5wdXNoKHRpdGxlKTtcbiAgICAgIFxuICAgICAgICAgIH0gZWxzZSBpZiAoJHN1YkVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcInBcIikge1xuXG4gICAgICAgICAgICBjb25zdCByaWNoVGV4dCA9IG5ldyBSaWNoVGV4dFBpeGkoJHN1YkVsZW1lbnQsIHRoaXMudGV4dENvbnRhaW5lcik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJpY2hUZXh0LnBhcmVudERpdiA9IHBhcmVudERpdjtcbiAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghdGhpcy5yaWNoVGV4dHMpIHRoaXMucmljaFRleHRzID0gW107XG4gICAgICAgICAgICB0aGlzLnJpY2hUZXh0cy5wdXNoKHJpY2hUZXh0KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCRzdWJFbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJpbWdcIikge1xuICAgICAgICAgICAgY29uc3QgaW1nUGl4aSA9IG5ldyBJbWFnZVBpeGkoJHN1YkVsZW1lbnQsIHRoaXMuaW1hZ2VDb250YWluZXIsIDM1MDAsIHRoaXMubWlsZEJsb29tRmlsdGVyKTtcbiAgICAgICAgICAgIGltZ1BpeGkucGFyZW50RGl2ID0gcGFyZW50RGl2O1xuICAgICAgICAgICAgdGhpcy5zcHJpdGVzLnB1c2goaW1nUGl4aSk7XG4gICAgICBcbiAgICAgICAgICB9IGVsc2UgaWYgKCRzdWJFbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJkaXZcIikge1xuICAgICAgICAgICAgdGhpcy5wYXJzZVN1YkVsZW1lbnRzKCRzdWJFbGVtZW50LCBpbmRleCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcblxuICAgIGFkZEV2ZW50TGlzdGVuZXJzKCkge1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCB0aGlzLm9uUmVzaXplLmJpbmQodGhpcykpO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCB0aGlzLmhhbmRsZVNjcm9sbC5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICBoYW5kbGVTY3JvbGwoKSB7XG4gICAgICAgIGNvbnN0IHNjcm9sbFRvcCA9IHdpbmRvdy5wYWdlWU9mZnNldCB8fCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuICAgICAgICB0aGlzLnNjcm9sbFNwZWVkID0gKHNjcm9sbFRvcCAtIHRoaXMubGFzdFNjcm9sbFRvcCkgKiAwLjE7XG4gICAgICAgIHRoaXMubGFzdFNjcm9sbFRvcCA9IHNjcm9sbFRvcDtcbiAgICB9XG5cbiAgICBkcmF3Qm9yZGVyKCkge1xuICAgICAgICB0aGlzLmJvcmRlckdyYXBoaWNzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuYm9yZGVyR3JhcGhpY3MubGluZVN0eWxlKHRoaXMuYm9yZGVyVGhpY2tuZXNzLCB0aGlzLmJvcmRlckNvbG9yLCB0aGlzLmJvcmRlckFscGhhKTtcbiAgICAgICAgdGhpcy5ib3JkZXJHcmFwaGljcy5kcmF3Um91bmRlZFJlY3QoXG4gICAgICAgICAgICB0aGlzLmJvcmRlclRoaWNrbmVzcyAvIDIsXG4gICAgICAgICAgICB0aGlzLmJvcmRlclRoaWNrbmVzcyAvIDIsXG4gICAgICAgICAgICB3aW5kb3cuaW5uZXJXaWR0aCAtIHRoaXMuYm9yZGVyVGhpY2tuZXNzLFxuICAgICAgICAgICAgd2luZG93LmlubmVySGVpZ2h0IC0gdGhpcy5ib3JkZXJUaGlja25lc3MsXG4gICAgICAgICAgICB0aGlzLmNvcm5lclJhZGl1c1xuICAgICAgICApO1xuICAgIH1cblxuICAgIGRyYXdNYXNrKCkge1xuICAgICAgICB0aGlzLmJnTWFzay5jbGVhcigpO1xuICAgICAgICB0aGlzLmJnTWFzay5iZWdpbkZpbGwoMHhmZmZmZmYsIDEpO1xuICAgICAgICB0aGlzLmJnTWFzay5kcmF3Um91bmRlZFJlY3QoXG4gICAgICAgICAgICB0aGlzLmJvcmRlclRoaWNrbmVzcyAvIDIsXG4gICAgICAgICAgICB0aGlzLmJvcmRlclRoaWNrbmVzcyAvIDIsXG4gICAgICAgICAgICB3aW5kb3cuaW5uZXJXaWR0aCAtIHRoaXMuYm9yZGVyVGhpY2tuZXNzLFxuICAgICAgICAgICAgd2luZG93LmlubmVySGVpZ2h0IC0gdGhpcy5ib3JkZXJUaGlja25lc3MsXG4gICAgICAgICAgICB0aGlzLmNvcm5lclJhZGl1c1xuICAgICAgICApO1xuICAgICAgICB0aGlzLmJnTWFzay5lbmRGaWxsKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlKCkge1xuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy51cGRhdGUuYmluZCh0aGlzKSk7XG4gICAgXG4gICAgICAgIHRoaXMuY3J0RmlsdGVyLnRpbWUgKz0gMC4xO1xuICAgICAgICB0aGlzLmdyYWRpZW50VGltZSArPSAwLjAwMiArIHRoaXMuc2Nyb2xsU3BlZWQ7XG4gICAgICAgIHRoaXMuc2Nyb2xsU3BlZWQgKj0gMC45O1xuICAgICAgICB0aGlzLmdyYWRpZW50RmlsdGVyLnVuaWZvcm1zLnVUaW1lID0gdGhpcy5ncmFkaWVudFRpbWU7XG4gICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0aXRsZXNcbiAgICAgICAgdGhpcy50aXRsZXMuZm9yRWFjaCgodGl0bGUpID0+IHRpdGxlLnVwZGF0ZSgpKTtcbiAgICBcbiAgICAgICAgLy8gVXBkYXRlIHNwcml0ZXNcbiAgICAgICAgdGhpcy5zcHJpdGVzLmZvckVhY2goKHNwcml0ZSkgPT4gc3ByaXRlLnVwZGF0ZVBvc2l0aW9uKCkpO1xuXG4gICAgICAgIGlmICh0aGlzLnJpY2hUZXh0cykge1xuICAgICAgICAgICAgdGhpcy5yaWNoVGV4dHMuZm9yRWFjaCgocmljaFRleHQpID0+IHtcbiAgICAgICAgICAgICAgcmljaFRleHQudXBkYXRlUG9zaXRpb24oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMudmlkZW9zKSB7XG4gICAgICAgICAgICB0aGlzLnZpZGVvcy5mb3JFYWNoKCh2aWRlbykgPT4ge1xuICAgICAgICAgICAgICAgIHZpZGVvLnVwZGF0ZVBvc2l0aW9uKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIFxuICAgICAgICB0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLmFwcCk7XG4gICAgfVxuICAgIFxuXG4gICAgb25SZXNpemUoKSB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG4gICAgICAgIGNvbnN0IGhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5yZXNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgXG4gICAgICAgIGNvbnN0IGdyYWRpZW50U3ByaXRlID0gdGhpcy5iZ0NvbnRhaW5lci5jaGlsZHJlblswXTtcbiAgICAgICAgaWYgKGdyYWRpZW50U3ByaXRlKSB7XG4gICAgICAgICAgICBncmFkaWVudFNwcml0ZS53aWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgZ3JhZGllbnRTcHJpdGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICB9XG4gICAgXG4gICAgICAgIHRoaXMuZHJhd0JvcmRlcigpO1xuICAgICAgICB0aGlzLmRyYXdNYXNrKCk7XG4gICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0aXRsZXMgYW5kIHNwcml0ZXMgb24gcmVzaXplXG4gICAgICAgIHRoaXMudGl0bGVzLmZvckVhY2goKHRpdGxlKSA9PiB0aXRsZS5yZXNpemUoKSk7XG4gICAgICAgIHRoaXMuc3ByaXRlcy5mb3JFYWNoKChzcHJpdGUpID0+IHNwcml0ZS5yZXNpemUoKSk7XG5cbiAgICAgICAgaWYgKHRoaXMucmljaFRleHRzKSB7XG4gICAgICAgICAgICB0aGlzLnJpY2hUZXh0cy5mb3JFYWNoKChydCkgPT4ge3J0Lm9uUmVzaXplKCl9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy52aWRlb3MpIHtcbiAgICAgICAgICAgIHRoaXMudmlkZW9zLmZvckVhY2goKHZpZGVvKSA9PiB7XG4gICAgICAgICAgICAgICAgdmlkZW8ucmVzaXplKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbn1cblxuXG5jbGFzcyBUaXRsZVBpeGkge1xuICAgIGNvbnN0cnVjdG9yKCRlbCwgc3RhZ2UsIGZpbHRlciwgaW5kZXgsIHNwYWNpbmcsIHJpY2hUZXh0cywgc3ByaXRlcykge1xuICAgICAgICB0aGlzLnN0YWdlID0gc3RhZ2U7XG4gICAgICAgIHRoaXMudGl0bGUgPSAkZWw7XG4gICAgICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICAgICAgdGhpcy5zcGFjaW5nID0gc3BhY2luZztcbiAgICAgICAgdGhpcy5yaWNoVGV4dHMgPSByaWNoVGV4dHM7XG4gICAgICAgIHRoaXMuc3ByaXRlcyA9IHNwcml0ZXM7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRleHQoZmlsdGVyKTtcbiAgICAgICAgdGhpcy5hZGRMaXN0ZW5lcnMoKTtcbiAgICAgICAgdGhpcy51cGRhdGVGb250U2l6ZSgpO1xuICAgICAgICB0aGlzLnVwZGF0ZVBvc2l0aW9uKCk7XG4gICAgfVxuXG4gICAgaW5pdGlhbGl6ZVRleHQoZmlsdGVyKSB7XG4gICAgICAgIHRoaXMudGV4dCA9IG5ldyBQSVhJLlRleHQodGhpcy50aXRsZS50ZXh0Q29udGVudCwge1xuICAgICAgICAgICAgZm9udEZhbWlseTogXCJQZXJmZWN0bHkgTmluZXRpZXNcIixcbiAgICAgICAgICAgIGZpbGw6IFwid2hpdGVcIixcbiAgICAgICAgICAgIGFsaWduOiBcImNlbnRlclwiLFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy50ZXh0LnJlc29sdXRpb24gPSAzO1xuICAgICAgICB0aGlzLnRleHQuYW5jaG9yLnNldCgwLjUpO1xuICAgICAgICB0aGlzLnN0YWdlLmFkZENoaWxkKHRoaXMudGV4dCk7XG4gICAgICAgIHRoaXMudGl0bGUucGl4aVRleHQgPSB0aGlzLnRleHQ7XG5cbiAgICAgICAgaWYgKHRoaXMudGl0bGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImgxXCIpIHtcbiAgICAgICAgICAgIHRoaXMudGV4dC5zdHlsZS5sZXR0ZXJTcGFjaW5nID0gMjtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnRpdGxlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJwXCIgJiYgIXRoaXMudGl0bGUuY2xhc3NMaXN0LmNvbnRhaW5zKFwibm9oaWRlXCIpKSB7XG4gICAgICAgICAgICB0aGlzLnRleHQuYWxwaGEgPSAwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZmFkZVBJWElUZXh0KHBpeGlUZXh0LCB0YXJnZXRPcGFjaXR5LCBkdXJhdGlvbiA9IDMwMCkge1xuICAgICAgICBjb25zdCBzdGVwcyA9IDEwO1xuICAgICAgICBjb25zdCBzdGVwRHVyYXRpb24gPSBkdXJhdGlvbiAvIHN0ZXBzO1xuICAgICAgICBjb25zdCBkZWx0YSA9ICh0YXJnZXRPcGFjaXR5IC0gcGl4aVRleHQuYWxwaGEpIC8gc3RlcHM7XG4gICAgXG4gICAgICAgIGxldCBjdXJyZW50U3RlcCA9IDA7XG4gICAgICAgIGNvbnN0IGZhZGVJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIGN1cnJlbnRTdGVwKys7XG4gICAgICAgICAgICBwaXhpVGV4dC5hbHBoYSArPSBkZWx0YTtcbiAgICBcbiAgICAgICAgICAgIGlmIChjdXJyZW50U3RlcCA+PSBzdGVwcykge1xuICAgICAgICAgICAgICAgIHBpeGlUZXh0LmFscGhhID0gdGFyZ2V0T3BhY2l0eTtcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGZhZGVJbnRlcnZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHN0ZXBEdXJhdGlvbik7XG4gICAgfVxuICAgIFxuXG4gICAgYWRkTGlzdGVuZXJzKCkge1xuICAgICAgICBjb25zdCB0YWdOYW1lID0gdGhpcy50aXRsZS50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGFnTmFtZSA9PT0gXCJoMlwiKSB7XG4gICAgICAgICAgICBpZiAodGFnTmFtZSA9PT0gXCJoMlwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50aXRsZS5hZGRFdmVudExpc3RlbmVyKFwibW91c2VlbnRlclwiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGV4dC5zdHlsZS5mb250U2l6ZSArPSA1O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMudGl0bGUuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbGVhdmVcIiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRleHQuc3R5bGUuZm9udFNpemUgLT0gNTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gICAgXG4gICAgICAgICAgICB0aGlzLnRpdGxlLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudERpdiA9IHRoaXMudGl0bGUubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgICAgICAgICAgIGlmICghY29udGVudERpdikgcmV0dXJuO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb250ZW50RGl2LmNsYXNzTGlzdC50b2dnbGUoXCJ2aXNpYmxlXCIpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBGaW5kIGFsbCBSaWNoVGV4dFBpeGkgb2JqZWN0cyB3aG9zZSBwYXJlbnREaXYgaXMgY29udGVudERpdlxuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGV2YW50UmljaFRleHRzID0gdGhpcy5yaWNoVGV4dHMuZmlsdGVyKFxuICAgICAgICAgICAgICAgICAgKHIpID0+IHIucGFyZW50RGl2ID09PSBjb250ZW50RGl2XG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlbGF2ZW50U3ByaXRlcyA9IHRoaXMuc3ByaXRlcy5maWx0ZXIoXG4gICAgICAgICAgICAgICAgICAgIChzKSA9PiBzLnBhcmVudERpdiA9PT0gY29udGVudERpdlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5zcHJpdGVzKTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGNvbnRlbnREaXYuY2xhc3NMaXN0LmNvbnRhaW5zKFwidmlzaWJsZVwiKSkge1xuICAgICAgICAgICAgICAgICAgLy8gRmFkZSB0aGVtIGluXG4gICAgICAgICAgICAgICAgICByZWxldmFudFJpY2hUZXh0cy5mb3JFYWNoKChyKSA9PiByLmZhZGVBbGwoMSwgMzAwKSk7XG4gICAgICAgICAgICAgICAgICByZWxhdmVudFNwcml0ZXMuZm9yRWFjaChzID0+IHtzLmZhZGVJbWFnZSgxLCAzMDApfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIC8vIEZhZGUgdGhlbSBvdXRcbiAgICAgICAgICAgICAgICAgIHJlbGV2YW50UmljaFRleHRzLmZvckVhY2goKHIpID0+IHIuZmFkZUFsbCgwLCAzMDApKTtcbiAgICAgICAgICAgICAgICAgIHJlbGF2ZW50U3ByaXRlcy5mb3JFYWNoKHMgPT4ge3MuZmFkZUltYWdlKDAsIDMwMCl9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICB9XG4gICAgICAgIFxuXG4gICAgdXBkYXRlRm9udFNpemUoKSB7XG4gICAgICAgIGNvbnN0IHRhZ05hbWUgPSB0aGlzLnRpdGxlLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgbGV0IHNpemVGYWN0b3IgPSAwLjA1O1xuXG4gICAgICAgIGlmICh0YWdOYW1lID09PSBcImgxXCIpIHtcbiAgICAgICAgICAgIHNpemVGYWN0b3IgPSAwLjE7XG4gICAgICAgIH0gZWxzZSBpZiAodGFnTmFtZSA9PT0gXCJwXCIpIHtcbiAgICAgICAgICAgIHNpemVGYWN0b3IgPSAwLjAyO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV3Rm9udFNpemUgPSB3aW5kb3cuaW5uZXJXaWR0aCAqIHNpemVGYWN0b3I7XG4gICAgICAgIHRoaXMudGV4dC5zdHlsZS5mb250U2l6ZSA9IG5ld0ZvbnRTaXplO1xuICAgICAgICB0aGlzLnRleHQudXBkYXRlVGV4dCgpO1xuICAgIH1cblxuICAgIHVwZGF0ZVBvc2l0aW9uKCkge1xuICAgICAgICBjb25zdCB7IHRvcCB9ID0gdGhpcy50aXRsZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgY29uc3QgeCA9IHdpbmRvdy5pbm5lcldpZHRoIC8gMjtcbiAgICAgICAgbGV0IHkgPSB0b3A7XG4gICAgICAgIFxuXG4gICAgICAgIGlmICh0aGlzLnRpdGxlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJwXCIpIHtcbiAgICAgICAgICAgIHkgLT0gd2luZG93LmlubmVyV2lkdGggLyAxMjsgLy8gQWRqdXN0IHRoaXMgb2Zmc2V0IGFzIG5lZWRlZFxuICAgICAgICB9XG4gICAgICAgIHRoaXMudGV4dC5wb3NpdGlvbi5zZXQoeCwgeSk7XG4gICAgfVxuXG4gICAgdXBkYXRlKCkge1xuICAgICAgICB0aGlzLnVwZGF0ZVBvc2l0aW9uKCk7XG4gICAgfVxuXG4gICAgcmVzaXplKCkge1xuICAgICAgICB0aGlzLnVwZGF0ZUZvbnRTaXplKCk7XG4gICAgICAgIHRoaXMudXBkYXRlUG9zaXRpb24oKTtcbiAgICB9XG59XG5cblxuY2xhc3MgUmljaFRleHRQaXhpIHtcbiAgICBjb25zdHJ1Y3RvcigkZWwsIHN0YWdlKSB7XG4gICAgICB0aGlzLiRlbCA9ICRlbDsgICAgICAgICAvLyBUaGUgRE9NIDxwPlxuICAgICAgdGhpcy5zdGFnZSA9IHN0YWdlOyAgICAgXG4gICAgICB0aGlzLmFsbENodW5rcyA9IFtdOyAgICAvLyBXaWxsIGhvbGQgUElYSS5UZXh0IG9iamVjdHMgKyAnbGluZUJyZWFrJyBtYXJrZXJzXG4gICAgICB0aGlzLmxpbmVzID0gW107ICAgICAgICAvLyBBcnJheSBvZiBhcnJheXMsIGVhY2ggaXMgYSBsaW5lIG9mIHRleHRcbiAgICAgIHRoaXMuc2l6ZUZhY3Rvcj0gMC4wMjtcbiAgICAgIHRoaXMueU9mZnNldCA9MDtcblxuXG4gICAgICB0aGlzLm5vcm1hbFN0eWxlID0gbmV3IFBJWEkuVGV4dFN0eWxlKHtcbiAgICAgICAgZm9udEZhbWlseTogXCJQZXJmZWN0bHkgTmluZXRpZXNcIixcbiAgICAgICAgZm9udFNpemU6IHdpbmRvdy5pbm5lcldpZHRoICogdGhpcy5zaXplRmFjdG9yLFxuICAgICAgICBmaWxsOiBcIndoaXRlXCIsXG4gICAgICB9KTtcbiAgXG4gICAgICB0aGlzLmJvbGRTdHlsZSA9IG5ldyBQSVhJLlRleHRTdHlsZSh7XG4gICAgICAgIGZvbnRGYW1pbHk6IFwiUGVyZmVjdGx5IE5pbmV0aWVzXCIsXG4gICAgICAgIGZvbnRXZWlnaHQ6IFwiYm9sZFwiLFxuICAgICAgICBmb250U2l6ZTogd2luZG93LmlubmVyV2lkdGggKiB0aGlzLnNpemVGYWN0b3IsXG4gICAgICAgIGZpbGw6IFwid2hpdGVcIixcbiAgICAgIH0pO1xuICAgICAgLy8gcGFyc2UgSFRNTCBub2RlXG4gICAgICB0aGlzLnBhcnNlTm9kZXMoKTtcbiAgXG4gICAgICAvLyBidWlsZCBsaW5lcyBmcm9tIGNodW5rc1xuICAgICAgdGhpcy5idWlsZExpbmVzKCk7XG4gIFxuICAgICAgLy8gcG9zaXRpb24gdGhlbVxuICAgICAgdGhpcy51cGRhdGVQb3NpdGlvbigpO1xuICAgIH1cbiAgXG4gICAgcGFyc2VOb2RlcygpIHtcbiAgICAgIGNvbnN0IGNoaWxkTm9kZXMgPSB0aGlzLiRlbC5jaGlsZE5vZGVzO1xuICAgICAgY2hpbGROb2Rlcy5mb3JFYWNoKChub2RlKSA9PiB7XG4gICAgICAgIGlmIChub2RlLm5vZGVUeXBlID09PSBOb2RlLlRFWFRfTk9ERSkge1xuICAgICAgICAgIC8vIElmIHRoZXJlJ3MgYW55IGNvbnRlbnQsIGNyZWF0ZSBQSVhJIHRleHRcbiAgICAgICAgICB0aGlzLmNyZWF0ZVBpeGlUZXh0KG5vZGUudGV4dENvbnRlbnQsIHRoaXMubm9ybWFsU3R5bGUpO1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgICAgICAgaWYgKG5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcInN0cm9uZ1wiKSB7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVBpeGlUZXh0KG5vZGUudGV4dENvbnRlbnQsIHRoaXMuYm9sZFN0eWxlKTtcbiAgICAgICAgICB9IFxuICAgICAgICAgIC8vIElmIHRoZXJlJ3MgbmVzdGVkIHRleHQgaW4gb3RoZXIgdGFncywgd2UgY2FuIHBhcnNlIHJlY3Vyc2l2ZWx5XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBub2RlLmNoaWxkTm9kZXMuZm9yRWFjaCgoc3ViTm9kZSkgPT4ge1xuICAgICAgICAgICAgICBpZiAoc3ViTm9kZS5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZVBpeGlUZXh0KHN1Yk5vZGUudGV4dENvbnRlbnQsIHRoaXMubm9ybWFsU3R5bGUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgXG4gICAgY3JlYXRlUGl4aVRleHQodGV4dFN0ciwgc3R5bGUpIHtcbiAgICAgIGlmICghdGV4dFN0ci50cmltKCkpIHJldHVybjtcbiAgXG4gICAgICBjb25zdCBzZWdtZW50cyA9IHRleHRTdHIuc3BsaXQoXCJcXG5cIik7XG4gICAgICBzZWdtZW50cy5mb3JFYWNoKChzZWcsIGkpID0+IHtcbiAgICAgICAgaWYgKHNlZy50cmltKCkpIHtcbiAgICAgICAgICBjb25zdCBwaXhpVGV4dCA9IG5ldyBQSVhJLlRleHQoc2VnLnRyaW0oKSwgc3R5bGUpO1xuICAgICAgICAgIHBpeGlUZXh0LmFuY2hvci5zZXQoMCwgMCk7XG4gICAgICAgICAgcGl4aVRleHQuYWxwaGEgPSAwOyAvLyBTdGFydCBoaWRkZW5cbiAgICAgICAgICBpZiAodGhpcy4kZWwuY2xhc3NMaXN0LmNvbnRhaW5zKFwibm9oaWRlXCIpKSB7XG4gICAgICAgICAgICBwaXhpVGV4dC5hbHBoYSA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICAgIHBpeGlUZXh0LnJlc29sdXRpb24gPSAzO1xuICAgICAgICAgIHRoaXMuc3RhZ2UuYWRkQ2hpbGQocGl4aVRleHQpO1xuICAgICAgICAgIHRoaXMuYWxsQ2h1bmtzLnB1c2gocGl4aVRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpIDwgc2VnbWVudHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIHRoaXMuYWxsQ2h1bmtzLnB1c2goeyB0eXBlOiBcImxpbmVCcmVha1wiIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIFxuICAgIGJ1aWxkTGluZXMoKSB7XG4gICAgICB0aGlzLmxpbmVzID0gW107XG4gICAgICBsZXQgY3VycmVudExpbmUgPSBbXTtcbiAgICAgIGxldCBjdXJyZW50TGluZVdpZHRoID0gMDtcbiAgXG4gICAgICBjb25zdCBtYXhMaW5lV2lkdGggPSA4MDA7ICAvLyBwaWNrIGEgZ29vZCBtYXggd2lkdGhcbiAgICAgIHRoaXMuYWxsQ2h1bmtzLmZvckVhY2goKGNodW5rKSA9PiB7XG4gICAgICAgIGlmIChjaHVuay50eXBlID09PSBcImxpbmVCcmVha1wiKSB7XG4gICAgICAgICAgLy8gcHVzaCBjdXJyZW50IGxpbmVcbiAgICAgICAgICBpZiAoY3VycmVudExpbmUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5saW5lcy5wdXNoKGN1cnJlbnRMaW5lKTtcbiAgICAgICAgICAgIGN1cnJlbnRMaW5lID0gW107XG4gICAgICAgICAgICBjdXJyZW50TGluZVdpZHRoID0gMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2h1bmsudXBkYXRlVGV4dCgpO1xuICAgICAgICAgIGNvbnN0IHcgPSBjaHVuay53aWR0aDtcbiAgXG4gICAgICAgICAgLy8gaWYgd2UgZXhjZWVkIHRoZSBtYXggd2lkdGgsIHN0YXJ0IG5ldyBsaW5lXG4gICAgICAgICAgaWYgKGN1cnJlbnRMaW5lV2lkdGggKyB3ID4gbWF4TGluZVdpZHRoICYmIGN1cnJlbnRMaW5lLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMubGluZXMucHVzaChjdXJyZW50TGluZSk7XG4gICAgICAgICAgICBjdXJyZW50TGluZSA9IFtdO1xuICAgICAgICAgICAgY3VycmVudExpbmVXaWR0aCA9IDA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGN1cnJlbnRMaW5lLnB1c2goY2h1bmspO1xuICAgICAgICAgIGN1cnJlbnRMaW5lV2lkdGggKz0gdztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIFxuICAgICAgLy8gcHVzaCBsZWZ0b3ZlclxuICAgICAgaWYgKGN1cnJlbnRMaW5lLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5saW5lcy5wdXNoKGN1cnJlbnRMaW5lKTtcbiAgICAgIH1cbiAgICB9XG4gIFxuICAgIHVwZGF0ZVBvc2l0aW9uKCkge1xuICAgICAgLy8gZ2V0IGJvdW5kaW5nIHJlY3QgZm9yIHRvcCBvZmZzZXRcbiAgICAgIGNvbnN0IHJlY3QgPSB0aGlzLiRlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIGNvbnN0IHN0YXJ0WSA9IHJlY3QudG9wICsgd2luZG93LnNjcm9sbFk7XG4gICAgICB0aGlzLnlPZmZzZXQgPSB3aW5kb3cuaW5uZXJXaWR0aCAvIDEwO1xuICAgICAgbGV0IGN1cnJlbnRZID0gc3RhcnRZIC0gdGhpcy55T2Zmc2V0O1xuICAgICAgY29uc3QgY2h1bmtQYWRkaW5nID0gNTtcbiAgXG4gICAgICBjb25zdCBsaW5lSGVpZ2h0ID0gd2luZG93LmlubmVyV2lkdGggLyAyNDsgLy8gYWRqdXN0IGZvciBiaWdnZXIgb3Igc21hbGxlciBzcGFjaW5nXG4gIFxuICAgICAgLy8gY2VudGVyIGVhY2ggbGluZVxuICAgICAgdGhpcy5saW5lcy5mb3JFYWNoKChsaW5lKSA9PiB7XG4gICAgICAgIGNvbnN0IGxpbmVXaWR0aCA9IGxpbmUucmVkdWNlKChzdW0sIGMpID0+IHN1bSArIGMud2lkdGgsIDApO1xuICAgICAgICBsZXQgY3VycmVudFggPSAod2luZG93LmlubmVyV2lkdGggLyAyKSAtIChsaW5lV2lkdGggLyAyKTtcbiAgXG4gICAgICAgIGxpbmUuZm9yRWFjaCgoY2h1bmspID0+IHtcbiAgICAgIFxuICAgICAgICAgIGNodW5rLnggPSBjdXJyZW50WDsgXG4gICAgICAgIFxuICAgICAgICAgIGNodW5rLnkgPSBjdXJyZW50WTtcbiAgICAgICAgICBjdXJyZW50WCArPSBjaHVuay53aWR0aCArIGNodW5rUGFkZGluZztcbiAgICAgICAgfSk7XG4gIFxuICAgICAgICBjdXJyZW50WSArPSBsaW5lSGVpZ2h0O1xuICAgICAgICBcbiAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgb25SZXNpemUoKSB7XG4gICAgICAgIGNvbnN0IG5ld1NpemUgPSAgd2luZG93LmlubmVyV2lkdGggKiB0aGlzLnNpemVGYWN0b3I7XG4gICAgICBcbiAgICAgICAgLy8gMikgVXBkYXRlIHlvdXIgbm9ybWFsIGFuZCBib2xkIFRleHRTdHlsZXNcbiAgICAgICAgdGhpcy5ub3JtYWxTdHlsZS5mb250U2l6ZSA9IG5ld1NpemU7XG4gICAgICAgIHRoaXMuYm9sZFN0eWxlLmZvbnRTaXplID0gbmV3U2l6ZTtcbiAgICAgIFxuICAgICAgICAvLyAzKSBSZS1hcHBseSB0aGUgc3R5bGVzIHRvIGVhY2ggUElYSS5UZXh0IGNodW5rIGFuZCB1cGRhdGUgaXRzIHRleHQgbWV0cmljc1xuICAgICAgICB0aGlzLmFsbENodW5rcy5mb3JFYWNoKChjaHVuaykgPT4ge1xuICAgICAgICAgIC8vIFNraXAgdGhlIGxpbmVCcmVhayBtYXJrZXJcbiAgICAgICAgICBpZiAoY2h1bmsudHlwZSA9PT0gXCJsaW5lQnJlYWtcIikgcmV0dXJuO1xuICAgICAgXG4gICAgICAgICAgLy8gSWYgaXTigJlzIGEgYm9sZCBjaHVuaywgc2V0IHN0eWxlIHRvIHRoaXMuYm9sZFN0eWxlXG4gICAgICAgICAgLy8gSWYgbm9ybWFsLCB1c2UgdGhpcy5ub3JtYWxTdHlsZVxuICAgICAgICAgIGNvbnN0IGlzQm9sZCA9IGNodW5rLnN0eWxlICYmIGNodW5rLnN0eWxlLmZvbnRXZWlnaHQgPT09IFwiYm9sZFwiO1xuICAgICAgICAgIGNodW5rLnN0eWxlID0gaXNCb2xkID8gdGhpcy5ib2xkU3R5bGUgOiB0aGlzLm5vcm1hbFN0eWxlO1xuICAgICAgICAgIGNodW5rLnVwZGF0ZVRleHQoKTtcbiAgICAgICAgfSk7XG4gICAgICBcbiAgICAgICAgdGhpcy5idWlsZExpbmVzKCk7XG4gICAgICBcbiAgICAgICAgdGhpcy51cGRhdGVQb3NpdGlvbigpO1xuICAgICAgfVxuICAgICAgXG4gIFxuICAgIGZhZGVBbGwodGFyZ2V0QWxwaGEsIGR1cmF0aW9uID0gMzAwKSB7XG4gICAgICBjb25zdCBzdGVwcyA9IDEwO1xuICAgICAgY29uc3Qgc3RlcER1cmF0aW9uID0gZHVyYXRpb24gLyBzdGVwcztcbiAgXG4gICAgICB0aGlzLmFsbENodW5rcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgIC8vIHNraXAgbGluZUJyZWFrIG9iamVjdHNcbiAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gXCJsaW5lQnJlYWtcIikgcmV0dXJuO1xuICBcbiAgICAgICAgY29uc3QgZGVsdGEgPSAodGFyZ2V0QWxwaGEgLSBpdGVtLmFscGhhKSAvIHN0ZXBzO1xuICAgICAgICBsZXQgY3VycmVudFN0ZXAgPSAwO1xuICAgICAgICBjb25zdCBmYWRlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgY3VycmVudFN0ZXArKztcbiAgICAgICAgICBpdGVtLmFscGhhICs9IGRlbHRhO1xuICAgICAgICAgIGlmIChjdXJyZW50U3RlcCA+PSBzdGVwcykge1xuICAgICAgICAgICAgaXRlbS5hbHBoYSA9IHRhcmdldEFscGhhO1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChmYWRlSW50ZXJ2YWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgc3RlcER1cmF0aW9uKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgXG4gICAgcmVzaXplKCkge1xuICAgICAgLy8gaWYgeW91IHdhbnQgdG8gcmUtY29tcHV0ZSBsaW5lIHdyYXBwaW5nIG9uIHJlc2l6ZSwgZG86XG4gICAgICAvLyB0aGlzLmJ1aWxkTGluZXMoKTtcbiAgICAgIHRoaXMudXBkYXRlUG9zaXRpb24oKTtcbiAgICB9XG4gIFxuICAgIHVwZGF0ZVBvc2l0aW9uT25TY3JvbGwoKSB7XG4gICAgICB0aGlzLnVwZGF0ZVBvc2l0aW9uKCk7XG4gICAgfVxuICB9XG4gIFxuY2xhc3MgSW1hZ2VQaXhpIHtcbiAgICBjb25zdHJ1Y3RvcigkZWwsIHN0YWdlLCBzY2FsZSwgYmxvb21GaWx0ZXIpIHtcbiAgICAgICAgdGhpcy4kZWwgPSAkZWw7IC8vIFJlZmVyZW5jZSB0byB0aGUgRE9NIGVsZW1lbnRcbiAgICAgICAgdGhpcy5zdGFnZSA9IHN0YWdlO1xuICAgICAgICB0aGlzLnNjYWxlID0gc2NhbGU7XG5cbiAgICAgICAgdGhpcy5pbml0U3ByaXRlKCk7XG4gICAgICAgIHRoaXMudXBkYXRlUG9zaXRpb24oKTtcbiAgICAgICAgdGhpcy5hZGRMaXN0ZW5lcnMoKTtcbiAgICAgICAvLyAkZWwuc3R5bGUub3BhY2l0eSA9IDA7XG4gICAgICAgLy8gJGVsLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xuICAgICAgICBcbiAgICB9XG5cbiAgICBpbml0U3ByaXRlKCkge1xuICAgICAgICBjb25zdCBpbWdTcmMgPSB0aGlzLiRlbC5nZXRBdHRyaWJ1dGUoXCJzcmNcIik7XG4gICAgICAgIGlmIChpbWdTcmMpIHtcbiAgICAgICAgICAgIGNvbnN0IHRleHR1cmUgPSBQSVhJLlRleHR1cmUuZnJvbShpbWdTcmMpO1xuICAgICAgICAgICAgdGhpcy5zcHJpdGUgPSBuZXcgUElYSS5TcHJpdGUodGV4dHVyZSk7XG5cbiAgICAgICAgICAgIC8vIFNldCBhbmNob3IsIHNjYWxlLCBhbmQgYWRkIHRvIHN0YWdlXG4gICAgICAgICAgICB0aGlzLnNwcml0ZS5hbmNob3Iuc2V0KDAuNSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHNldCBzY2FsZSBiYXNlZCBvbiB3aW5kb3cgd2lkdGhcbiAgICAgICAgICAgIGNvbnN0IHNjYWxlID0gd2luZG93LmlubmVyV2lkdGggLyB0aGlzLnNjYWxlO1xuICAgICAgICAgICAgdGhpcy5zcHJpdGUuc2NhbGUuc2V0KHNjYWxlKTtcblxuICAgICAgICAgICAgdGhpcy5zdGFnZS5hZGRDaGlsZCh0aGlzLnNwcml0ZSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLiRlbC5jbGFzc0xpc3QuY29udGFpbnMoXCJpbmxpbmVcIikpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNwcml0ZS5hbHBoYSA9IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG1hc2sgPSBuZXcgUElYSS5HcmFwaGljcygpO1xuICAgICAgICAgICAgbWFzay5iZWdpbkZpbGwoMHhmZjAwLCAwLjUpO1xuICAgICAgICAgICAgbWFzay5kcmF3Um91bmRlZFJlY3QoMCwgMCwgdGhpcy5zcHJpdGUud2lkdGgsIHRoaXMuc3ByaXRlLmhlaWdodCwgMjApOyBcbiAgICAgICAgICAgIG1hc2suZW5kRmlsbCgpO1xuICAgICAgICAgICAgbWFzay54ID0gdGhpcy5zcHJpdGUueDtcbiAgICAgICAgICAgIG1hc2sueSA9IHRoaXMuc3ByaXRlLnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhZGRMaXN0ZW5lcnMoKSB7XG4gICAgICAgIC8vIEVuYWJsZSBpbnRlcmFjdGlvbiBvbiB0aGUgc3ByaXRlXG4gICAgICAgIHRoaXMuc3ByaXRlLmludGVyYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zcHJpdGUuYnV0dG9uTW9kZSA9IHRydWU7XG4gICAgXG4gICAgICAgIC8vIEhhbmRsZSBob3ZlclxuICAgICAgICB0aGlzLiRlbC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VlbnRlclwiLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBJbmNyZWFzZSB0aGUgUGl4aSBzcHJpdGXigJlzIHNjYWxlIGJ5IDIwJVxuICAgICAgICAgICAgdGhpcy5zY2FsZSAvPSAxLjI7XG4gICAgICAgIH0pO1xuICAgIFxuICAgICAgICB0aGlzLiRlbC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VsZWF2ZVwiLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBSZXNldCBzY2FsZSBiYWNrIHRvIHRoZSBvcmlnaW5hbCAoYXMgY29tcHV0ZWQgaW4gdXBkYXRlUG9zaXRpb24gb3IgY29uc3RydWN0b3IpXG4gICAgICAgICAgICB0aGlzLnNjYWxlICo9IDEuMjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy4kZWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGhyZWYgPSB0aGlzLiRlbC5nZXRBdHRyaWJ1dGUoXCJocmVmXCIpO1xuICAgICAgICAgICAgaWYgKGhyZWYpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cub3BlbihocmVmLCBcIl9ibGFua1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9XG4gICAgXG5cbiAgICB1cGRhdGVQb3NpdGlvbigpIHtcbiAgICAgICAgY29uc3QgeyB0b3AsIGxlZnQsIHdpZHRoLCBoZWlnaHQgfSA9IHRoaXMuJGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgXG4gICAgICAgIGxldCB4ID0gbGVmdCArIHdpZHRoIC8gMjtcbiAgICAgICAgbGV0IHkgPSB0b3AgKyBoZWlnaHQgLyAyO1xuXG4gICAgICAgIGlmICh0aGlzLiRlbC5jbGFzc0xpc3QuY29udGFpbnMoXCJpbmxpbmVcIikpIHtcbiAgICAgICAgICAgIHkgPSB0b3AgLSB3aW5kb3cuaW5uZXJXaWR0aCAvIDEyO1xuICAgICAgICAgICAgeCA9IHdpbmRvdy5pbm5lcldpZHRoIC8gMjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3ByaXRlLnBvc2l0aW9uLnNldCh4LCB5KTtcbiAgICAgICBjb25zdCBzY2FsZSA9IHdpbmRvdy5pbm5lcldpZHRoIC8gdGhpcy5zY2FsZTtcbiAgICAgICB0aGlzLnNwcml0ZS5zY2FsZS5zZXQoc2NhbGUpO1xuICAgIH1cbiAgICBcbiAgICBmYWRlSW1hZ2UodGFyZ2V0QWxwaGEsIGR1cmF0aW9uID0gMzAwKSB7XG4gICAgICAgIGNvbnN0IHN0ZXBzID0gMTA7XG4gICAgICAgIGNvbnN0IHN0ZXBEdXJhdGlvbiA9IGR1cmF0aW9uIC8gc3RlcHM7XG4gICAgICAgIGNvbnN0IGRlbHRhID0gKHRhcmdldEFscGhhIC0gdGhpcy5zcHJpdGUuYWxwaGEpIC8gc3RlcHM7XG4gICAgXG4gICAgICAgIGxldCBjdXJyZW50U3RlcCA9IDA7XG4gICAgICAgIGNvbnN0IGZhZGVJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIGN1cnJlbnRTdGVwKys7XG4gICAgICAgICAgICB0aGlzLnNwcml0ZS5hbHBoYSArPSBkZWx0YTtcbiAgICBcbiAgICAgICAgICAgIGlmIChjdXJyZW50U3RlcCA+PSBzdGVwcykge1xuICAgICAgICAgICAgICAgIHRoaXMuc3ByaXRlLmFscGhhID0gdGFyZ2V0QWxwaGE7XG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChmYWRlSW50ZXJ2YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBzdGVwRHVyYXRpb24pO1xuICAgIH1cblxuICAgIHJlc2l6ZSgpIHtcbiAgICAgICAgdGhpcy51cGRhdGVQb3NpdGlvbigpO1xuICAgIH1cblxufVxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgc2NlbmUgPSBuZXcgUGl4aVNjZW5lKCk7XG4gICAgYXdhaXQgc2NlbmUuaW5pdCgpO1xufSk7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDbkUsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDbkYsTUFBTSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7O0FBRXhHLEtBQUssQ0FBQyxTQUFTLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDNUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENB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LENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUs7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztBQUN6RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjs7QUFFakQsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQzs7QUFFNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7QUFDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzs7QUFFakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDOztBQUUvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTtBQUM3RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztBQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQzs7QUFFMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDOztBQUVoRCxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUs7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFD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QU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7QUFDOUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRTtBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENB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LENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUTtBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYTtBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU07QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVoRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztBQUM5RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDbEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO0FBQ3ZHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNsRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVMLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZFLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsU0FBUztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFNBQVM7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztBQUMvRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxlQUFlO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZTtBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZTtBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZTtBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWU7QUFDcEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWU7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVc7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVk7QUFDOUQsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQzs7QUFFakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQzs7QUFFSCxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVU7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs7QUFFekQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0g7OztBQUdBLEtBQUssQ0FBQyxTQUFTLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN4RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJOztBQUV2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDOUQsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNuQyxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGFBQWE7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7O0FBRUgsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCO0FBQ2hFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO0FBQ3BFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU07QUFDL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVqQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTTtBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3JFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3JFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVQLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFOztBQUU3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFdBQVc7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRVAsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUNsRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKOzs7QUFHQSxLQUFLLENBQUMsWUFBWSxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUNwRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7OztBQUdyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVTtBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVTtBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDdkIsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN2QixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVTtBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7QUFDakUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0FBQ2hFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7QUFDMUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDakMsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBQ0QsQ0FBQyxD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LENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU87QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQztBQUNqRixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hFLENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsWUFBWTtBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVSLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVU7QUFDNUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQztBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVztBQUNsRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDM0MsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUM3QyxDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFdBQVc7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUU7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBQ0YsQ0FBQztBQUNELEtBQUssQ0FBQyxTQUFTLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSzs7QUFFMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7O0FBRWxELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO0FBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7O0FBRXhDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7O0FBRTVDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRVosQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ3JDLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxXQUFXO0FBQzdGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVWLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQzs7QUFFSCxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDN0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRVIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUMvRCxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUN0QyxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxXQUFXO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUo7O0FBRUEsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDOyJ9