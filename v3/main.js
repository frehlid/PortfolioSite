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
        this.initializeContainers();
        this.initializeCustomCursor();

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
        this.customCursor.lineStyle(1, 0xeeeeeee, 1);
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
        this.text.anchor.set(0.5,0);
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
          //  y -= window.innerWidth / 12; // Adjust this offset as needed
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
      this.$el = $el; 
      this.stage = stage;
      this.allChunks = []; 
      this.lines = []; 
      this.sizeFactor = 0.02;
      this.yOffset = 0;
      console.log(this.$el.style.lineHeight); 
      this.lineHeight = 0.25; // todo - get this from the CSS

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

      this.linkStyle = new PIXI.TextStyle({
          fontFamily: "Perfectly Nineties",
          fontSize: window.innerWidth * this.sizeFactor,
          fill: "#00baff",
          textDecoration: "underline",
      });


      this.parseNodes();

      this.buildLines();

      this.updatePosition();
  }

  parseNodes() {
      const childNodes = this.$el.childNodes;
      childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
              this.createPixiText(node.textContent, this.normalStyle);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
              const tagName = node.tagName.toLowerCase();
              if (tagName === "strong") {
                  this.createPixiText(node.textContent, this.boldStyle);
              } else if (tagName === "a") {
                  this.createLinkPixi(node);
              } else {
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

  createLinkPixi(anchorElement) {
    const textContent = anchorElement.textContent;
    const href = anchorElement.getAttribute("href");
    if (!textContent.trim() || !href) return;

    const linkText = new PIXI.Text(textContent, this.linkStyle);
    linkText.interactive = true;
    linkText.buttonMode = true;

    // this.$el.addEventListener("click", () => {
    //     window.open(href, "_blank");
    //     console.log("clicked");
    // });

    linkText.anchor.set(0, 0);
    linkText.alpha = 0; // Start hidden
    if (this.$el.classList.contains("nohide")) {
        linkText.alpha = 1;
    }
    linkText.resolution = 3;
    this.stage.addChild(linkText);
    this.allChunks.push(linkText);
}


  buildLines() {
      this.lines = [];
      let currentLine = [];
      let currentLineWidth = 0;

      const maxLineWidth = (2/3) * window.innerWidth; 
      let lineHeight = this.lineHeight;
      this.allChunks.forEach((chunk) => {
          if (chunk.type === "lineBreak") {
              if (currentLine.length > 0) {
                  this.lines.push(currentLine);
                  currentLine = [];
                  currentLineWidth = 0;
              }
          } else {
              chunk.updateText();
              const w = chunk.width;

              if (currentLineWidth + w > maxLineWidth && currentLine.length > 0) {
                  this.lines.push(currentLine);
                  currentLine = [];
                  currentLineWidth = 0;
                  lineHeight += this.lineHeight;
              }
              currentLine.push(chunk);
              currentLineWidth += w;
          }
      });

      this.$el.style.lineHeight = `${lineHeight}`;

      if (currentLine.length > 0) {
          this.lines.push(currentLine);
      }
  }

  updatePosition() {
      const rect = this.$el.getBoundingClientRect();
      const startY = rect.top + window.scrollY;
      this.yOffset = 0;
      let currentY = startY;
      const chunkPadding = 5;

      const lineHeight = window.innerWidth / 24;

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

  fadeAll(targetAlpha, duration = 300) {
      const steps = 10;
      const stepDuration = duration / steps;

      this.allChunks.forEach((item) => {
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

  onResize() {
      const newSize = window.innerWidth * this.sizeFactor;

      this.normalStyle.fontSize = newSize;
      this.boldStyle.fontSize = newSize;
      this.linkStyle.fontSize = newSize;

      this.allChunks.forEach((chunk) => {
          if (chunk.type === "lineBreak") return;

          const isBold = chunk.style && chunk.style.fontWeight === "bold";
          const isLink = chunk.style && chunk.style.fill === this.linkStyle.fill;
          chunk.style = isBold ? this.boldStyle : isLink ? this.linkStyle : this.normalStyle;
          chunk.updateText();
      });

      this.buildLines();
      this.updatePosition();
  }
}

class ImagePixi {
    constructor($el, stage, scale, bloomFilter) {
        this.$el = $el; 
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

            if (this.$el.classList.contains("projectImage")) {
              this.sprite.anchor.set(0.5);
            } else {
              this.sprite.anchor.set(0.5);
            }
            const scale = window.innerWidth / this.scale;
            this.sprite.scale.set(scale);

            this.stage.addChild(this.sprite);

            if (this.$el.classList.contains("projectImage")) {
                this.sprite.alpha = 0;
            }

        }
    }

    addListeners() {
        // this.sprite.interactive = true;
        // this.sprite.buttonMode = true;
    
        // Handle hover
        this.$el.addEventListener("mouseenter", () => {
            this.scale /= 1.2;
        });
    
        this.$el.addEventListener("mouseleave", () => {
            this.scale *= 1.2;
        });

        this.$el.addEventListener("click", () => {
            const href = this.$el.getAttribute("href");
            if (href) {
                window.open(href, "_blank");
            }
        });
        
        const parentDiv = this.$el.parentDiv;
        if (parentDiv) {
            parentDiv.addEventListener("mouseenter", () => {
              console.log("mouse enter");
              this.scale /= 1.2; 
            });
            parentDiv.addEventListener("mouseleave", () => {
              this.scale *= 1.2;
            });


            parentDiv.addEventListener("click", () => {
                const href = this.$el.getAttribute("href");
                if (href) {
                    window.open(href, "_blank");
                }
            });
          }

    }
    

    updatePosition() {
        const { top, left, width, height } = this.$el.getBoundingClientRect();
      
        let x = left + width / 2;
        let y = top + height / 2;

        if (this.$el.classList.contains("projectImage")) {
            y = top + height / 2;
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
