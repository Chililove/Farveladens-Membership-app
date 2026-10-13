// Paint splashes behind the whole app. Farveladen is a colour shop, so light
// mode looks like paper someone has flicked paint at, and dark mode
// like the same splashes in glow-in-the-dark UV paint.
//
// Each splash has a light and a dark colour; globals.css picks one and adds
// the glow in dark mode. Purely decorative: aria-hidden, no pointer events,
// and placed at the edges so it sits in the margins on desktop. On phones
// globals.css fades it back.

// Organic blob shapes with a few loose droplets each, drawn in a 200x200 box.
const SHAPES: Record<string, { body: string; drops: [number, number, number][] }> = {
  s3: {
    body:
      "M160.6 96.2C163.8 107.0 174.6 125.5 171.5 136.7C168.5 147.8 151.5 157.2 142.3 162.9C133.2 168.6 125.6 174.1 116.7 170.8C107.8 167.5 98.3 147.6 88.7 143.0C79.0 138.4 63.1 147.8 58.7 143.3C54.3 138.9 68.3 123.7 62.4 116.2C56.6 108.7 27.4 105.9 23.5 98.3C19.5 90.8 33.3 81.0 38.6 70.9C44.0 60.9 46.8 42.5 55.6 38.0C64.4 33.5 81.1 42.5 91.4 44.0C101.7 45.6 109.2 44.4 117.3 47.1C125.3 49.8 134.0 56.1 139.8 60.2C145.6 64.3 148.6 65.8 152.0 71.8C155.5 77.8 157.4 85.4 160.6 96.2Z",
    drops: [[13.2, 89.0, 4.1], [42.0, 154.8, 4.7], [30.7, 68.1, 7.8], [70.0, 25.8, 7.0], [25.4, 52.0, 7.2]],
  },
  s11: {
    body:
      "M161.4 99.3C159.5 109.6 157.1 117.9 153.6 125.3C150.1 132.6 148.3 140.8 140.4 143.5C132.6 146.2 114.7 137.1 106.5 141.7C98.2 146.3 99.1 166.9 91.0 171.1C82.9 175.3 68.6 173.1 57.9 166.6C47.2 160.1 28.8 143.1 26.8 132.0C24.8 120.8 43.0 108.1 46.1 99.6C49.3 91.1 42.4 89.3 45.8 81.1C49.2 72.9 60.1 57.9 66.7 50.4C73.3 42.9 77.6 40.8 85.4 36.0C93.2 31.3 103.4 19.3 113.5 21.7C123.7 24.2 137.7 43.9 146.2 50.9C154.8 57.8 162.2 55.4 164.7 63.5C167.2 71.6 163.2 89.0 161.4 99.3Z",
    drops: [[74.0, 14.7, 8.4], [152.4, 37.0, 5.4], [88.9, 177.2, 7.0], [189.0, 74.1, 6.4], [30.4, 63.7, 5.3]],
  },
  s19: {
    body:
      "M170.6 103.0C172.3 110.1 154.3 116.9 149.0 123.8C143.8 130.7 144.3 137.5 139.0 144.2C133.8 150.9 126.3 158.6 117.5 164.1C108.6 169.7 94.7 179.6 86.0 177.2C77.4 174.9 74.3 158.3 65.7 150.0C57.0 141.7 39.6 134.6 34.0 127.3C28.4 120.1 36.2 117.9 32.0 106.6C27.9 95.2 4.4 69.9 9.1 59.0C13.8 48.1 48.1 44.0 60.4 41.2C72.6 38.3 72.3 44.4 82.7 41.7C93.1 39.1 111.5 28.6 122.9 25.2C134.3 21.9 148.4 12.5 151.1 21.8C153.7 31.1 135.6 67.5 138.9 81.1C142.1 94.6 168.9 95.9 170.6 103.0Z",
    drops: [[186.7, 108.9, 6.5], [129.9, 25.0, 6.0], [92.3, 189.2, 7.5], [183.1, 79.7, 7.1], [103.1, 10.9, 7.5], [176.5, 119.2, 7.9]],
  },
  s27: {
    body:
      "M167.2 102.4C155.7 114.8 143.5 108.7 138.1 115.0C132.8 121.4 137.7 131.0 135.1 140.6C132.5 150.1 129.8 166.6 122.4 172.4C115.0 178.2 101.1 177.4 90.8 175.6C80.5 173.7 69.1 169.7 60.6 161.3C52.0 152.8 46.0 133.6 39.5 124.9C33.1 116.3 21.8 117.3 22.1 109.2C22.4 101.0 34.9 86.4 41.2 75.9C47.5 65.3 53.0 50.5 60.0 45.9C66.9 41.3 72.6 51.6 82.8 48.3C93.1 45.1 113.9 23.7 121.5 26.4C129.1 29.1 114.2 62.4 128.5 64.8C142.8 67.2 200.6 34.5 207.0 40.8C213.5 47.1 178.6 90.0 167.2 102.4Z",
    drops: [[187.4, 123.2, 5.8], [37.3, 43.8, 5.7], [12.4, 71.1, 5.8], [44.3, 42.3, 5.8], [10.2, 116.9, 6.6], [186.6, 80.4, 4.4]],
  },
  s42: {
    body:
      "M151.7 101.7C152.5 112.1 158.0 123.6 157.9 132.1C157.8 140.5 158.7 148.6 151.1 152.5C143.6 156.4 122.9 156.6 112.6 155.5C102.2 154.4 95.4 150.6 89.0 146.1C82.5 141.5 84.3 130.7 73.8 128.3C63.3 125.8 32.2 135.7 26.0 131.4C19.8 127.1 35.0 113.2 36.7 102.5C38.4 91.8 33.8 78.1 36.3 67.4C38.8 56.7 43.6 44.6 51.6 38.3C59.7 31.9 73.5 28.7 84.8 29.1C96.0 29.6 111.1 37.6 119.0 40.9C127.0 44.1 126.8 43.8 132.5 48.7C138.2 53.5 150.1 61.1 153.3 70.0C156.5 78.8 151.0 91.4 151.7 101.7Z",
    drops: [[48.3, 26.0, 4.8], [121.2, 178.5, 5.7], [143.8, 28.1, 8.6], [139.4, 175.5, 7.8], [36.0, 51.4, 3.9], [187.9, 103.0, 4.5]],
  },
};

