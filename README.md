# 🏎️ APEX VELOCITY 3D - Pro Arcade Racing Championship

> 🌐 **Live Demo (Play Online):** [https://icoderandomly.github.io/APEX-VELOCITY-3D/](https://icoderandomly.github.io/APEX-VELOCITY-3D/)

A fast-paced 3D circuit racing game built with **Three.js, HTML5, and CSS3**. Experience arcade physics with momentum, high-speed drifting, dynamic lighting, intelligent AI opponents, procedural sports cars, a 3D undulating race track, procedural Web Audio sound synthesis, and a racing HUD.

---

## 🚀 How to Play

### Option 1: Play in Browser (Instant)
- Visit the live site: **[https://icoderandomly.github.io/APEX-VELOCITY-3D/](https://icoderandomly.github.io/APEX-VELOCITY-3D/)**

### Option 2: Live Local Dev Server
1. Double-click `start.bat` **OR** run in terminal:
   ```bash
   npm run dev
   ```
2. Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### Option 2: Direct Offline / Browser Play
- Simply double-click **`play.html`** in Windows Explorer to play directly in Chrome, Edge, Brave, or Firefox without any server required!

---

## 🎮 Controls

| Key | Action |
| :--- | :--- |
| **`W`** / **`↑`** | **Accelerate** forward |
| **`S`** / **`↓`** | **Brake** / Reverse |
| **`A`** / **`←`** | **Steer Left** |
| **`D`** / **`→`** | **Steer Right** |
| **`SPACE`** | **Handbrake / Drift** (cuts traction for tight corner power-slides) |
| **`R`** | **Reset Car** to nearest track centerline facing forward |
| **`ESC`** / **`P`** | **Pause Game** / Open Options Menu |

---

## 🏆 Key Features

- **Procedural GT Supercars**:
  - Detailed aerodynamic chassis, cockpit canopy, GT rear wing/spoiler, front splitter, quad chrome exhaust pipes.
  - 4 animated wheels with treaded rubber tires, alloy rims, and disc calipers that roll with speed and turn with steering.
  - Working dual headlights with projector light cones.
  - Glowing red LED brake lights that ignite dynamically when braking or reversing.
  - 5 distinct driver teams with custom liveries (Crimson Flagship, Viper Blue, Phantom Green, Solar Gold, Shadow Violet).
- **Arcade Physics & Drifting**:
  - Smooth acceleration curves, progressive steering attenuation at high speeds, and momentum.
  - Lateral tire slip model: tap Handbrake (`Space`) or steer hard into curves to slide with tire smoke and skid audio!
  - Armco steel guardrail collision detection with elastic bounce, speed reduction, sparks, and screen impact flash.
- **3D Undulating Circuit**:
  - Catmull-Rom spline track with vertical elevation changes (sweeping uphill turns, crests, and chicanes).
  - Asphalt roadway with dashed centerline and red/white corner rumble curbs.
  - Checkered start/finish line and overhead gantry with working starting light sequence (Red 3.. Red 2.. Red 1.. GREEN!).
  - Scenery including spectator grandstands, sponsor billboards, pine trees, and trackside lamp posts.
- **4 AI Competitors**:
  - Waypoint pathfinding along the track spline with lookahead target navigation.
  - Distinct driver personalities with variable top speeds and dynamic braking into sharp turns.
- **Synthesized Web Audio API**:
  - 100% procedural sound synthesis — zero external MP3/WAV files to fail or load slowly!
  - Harmonic engine rumble with pitch modulation scaling with RPM and speed.
  - Tire screech white noise bandpass filter during drifts.
  - Collision punch crash sound and starting countdown beeps.
  - Victory finish fanfare.
- **Modern Racing HUD**:
  - Analog + Digital Speedometer gauge with gear indicator (`GEAR 1` to `GEAR 5` and `GEAR R`).
  - 2D Radar Mini-Map tracking player and AI positions in real time.
  - Live race position badge (`1st`, `2nd`, etc.), lap counter (`1/3`), and race timer.
  - Speed lines screen effect at speeds > 150 km/h.
  - Race results screen with leaderboard, lap times, and restart button.

---

## 📁 Project Structure

```
├── index.html           # Main Vite application shell & HUD
├── play.html            # Standalone double-clickable direct launcher
├── start.bat            # Windows one-click start script
├── package.json         # Vite and Three.js configurations
├── vite.config.js       # Relative path bundler config
├── src/
│   ├── style.css        # Glassmorphism dark-mode racing HUD styles
│   ├── main.js          # Three.js scene, lighting, loop & game orchestration
│   ├── track.js         # 3D circuit geometry, asphalt, curbs, barriers & scenery
│   ├── car.js           # Procedural 3D GT sports car model & visuals
│   ├── physics.js       # Vehicle dynamics, drift mechanics & barrier collisions
│   ├── ai.js            # AI opponent spline navigation & speed controllers
│   ├── audio.js         # Web Audio API procedural sound synthesizer
│   ├── camera.js        # Third-person spring chase camera & collision shake
│   ├── particles.js     # Tire drift smoke puffs & collision sparks
│   ├── ui.js            # HUD updates, speedometer gauge & results leaderboard
│   └── standalone.js    # Self-contained bundle for play.html
└── dist/                # Production distribution bundle
```
