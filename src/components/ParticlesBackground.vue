<template>
  <canvas ref="canvas" class="particles-canvas"></canvas>
</template>

<script>
export default {
  name: 'ParticlesBackground',
  props: {
    color: {
      type: String,
      default: '#ffffff'
    },
    lineColor: {
      type: String,
      default: 'rgba(255, 255, 255, 0.2)'
    },
    particleCount: {
      type: Number,
      default: 250 // Signficantly denser as requested
    }
  },
  data() {
    return {
      particles: [],
      ctx: null,
      width: 0,
      height: 0,
      animationFrame: null,
      mouse: {
        x: null,
        y: null,
        radius: 200 // Larger interaction radius
      }
    };
  },
  mounted() {
    this.initCanvas();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.handleMouseMove);
    this.animate();
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
    cancelAnimationFrame(this.animationFrame);
  },
  methods: {
    initCanvas() {
      const canvas = this.$refs.canvas;
      this.ctx = canvas.getContext('2d');
      this.handleResize();
      
      this.particles = [];
      for (let i = 0; i < this.particleCount; i++) {
        this.particles.push(this.createParticle());
      }
    },
    createParticle() {
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 1.0,
        vy: (Math.random() - 0.5) * 1.0,
        size: Math.random() * 2 + 2, // Larger nodes as requested (roughly 2.5px to 6px)
        baseSize: 0
      };
    },
    handleResize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.$refs.canvas.width = this.width;
      this.$refs.canvas.height = this.height;
    },
    handleMouseMove(e) {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    },
    draw() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        
        // Repulsion Logic (Separation Effect)
        if (this.mouse.x != null) {
          const dx = p.x - this.mouse.x;
          const dy = p.y - this.mouse.y;
          const distance = Math.hypot(dx, dy);
          
          if (distance < this.mouse.radius) {
            const force = (this.mouse.radius - distance) / this.mouse.radius;
            const forceX = (dx / distance) * force * 12;
            const forceY = (dy / distance) * force * 12;
            
            p.x += forceX;
            p.y += forceY;
          }
        }

        // Move
        p.x += p.vx;
        p.y += p.vy;
        
        // Wrap
        if (p.x < 0) p.x = this.width;
        else if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        else if (p.y > this.height) p.y = 0;
        
        // Draw Particle
        this.ctx.fillStyle = this.color;
        this.ctx.globalAlpha = 0.8;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = this.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0; // Reset shadow for lines
        
        // Lines
        for (let j = i + 1; j < this.particles.length; j++) {
          const p2 = this.particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          
          if (dist < 150) { 
            this.ctx.strokeStyle = this.color;
            this.ctx.globalAlpha = (1 - dist / 150) * 0.45; 
            this.ctx.lineWidth = 1.2; // Thicker lines as requested (was 0.7)
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
          }
        }
      }
      this.ctx.globalAlpha = 1;
    },
    animate() {
      this.draw();
      this.animationFrame = requestAnimationFrame(this.animate);
    }
  }
};
</script>

<style scoped>
.particles-canvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
  pointer-events: none;
}
</style>