type Splash = {
  shape: keyof typeof SHAPES;
  light: string; // soft colour, on paper
  dark: string; // neon, glows on black
  position: React.CSSProperties;
  width: string;
  rotate: string;
  delayMs: number;
};

// The forening's palette (rytmiskfarveladeforening.netlify.app), softened for
// light mode and neon for dark: bær, sol, rytme, lagune and violet.
const SPLASHES: Splash[] = [
  { shape: "s27", light: "#EF7CB0", dark: "#FF2D95", position: {left: "-190px", top: "26%"}, width: "min(390px, 62vw)", rotate: "-10deg", delayMs: 0 }, // bær
  { shape: "s3", light: "#FFD66D", dark: "#FFE600", position: {left: "40%", top: "-170px"}, width: "min(240px, 40vw)", rotate: "30deg", delayMs: 90 }, // sol
  { shape: "s42", light: "#FF957D", dark: "#FF5A36", position: {right: "40px", top: "-70px"}, width: "min(160px, 30vw)", rotate: "15deg", delayMs: 160 }, // rytme
  { shape: "s19", light: "#A58FFF", dark: "#9B7BFF", position: {right: "-140px", top: "22%"}, width: "min(380px, 55vw)", rotate: "160deg", delayMs: 230 }, // violet
  { shape: "s11", light: "#65C1B7", dark: "#19E3CF", position: {left: "-120px", bottom: "-90px"}, width: "min(360px, 55vw)", rotate: "80deg", delayMs: 300 }, // lagune
  { shape: "s3", light: "#FF957D", dark: "#FF5A36", position: {right: "-90px", bottom: "-120px"}, width: "min(330px, 50vw)", rotate: "200deg", delayMs: 370 }, // rytme
  { shape: "s42", light: "#FFD66D", dark: "#FFE600", position: {left: "6%", bottom: "24%"}, width: "min(110px, 18vw)", rotate: "-40deg", delayMs: 440 }, // sol, small
];

export default function PaintSplashes() {
  return (
    <div
      aria-hidden="true"
      className="paint-splashes pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {SPLASHES.map((splash, i) => {
        const shape = SHAPES[splash.shape];
        return (
          <svg
            key={i}
            viewBox="0 0 200 200"
            className="paint-splash absolute"
            style={
              {
                ...splash.position,
                width: splash.width,
                "--paint-light": splash.light,
                "--paint-dark": splash.dark,
                "--splash-rotate": `rotate(${splash.rotate})`,
                "--splash-delay": `${splash.delayMs}ms`,
              } as React.CSSProperties
            }
          >
            <g className="paint-splash-fill">
              <path d={shape.body} />
              {shape.drops.map(([cx, cy, r], j) => (
                <circle key={j} cx={cx} cy={cy} r={r} />
              ))}
            </g>
          </svg>
        );
      })}
    </div>
  );
}
