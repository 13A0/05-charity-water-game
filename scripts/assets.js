import { assets, sounds } from "../data/assets.js";
export class AssetManager {
  constructor() {
    this.timers = new WeakMap();
    for (const a of Object.values(assets)) {
      for (const src of [
        a.src,
        ...(a.animation?.frames || []),
        a.animation?.sheet,
      ].filter(Boolean)) {
        const image = new Image();
        image.src = src;
      }
    }
  }
  mount(element, id) {
    const a = assets[id];
    element.style.backgroundImage = `url("${a.src}")`;
    element.dataset.asset = id;
  }
  animate(element, id) {
    const a = assets[id],
      anim = a.animation;
    if (!anim || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    clearInterval(this.timers.get(element));
    let frame = 0;
    const draw = () => {
      if (anim.frames) {
        element.style.backgroundImage = `url("${anim.frames[frame]}")`;
      } else {
        element.style.backgroundImage = `url("${anim.sheet}")`;
        element.style.backgroundSize = `${anim.columns * 100}% ${Math.ceil(anim.count / anim.columns) * 100}%`;
        const rows = Math.ceil(anim.count / anim.columns);
        element.style.backgroundPosition = `${anim.columns > 1 ? ((frame % anim.columns) / (anim.columns - 1)) * 100 : 0}% ${rows > 1 ? (Math.floor(frame / anim.columns) / (rows - 1)) * 100 : 0}%`;
      }
    };
    draw();
    const timer = setInterval(
      () => {
        frame++;
        if (frame >= (anim.frames?.length || anim.count)) {
          clearInterval(timer);
          element.style.backgroundSize = "";
          element.style.backgroundPosition = "";
          this.mount(element, id);
        } else draw();
      },
      1000 / (anim.fps || 12),
    );
    this.timers.set(element, timer);
  }
  src(id) {
    return assets[id]?.src;
  }
}
export class AudioManager {
  constructor() {
    this.enabled = false;
    this.clips = {};
    for (const [id, src] of Object.entries(sounds))
      if (src) {
        this.clips[id] = new Audio(src);
        this.clips[id].volume = id === "music" ? 0.15 : 0.3;
      }
    if (this.clips.music) this.clips.music.loop = true;
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.play("music");
    else this.clips.music?.pause();
    return this.enabled;
  }
  play(id) {
    if (!this.enabled || !this.clips[id]) return;
    const clip = this.clips[id];
    clip.currentTime = 0;
    clip.play().catch(() => {});
  }
}
