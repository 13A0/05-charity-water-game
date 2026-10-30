// Original pixel artwork; swap assets through this manifest. Audio remains replaceable.
export const assets = {
  landscape: { src: "assets/pixel/landscape.svg" },
  village: { src: "assets/pixel/village.svg" },
  water: { src: "assets/pixel/water.svg" },
  pump: {
    src: "assets/pixel/pump-0.svg",
    animation: {
      frames: [
        "assets/pixel/pump-0.svg",
        "assets/pixel/pump-1.svg",
        "assets/pixel/pump-2.svg",
        "assets/pixel/pump-3.svg",
      ],
      fps: 16,
    },
  },
  handle: { src: "assets/pixel/handle.svg" },
  solar: { src: "assets/pixel/solar.svg" },
  filter: { src: "assets/pixel/filter.svg" },
  crew: { src: "assets/pixel/crew.svg" },
  battery: { src: "assets/pixel/battery.svg" },
  can: { src: "assets/pixel/can.svg" },
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
