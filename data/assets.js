// Replace only this manifest to use your own artwork. All current artwork/audio is placeholder.
export const assets = {
  landscape: { src: "assets/placeholders/landscape.svg" },
  village: { src: "assets/placeholders/village.svg" },
  water: { src: "assets/placeholders/water.svg" },
  pump: {
    src: "assets/placeholders/pump-0.svg",
    animation: {
      frames: [
        "assets/placeholders/pump-0.svg",
        "assets/placeholders/pump-1.svg",
        "assets/placeholders/pump-2.svg",
        "assets/placeholders/pump-3.svg",
      ],
      fps: 16,
    },
  },
  handle: { src: "assets/placeholders/handle.svg" },
  solar: { src: "assets/placeholders/solar.svg" },
  filter: { src: "assets/placeholders/filter.svg" },
  crew: { src: "assets/placeholders/crew.svg" },
  battery: { src: "assets/placeholders/battery.svg" },
  can: { src: "img/water-can-transparent.png" },
};
// Sprite-sheet alternative: animation:{sheet:'assets/pump.png',frameWidth:400,frameHeight:350,count:4,columns:4,fps:16}
export const sounds = {
  pump: "assets/audio/pump.wav",
  purchase: "assets/audio/purchase.wav",
  milestone: "assets/audio/milestone.wav",
  complete: "assets/audio/complete.wav",
  ui: "assets/audio/ui.wav",
  music: null,
};
