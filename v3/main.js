import { createWarpFilter, createGradientFilter } from "./shader.js";
import { CRTFilter } from "@pixi/filter-crt";
import { AdvancedBloomFilter } from "@pixi/filter-advanced-bloom";

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
            this.bloomFilter,
        ];
        this.contentContainer.filters = [this.displacementFilter];
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
        this.contentContainer = new PIXI.Container();
        this.app.addChild(this.contentContainer);
        this.app.addChild(this.bgContainer);
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
        this.bgContainer.addChild(this.borderGraphics);

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
            bloomScale: 1.5,
            brightness: 1.1,
            blur: 10,
            quality: 30,
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
              this.contentContainer,
              this.filter,
              index,
              this.titleSpacing,
              this.richTexts,
              this.sprites
            );
            this.titles.push(title);
      
          } else if ($subElement.tagName.toLowerCase() === "p") {
            // Let's find the parent <div>
          
            // Create the RichTextPixi object
            const richText = new RichTextPixi($subElement, this.contentContainer);
            
            // Store a reference to the parent <div> so we know where it belongs
            richText.parentDiv = parentDiv;
          
            if (!this.richTexts) this.richTexts = [];
            this.richTexts.push(richText);
          } else if ($subElement.tagName.toLowerCase() === "img") {
            const imgPixi = new ImagePixi($subElement, this.contentContainer, 3500);
            imgPixi.parentDiv = parentDiv;
            this.sprites.push(imgPixi);
      
          } else if ($subElement.tagName.toLowerCase() === "div") {
            // Recursively parse sub-elements
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
        this.gradientTime += 0.001 + this.scrollSpeed;
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
      this.yOffset = window.innerWidth / 12;


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
      // If the text is all whitespace, skip
      if (!textStr.trim()) return;
  
      // split on newlines
      const segments = textStr.split("\n");
      segments.forEach((seg, i) => {
        // ignore empty lines
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
        // If there's another segment after this, insert a lineBreak marker
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
  
      const lineHeight = window.innerWidth / 24; // adjust for bigger or smaller spacing
  
      // center each line
      this.lines.forEach((line) => {
        const lineWidth = line.reduce((sum, c) => sum + c.width, 0);
        let currentX = (window.innerWidth / 2) - (lineWidth / 2);
  
        line.forEach((chunk) => {
          chunk.x = currentX;
          chunk.y = currentY;
          currentX += chunk.width;
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
    constructor($el, stage, scale) {
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
