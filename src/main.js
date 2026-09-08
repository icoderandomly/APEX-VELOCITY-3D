// ============================================================================
// APEX VELOCITY 3D - Main Game Entry & Orchestration Loop
// Ties together Three.js rendering, physics, AI opponents, audio, and racing UI
// ============================================================================

import * as THREE from 'three';
import { Track } from './track.js';
import { CarModel } from './car.js';
import { CarPhysics } from './physics.js';
import { AIController } from './ai.js';
import { SoundManager } from './audio.js';
import { ParticleSystem } from './particles.js';
import { ChaseCamera } from './camera.js';
import { UIManager } from './ui.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.gameState = 'MENU'; // MENU, COUNTDOWN, RACING, PAUSED, FINISHED

    // Time & Clocks
    this.clock = new THREE.Clock();
    this.raceStartTime = 0;
    this.raceElapsedTime = 0;
    this.currentLapStartTime = 0;
    this.bestLapTime = Infinity;
    this.countdownTimer = 0;
    this.countdownStep = 3;

    // Input States
    this.input = {
      accel: false,
      brake: false,
      left: false,
      right: false,
      handbrake: false,
      reset: false
    };

    this.initGraphics();
    this.initWorld();
    this.initAudioAndUI();
    this.bindInputs();

    // Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initGraphics() {
    // Scene setup with atmospheric daytime sky
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x284b75);
    this.scene.fog = new THREE.FogExp2(0x325682, 0.0011);

    // Perspective Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 1200);
    this.chaseCamera = new ChaseCamera(this.camera);

    // WebGL Renderer with High-End Lighting & Shadows
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // Atmospheric Outdoor Sunlight
    const ambientLight = new THREE.AmbientLight(0xfffaea, 0.7);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x90c8ff, 0x224822, 0.75);
    this.scene.add(hemiLight);

    // Directional Sunlight aligned with Sun in sky
    this.sunLight = new THREE.DirectionalLight(0xfff3d6, 2.2);
    this.sunLight.position.set(380, 240, -420);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 20;
    this.sunLight.shadow.camera.far = 900;
    const shadowD = 180;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Radiant Sun Sky Dome with Golden Horizon Gradient
    const skyGeo = new THREE.SphereGeometry(850, 32, 24);
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 128;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext('2d');
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#103058');    // Zenith: Deep Azure
    skyGrad.addColorStop(0.5, '#2b66a8');  // Upper: Vibrant Sky Blue
    skyGrad.addColorStop(0.72, '#d9944a'); // Lower: Golden Sunset/Sunrise glow
    skyGrad.addColorStop(1, '#ffbe73');    // Horizon: Radiant Sun Haze
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 128, 256);

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initWorld() {
    // 1. 3D Track & Environment
    this.track = new Track(this.scene);

    // 2. Particle Effects System
    this.particles = new ParticleSystem(this.scene);

    // 3. Player Flagship Car (Apex Crimson)
    this.playerModel = new CarModel({
      name: 'Player 1',
      primaryColor: 0xe6194b,
      isPlayer: true
    });
    this.scene.add(this.playerModel.group);
    this.playerPhysics = new CarPhysics(this.playerModel, this.track, true);

    // 4. AI Opponents Controller
    this.aiController = new AIController(this.scene, this.track);

    // Position all cars at Starting Grid
    this.resetGridPositions();
  }

  resetGridPositions() {
    // Start grid: Player at Pole Position (Grid 1)
    const polePt = this.track.spline.getPointAt(0);
    const poleTangent = this.track.spline.getTangentAt(0).normalize();
    const poleNormal = new THREE.Vector3().crossVectors(poleTangent, new THREE.Vector3(0, 1, 0)).normalize();

    const playerStartPos = polePt.clone().addScaledVector(poleNormal, -2.5);
    this.playerPhysics.reset(playerStartPos, poleTangent, 1);
    this.chaseCamera.reset(this.playerPhysics.position, this.playerPhysics.yaw);

    // Reset AI cars to Grid 2, 3, 4, 5
    this.aiController.resetGrid();
    this.track.setSignalLights('off');
  }

  initAudioAndUI() {
    this.soundManager = new SoundManager();
    this.ui = new UIManager(this.track, this.soundManager);

    // Bind UI Buttons
    this.ui.btnStart.addEventListener('click', () => {
      this.soundManager.resume();
      this.startCountdown();
    });

    this.ui.btnToggleAudio.addEventListener('click', () => {
      const isMuted = this.soundManager.toggleMute();
      const txt = isMuted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
      this.ui.btnToggleAudio.textContent = txt;
      if (this.ui.btnPauseSound) this.ui.btnPauseSound.textContent = txt;
    });

    if (this.ui.btnPauseSound) {
      this.ui.btnPauseSound.addEventListener('click', () => {
        const isMuted = this.soundManager.toggleMute();
        const txt = isMuted ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
        this.ui.btnToggleAudio.textContent = txt;
        this.ui.btnPauseSound.textContent = txt;
      });
    }

    this.ui.btnResume.addEventListener('click', () => {
      this.resumeGame();
    });

    this.ui.btnPauseRestart.addEventListener('click', () => {
      this.restartRace();
    });

    this.ui.btnRestart.addEventListener('click', () => {
      this.restartRace();
    });
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.handleKey(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.handleKey(e.code, false);
    });
  }

  handleKey(code, isDown) {
    // Global Pause Key
    if (isDown && (code === 'Escape' || code === 'KeyP')) {
      if (this.gameState === 'RACING') {
        this.pauseGame();
      } else if (this.gameState === 'PAUSED') {
        this.resumeGame();
      }
      return;
    }

    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.accel = isDown;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.brake = isDown;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = isDown;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = isDown;
        break;
      case 'Space':
        this.input.handbrake = isDown;
        break;
      case 'KeyR':
        this.input.reset = isDown;
        break;
    }
  }

  startCountdown() {
    this.gameState = 'COUNTDOWN';
    this.countdownStep = 3;
    this.resetGridPositions();
    this.ui.reset();
    this.ui.showHUD();

    this.track.setSignalLights('3');
    this.ui.showCountdown(3);
    this.soundManager.playCountdown(3);

    const stepInterval = setInterval(() => {
      this.countdownStep--;
      if (this.countdownStep === 2) {
        this.track.setSignalLights('2');
        this.ui.showCountdown(2);
        this.soundManager.playCountdown(2);
      } else if (this.countdownStep === 1) {
        this.track.setSignalLights('1');
        this.ui.showCountdown(1);
        this.soundManager.playCountdown(1);
      } else if (this.countdownStep === 0) {
        this.track.setSignalLights('GO');
        this.ui.showCountdown(0);
        this.soundManager.playCountdown(0);
        this.gameState = 'RACING';
        this.raceStartTime = performance.now();
        this.currentLapStartTime = this.raceStartTime;
        clearInterval(stepInterval);
      }
    }, 1000);
  }

  pauseGame() {
    this.gameState = 'PAUSED';
    this.soundManager.stopEngine();
    this.ui.showPause(true);
  }

  resumeGame() {
    this.gameState = 'RACING';
    this.ui.showPause(false);
  }

  restartRace() {
    this.soundManager.stopEngine();
    this.startCountdown();
  }

  onRaceFinished() {
    this.gameState = 'FINISHED';
    this.soundManager.stopEngine();
    this.soundManager.playVictory();

    const totalTime = performance.now() - this.raceStartTime;

    // Calculate final standings
    const allRacers = [
      { name: 'YOU', car: 'Apex GT Red', progress: this.playerPhysics.raceProgress, isPlayer: true, time: totalTime },
      ...this.aiController.getRacers().map((r, i) => {
        // Approximate finish time based on progress
        const diff = (this.playerPhysics.raceProgress - r.physics.raceProgress) * 12000;
        return {
          name: r.profile.name,
          car: r.profile.team,
          progress: r.physics.raceProgress,
          isPlayer: false,
          time: Math.max(totalTime + diff, 35000)
        };
      })
    ];

    allRacers.sort((a, b) => b.progress - a.progress);
    const playerRank = allRacers.findIndex(r => r.isPlayer) + 1;

    this.ui.showFinishScreen(playerRank, totalTime, this.bestLapTime, allRacers);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    if (this.gameState === 'RACING') {
      const now = performance.now();
      this.raceElapsedTime = now - this.raceStartTime;
      const currentLapTime = now - this.currentLapStartTime;

      // Check if player completed a lap
      const prevLap = this.playerPhysics.currentLap;

      // Update Player Physics
      this.playerPhysics.update(this.input, dt, this.soundManager, this.particles, this.chaseCamera);

      if (this.playerPhysics.currentLap > prevLap) {
        // Lap completed!
        const completedLapTime = now - this.currentLapStartTime;
        this.currentLapStartTime = now;
        if (completedLapTime < this.bestLapTime) {
          this.bestLapTime = completedLapTime;
          this.ui.bestLapTime = this.bestLapTime;
        }
      }

      // Check race finish condition (completed totalLaps)
      if (this.playerPhysics.raceFinished) {
        this.onRaceFinished();
      }

      // Update AI Opponents
      this.aiController.update(dt, true, this.playerPhysics);

      // Update Engine Audio
      this.soundManager.updateEngine(this.playerPhysics.speed, this.playerPhysics.maxSpeed, this.input.accel);

      // Update HUD
      this.ui.update(this.playerPhysics, this.aiController.getRacers(), this.raceElapsedTime, currentLapTime);

      // Smooth Chase Camera following Player
      this.chaseCamera.update(
        this.playerPhysics.position,
        this.playerPhysics.yaw,
        this.playerPhysics.speed,
        this.playerPhysics.maxSpeed,
        dt
      );
    } else if (this.gameState === 'MENU') {
      // Intro camera gentle orbiting around player car
      const time = performance.now() * 0.0004;
      const radius = 9;
      this.camera.position.set(
        this.playerPhysics.position.x + Math.sin(time) * radius,
        this.playerPhysics.position.y + 3.2,
        this.playerPhysics.position.z + Math.cos(time) * radius
      );
      this.camera.lookAt(
        this.playerPhysics.position.x,
        this.playerPhysics.position.y + 1.0,
        this.playerPhysics.position.z
      );
    } else if (this.gameState === 'COUNTDOWN') {
      // Camera locks smoothly behind starting car
      this.chaseCamera.update(
        this.playerPhysics.position,
        this.playerPhysics.yaw,
        0,
        this.playerPhysics.maxSpeed,
        dt
      );
    }

    // Always update visual particles
    this.particles.update(dt);

    // Align sun position with camera so shadow frustum tracks the action
    this.sunLight.position.x = this.camera.position.x + 80;
    this.sunLight.position.z = this.camera.position.z + 60;
    this.sunLight.target.position.copy(this.camera.position);
    this.sunLight.target.updateMatrixWorld();

    // Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate Game on DOM Content Loaded
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
