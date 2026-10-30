// Original, grid-aligned artwork. Run with node scripts/build-pixel-art.js.
import { mkdirSync, writeFileSync } from "node:fs";
const dir = new URL("../assets/pixel/", import.meta.url);
mkdirSync(dir, { recursive: true });
const rect = (x, y, w, h, c) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const path = (d, c) => `<path d="${d}" fill="${c}"/>`;
function save(name, w, h, body) {
  writeFileSync(
    new URL(`${name}.svg`, dir),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>`,
  );
}
function tree(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">${rect(14, 27, 5, 19, "#5b4937")}${path("M12 0h9v6h6v7h5v15h-5v7H5v-7H0V14h5V7h7Z", "#284f48")}${path("M12 2h8v6h6v7h-5v5H6v-7h5Z", "#497c57")}${rect(8, 22, 6, 3, "#68965a")}${rect(17, 30, 3, 13, "#887050")}</g>`;
}
let scene = rect(0, 0, 320, 200, "#9cd0cf");
scene +=
  rect(0, 54, 320, 26, "#b4d9cb") +
  rect(264, 18, 17, 17, "#fff0b0") +
  rect(260, 22, 25, 9, "#fff0b0");
for (const [x, y] of [
  [15, 22],
  [93, 11],
  [204, 34],
])
  scene += path(`M${x} ${y}h12v-4h18v4h9v5h8v5h-55v-5h8Z`, "#e6efe0");
scene += path(
  "M0 91V68h15v-8h20v-9h16v-9h19v9h15v12h24v9h21v-9h19v-13h15v-8h16v12h13v10h27v-9h18v-13h20v-8h20v12h15v12h17v16h20v17Z",
  "#7da9a2",
);
scene += path(
  "M0 103V84h22v-8h30v8h27v9h35v-7h23v-9h27v8h31v10h31v-8h21v-11h32v8h41v19Z",
  "#5d9381",
);
scene += rect(0, 103, 320, 97, "#86a667") + rect(0, 104, 320, 5, "#b5c982");
scene += path(
  "M203 103h18v12h-15v13h-17v15h-17v18h-15v17h-21v22H79v-18h35v-22h28v-21h24v-16h24v-12h13Z",
  "#497f87",
);
scene += path(
  "M205 104h11v9h-17v14h-18v15h-20v20h-24v18h-27v20H94v-17h28v-21h26v-21h23v-16h24v-13h10Z",
  "#76b6b3",
);
scene += path("M124 134h66v8h13v16h-10v7h-77v-8H98v-14h26Z", "#c5b17d");
scene += rect(130, 136, 52, 4, "#e0cd93") + rect(111, 153, 64, 4, "#af9569");
for (let i = 0; i < 100; i++) {
  const x = (i * 47 + 13) % 320,
    y = 111 + ((i * 19) % 89);
  if (x > 96 && x < 218) continue;
  scene += rect(x, y, 3, 2, i % 3 ? "#70925d" : "#abc179");
  if (i % 7 === 0) scene += rect(x, y - 3, 2, 3, "#f0d58a");
}
scene +=
  tree(9, 79, 1.1) +
  tree(45, 94, 0.8) +
  tree(285, 83, 1) +
  tree(-14, 113, 1.4) +
  tree(288, 126, 1.3);
scene +=
  rect(26, 164, 38, 4, "#566b4d") +
  rect(30, 158, 4, 16, "#cbb887") +
  rect(55, 158, 4, 16, "#cbb887") +
  rect(26, 161, 38, 3, "#ead59c");
save("landscape", 320, 200, scene);
let village = "";
for (const [x, y] of [
  [3, 20],
  [46, 2],
  [75, 35],
]) {
  village +=
    rect(x + 5, y + 21, 32, 26, "#e2cf9d") +
    rect(x + 5, y + 43, 32, 4, "#a98c67") +
    path(
      `M${x} ${y + 22}v-5h5v-5h5V${y + 7}h5V${y + 2}h12v5h5v5h5v5h5v5Z`,
      "#80554c",
    ) +
    rect(x + 9, y + 17, 25, 4, "#bb795a") +
    rect(x + 18, y + 29, 9, 18, "#534c47") +
    rect(x + 8, y + 28, 6, 8, "#567a76") +
    rect(x + 29, y + 28, 6, 8, "#f6df98");
}
save("village", 120, 90, village);
for (let f = 0; f < 4; f++) {
  let p =
    rect(17, 75, 65, 5, "#607257") +
    rect(24, 69, 48, 7, "#727d72") +
    rect(29, 65, 39, 5, "#b8c1a1") +
    rect(36, 23, 16, 43, "#263f48") +
    rect(39, 25, 10, 39, "#4c7c7b") +
    rect(40, 27, 3, 35, "#83b1a0") +
    rect(32, 59, 24, 7, "#263f48") +
    rect(36, 59, 15, 3, "#67908a") +
    rect(33, 20, 23, 9, "#263f48") +
    rect(36, 20, 17, 4, "#92bba4") +
    rect(49, 30, 18, 8, "#263f48") +
    rect(62, 34, 7, 10, "#263f48") +
    rect(50, 31, 15, 3, "#82b5a6") +
    rect(38, 13, 10, 7, "#263f48");
  const dy = [0, 6, 11, 5][f];
  p +=
    path(`M42 14h10v${3 + dy}h23v5H49v-${3 + dy}h-7Z`, "#263f48") +
    rect(69, 16 + dy, 15, 7, "#d3ab69") +
    rect(71, 16 + dy, 11, 3, "#f5d38b") +
    rect(41, 16, 4, 4, "#d8d6ae");
  save(`pump-${f}`, 100, 88, p);
}
save(
  "can",
  24,
  30,
  rect(5, 0, 13, 3, "#594d3e") +
    rect(3, 2, 4, 7, "#594d3e") +
    rect(16, 2, 4, 7, "#594d3e") +
    rect(2, 8, 21, 20, "#765b33") +
    rect(0, 10, 21, 16, "#eab94d") +
    rect(3, 8, 15, 3, "#ffe19a") +
    rect(3, 12, 3, 12, "#ffda73") +
    path("M9 13h3v3h3v3h-3v3H9v-3H6v-3h3Z", "#bc883b") +
    rect(16, 4, 6, 5, "#f6ce68"),
);
save(
  "water",
  12,
  30,
  rect(3, 0, 4, 9, "#bce9e1") +
    rect(4, 12, 4, 6, "#d9f6e5") +
    rect(2, 21, 3, 5, "#bce9e1") +
    rect(8, 25, 3, 3, "#ecf4dc"),
);
const icons = {
  handle:
    rect(8, 8, 5, 19, "#75948b") +
    rect(11, 5, 17, 5, "#d5b472") +
    rect(22, 5, 7, 7, "#f6d584") +
    rect(6, 25, 14, 4, "#b5c1a1"),
  solar:
    rect(5, 6, 24, 17, "#364e67") +
    rect(7, 8, 20, 13, "#659daa") +
    path("M13 8h2v13h-2ZM21 8h2v13h-2ZM7 13h20v2H7Z", "#abcbd1") +
    rect(15, 23, 4, 5, "#bcaa80") +
    rect(9, 28, 17, 3, "#d5c49a"),
  filter:
    rect(10, 4, 15, 25, "#4b777a") +
    rect(12, 7, 11, 18, "#b7d6b6") +
    rect(10, 12, 15, 4, "#e6ce8b") +
    rect(10, 21, 15, 4, "#e6ce8b") +
    rect(14, 2, 7, 3, "#354b53"),
  crew:
    rect(13, 4, 9, 9, "#dfbd8b") +
    rect(12, 3, 11, 4, "#7b5745") +
    rect(10, 14, 15, 13, "#d6ab54") +
    rect(12, 27, 5, 5, "#5b6459") +
    rect(20, 27, 5, 5, "#5b6459") +
    rect(5, 15, 5, 9, "#dfbd8b") +
    rect(25, 15, 5, 9, "#dfbd8b"),
  battery:
    rect(12, 2, 11, 4, "#adc0aa") +
    rect(8, 6, 19, 24, "#486c61") +
    rect(11, 9, 13, 18, "#86b978") +
    path("M18 10h4l-4 7h4l-8 9 2-8h-4Z", "#ffe09a"),
};
for (const [name, art] of Object.entries(icons)) save(name, 36, 36, art);
