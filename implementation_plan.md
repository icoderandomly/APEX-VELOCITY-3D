# Implementation Plan - Complete 3D Car Racing Game

Build an arcade-style 3D car racing game for the web using Three.js, HTML, and CSS. The game features a third-person chase camera, realistic arcade momentum and drifting physics, procedural sports car models, an undulating 3D track with checkpoints and scenery, 4 AI competitors, audio synthesis via the Web Audio API, and a racing HUD with a mini-map, speedometer, lap times, and countdown.

## User Review Required

> [!IMPORTANT]
> The game will be built using a clean Vite + Three.js structure.
> - No external 3D models or audio assets are needed: all car models, track features, scenery, and sound effects (engine RPM, tire screech, crash thud, countdown beeps) will be generated procedurally. This guarantees zero broken asset links and instant loading.
> - The game runs seamlessly via `npm run dev` and will also have a production build in `./dist` for direct static serving.

## Proposed Architecture & File Structure

```
├── index.html                 # Racing HUD, Mini-Map, Countdown, Menus, Modals
├── package.json               # Vite + Three.js dependencies
├── vite.config.js             # Vite configuration with relative base './'
├── src/
│   ├── style.css              # Glassmorphism dark-mode HUD styling & gauges
│   ├── main.js                # Game manager, loop, state machine, scene setup
│   ├── audio.js               # Web Audio API procedural sound synthesizer
│   ├── physics.js             # Vehicle dynamics, drift physics, ray/boundary collisions
│   ├── car.js                 # Procedural sports car 3D model & visual animations
│   ├── track.js               # 3D circuit spline, road mesh, curbs, barriers, scenery
│   ├── ai.js                  # AI opponent controller, waypoint spline navigation
│   ├── particles.js           # Tire smoke, collision sparks, speed lines
│   ├── camera.js              # Third-person spring chase camera & collision shake
│   └── ui.js                  # HUD updates, speedometer, mini-map, countdown, results
```

---

## Proposed Changes

### Project Setup & Tooling

#### [NEW] [package.json](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/package.json)
- Set up Vite, Three.js (`three`), and standard scripts (`dev`, `build`, `preview`).

#### [NEW] [vite.config.js](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/vite.config.js)
- Configure relative asset paths for easy deployment and local testing.

---

### Core Gameplay & Graphics

#### [NEW] [src/audio.js](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/src/audio.js)
- Procedural audio engine using Web Audio API:
  - **Engine sound**: Multi-oscillator engine with pitch modulation tied to car RPM/speed, harmonic distortion, and throttle response.
  - **Tire screech**: Filtered noise generator activated dynamically during drifts and hard braking.
  - **Collision sound**: Low-frequency resonant punch + white-noise crunch for impacts.
  - **Countdown beeps**: Pitch-shifted synth tones (low for 3-2-1, high for GO!).
  - **Finish fanfare**: Victory jingle when crossing the finish line.
  - User audio toggle / mute control.

#### [NEW] [src/track.js](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/src/track.js)
- 3D circuit generation based on a closed Catmull-Rom spline with gentle vertical undulations.
- Road geometry with extruded custom asphalt surface, dashed center stripe, corner rumble curbs (red & white), and start/finish line.
- Checkpoints placed along the spline for progress tracking, lap counting, and AI navigation.
- Environment scenery:
  - Outer and inner guardrail barriers with collision response.
  - Procedural trees, lamp posts with point lights, spectator grandstands, billboards, and starting gantry with race lights.
  - Atmospheric sky dome with horizon gradient and directional sunlight casting realistic shadows.

#### [NEW] [src/car.js](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/src/car.js)
- **Detailed Procedural Sports Car**:
  - Sculpted aerodynamic chassis (cockpit, hood scoop, side skirts, rear diffuser, GT spoiler).
  - 4 detailed wheels with treaded rubber tires, metallic multi-spoke rims, and brake calipers.
  - Dual working headlights with projection light cones and glowing front lenses.
  - Glowing red brake lights that intensify when braking/reversing.
  - Quad chrome exhaust pipes.
  - Color customizations: Player has a flagship metallic crimson racer; 4 AI opponents have distinct team liveries (Cobalt Blue, Acid Green, Sunburst Gold, Violet Phantom).
  - Wheel rotation and steering angle animations based on speed and steer input.

#### [NEW] [src/physics.js](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/src/physics.js)
- Arcade physics engine:
  - Acceleration, reverse, top speed, braking force, and coasting rolling resistance.
  - Dynamic steering with high-speed steer attenuation to prevent erratic snap-turns.
  - Lateral tire slip / drift mechanics: Handbrake (`Space`) or hard steering at speed breaks traction, generating controllable slide angle and tire smoke.
  - Track boundary collision: Elastic rebound against guardrails with speed reduction and impact impulse.
  - AI car to player car collision handling.
  - Car reset functionality (`R` key) to safely place car back on the track facing forward.

#### [NEW] [src/ai.js](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/src/ai.js)
- AI Opponents (3–4 cars):
  - Spline pathfinding with lookahead target points.
  - Dynamic speed profiles: AI cars brake smoothly into sharp curves and accelerate on straights.
  - Distinct driver profiles (Aggressive, Balanced, Cautious) with varied top speeds, lane offsets, and overtaking behavior.
  - Lap and checkpoint progression tracking matching player rules.

#### [NEW] [src/particles.js](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/src/particles.js)
- Particle system for visual flair:
  - Tire drift smoke (billowing puffs from rear tires during slides).
  - Barrier impact sparks.
  - High-speed radial speed lines overlay.

#### [NEW] [src/camera.js](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/src/camera.js)
- Smooth third-person chase camera:
  - Lerped position and look-at target behind player car.
  - Dynamic FOV expansion at top speed for speed perception.
  - Camera shake impulse triggered on collisions.

#### [NEW] [src/ui.js](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/src/ui.js) & [src/style.css](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/src/style.css)
- Sleek modern racing HUD:
  - **Speedometer**: Circular analog gauge with needle + digital KM/H readout + current gear indicator.
  - **Mini-Map**: 2D track overview showing player and AI positions in real time.
  - **Lap Counter**: Current lap (e.g. `1 / 3`), current lap time, and best lap time.
  - **Position Indicator**: Live race position badge (e.g. `1st`, `2nd`, `3rd`, etc.).
  - **Countdown**: 3D/2D animated countdown (`3... 2... 1... GO!`).
  - **Start Screen**: Controls guide, difficulty/mode selector, and "Start Race" button.
  - **Race Finished Screen**: Podium / finish banner, final leaderboard table, lap times, and "Restart Race" button.
  - **Pause Menu**: (`ESC` key) Resume, Restart, Audio toggle.

#### [NEW] [src/main.js](file:///c:/Users/gamin/OneDrive/Documents/New%20folder/src/main.js)
- Orchestration of Three.js renderer, scene, lights, clock, and state transitions (Intro, Countdown, Racing, Finished, Paused).

---

## Verification Plan

### Automated / Build Verification
- Install dependencies: `npm.cmd install`
- Run dev server: `npm.cmd run dev`
- Run production build: `npm.cmd run build` to ensure zero compilation or bundle errors.

### Browser Testing with `browser_subagent`
- Open dev server URL (`http://localhost:5173`) in browser.
- Verify:
  1. Scene loads with 3D environment, track, lighting, player car, and AI cars.
  2. Start button triggers countdown (3, 2, 1, GO) and audio initialization.
  3. Car controls respond to W/A/S/D / arrow keys.
  4. Car accelerates, turns, brakes, drifts, and collides with track boundaries.
  5. Reset key (`R`) teleports car back to nearest track centerline.
  6. AI cars navigate the track smoothly and compete for position.
  7. Checkpoints detect track progress and increment laps correctly.
  8. HUD updates speed, lap, position, and mini-map markers.
  9. Race finishes after 3 laps and displays the final results screen.
  10. Restart button cleanly resets the race for another run.
