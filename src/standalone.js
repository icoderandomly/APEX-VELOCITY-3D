// ============================================================================
// APEX VELOCITY 3D - Standalone Bundle for Direct File Execution (file://)
// Allows double-clicking play.html directly in Windows without CORS restrictions
// ============================================================================

(function() {
  'use strict';

  // 1. SOUND MANAGER
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.isInitialized = false;
      this.engineOsc1 = null;
      this.engineOsc2 = null;
      this.engineGain = null;
      this.engineFilter = null;
      this.skidSource = null;
      this.skidGain = null;
      this.skidFilter = null;
    }

    init() {
      if (this.isInitialized) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.0;

        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 400;

        const distortion = this.ctx.createWaveShaper();
        distortion.curve = this.makeDistortionCurve(20);
        distortion.oversample = '2x';

        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc1.frequency.value = 45;

        this.engineOsc2 = this.ctx.createOscillator();
        this.engineOsc2.type = 'triangle';
        this.engineOsc2.frequency.value = 22.5;

        this.engineOsc1.connect(distortion);
        this.engineOsc2.connect(distortion);
        distortion.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc1.start();
        this.engineOsc2.start();

        this.setupSkidSound();
        this.isInitialized = true;
      } catch (e) {
        console.warn('Web Audio API not supported or blocked:', e);
      }
    }

    makeDistortionCurve(amount) {
      const k = typeof amount === 'number' ? amount : 50;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      return curve;
    }

    setupSkidSound() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      this.skidFilter = this.ctx.createBiquadFilter();
      this.skidFilter.type = 'bandpass';
      this.skidFilter.frequency.value = 1600;
      this.skidFilter.Q.value = 3.0;

      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.value = 0.0;

      whiteNoise.connect(this.skidFilter);
      this.skidFilter.connect(this.skidGain);
      this.skidGain.connect(this.ctx.destination);

      whiteNoise.start();
      this.skidSource = whiteNoise;
    }

    resume() {
      if (!this.isInitialized) this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    toggleMute() {
      this.muted = !this.muted;
      if (this.muted) {
        if (this.engineGain) this.engineGain.gain.value = 0;
        if (this.skidGain) this.skidGain.gain.value = 0;
      }
      return this.muted;
    }

    updateEngine(speed, maxSpeed, isAccelerating) {
      if (!this.isInitialized || this.muted || !this.ctx) return;
      const normSpeed = Math.min(Math.max(Math.abs(speed) / maxSpeed, 0), 1.2);
      const gearProgress = (normSpeed * 5) % 1.0;
      const baseFreq = 40 + normSpeed * 120 + gearProgress * 65;

      const now = this.ctx.currentTime;
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);

      const filterCutoff = 350 + normSpeed * 1400 + (isAccelerating ? 700 : 0);
      this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.06);

      const targetGain = 0.12 + normSpeed * 0.16 + (isAccelerating ? 0.06 : 0);
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
    }

    stopEngine() {
      if (!this.isInitialized || !this.ctx || !this.engineGain) return;
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }

    updateSkid(skidIntensity) {
      if (!this.isInitialized || this.muted || !this.ctx || !this.skidGain) return;
      const intensity = Math.min(Math.max(skidIntensity, 0), 1);
      const targetGain = intensity > 0.15 ? (intensity - 0.15) * 0.35 : 0;
      this.skidGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.04);
    }

    playCrash(intensity = 1.0) {
      if (!this.isInitialized || this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
        gain.gain.setValueAtTime(Math.min(Math.max(intensity, 0.2), 1.0) * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } catch (e) {}
    }

    playCountdown(count) {
      if (!this.isInitialized || this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const isGo = count === 0;
        osc.type = isGo ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
        if (isGo) osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.6 : 0.25));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isGo ? 0.65 : 0.3));
      } catch (e) {}
    }

    playVictory() {
      if (!this.isInitialized || this.muted || !this.ctx) return;
      try {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        const startTime = this.ctx.currentTime;
        notes.forEach((freq, idx) => {
          const noteTime = startTime + idx * 0.12;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteTime);
          gain.gain.setValueAtTime(0.2, noteTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(noteTime);
          osc.stop(noteTime + 0.5);
        });
      } catch (e) {}
    }
  }

  // 2. PARTICLE SYSTEM
  class ParticleSystem {
    constructor(scene) {
      this.scene = scene;
      this.maxSmoke = 120;
      this.smokeParticles = [];
      this.smokeIndex = 0;

      const smokeGeo = new THREE.SphereGeometry(0.35, 6, 6);
      const smokeMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0, depthWrite: false });
      this.smokeMeshGroup = new THREE.Group();
      this.scene.add(this.smokeMeshGroup);

      for (let i = 0; i < this.maxSmoke; i++) {
        const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
        mesh.visible = false;
        this.smokeMeshGroup.add(mesh);
        this.smokeParticles.push({ mesh, life: 0, maxLife: 0.8, velocity: new THREE.Vector3(), startScale: 0.4, endScale: 1.8 });
      }

      this.maxSparks = 60;
      this.sparks = [];
      const sparkGeo = new THREE.SphereGeometry(0.12, 4, 4);
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa11, transparent: true, opacity: 0, depthWrite: false });
      this.sparkGroup = new THREE.Group();
      this.scene.add(this.sparkGroup);

      for (let i = 0; i < this.maxSparks; i++) {
        const mesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
        mesh.visible = false;
        this.sparkGroup.add(mesh);
        this.sparks.push({ mesh, life: 0, maxLife: 0.4, velocity: new THREE.Vector3() });
      }
    }

    emitSmoke(position, carVelocity) {
      const p = this.smokeParticles[this.smokeIndex];
      this.smokeIndex = (this.smokeIndex + 1) % this.maxSmoke;
      p.life = p.maxLife;
      p.mesh.visible = true;
      p.mesh.position.copy(position);
      p.mesh.position.y += 0.15;
      p.velocity.set(-carVelocity.x * 0.2 + (Math.random() - 0.5) * 1.5, 0.8 + Math.random() * 0.8, -carVelocity.z * 0.2 + (Math.random() - 0.5) * 1.5);
      p.mesh.scale.setScalar(p.startScale);
      p.mesh.material.opacity = 0.5;
    }

    emitSparks(position, normal) {
      for (let i = 0; i < 12; i++) {
        const spark = this.sparks[Math.floor(Math.random() * this.maxSparks)];
        spark.life = spark.maxLife * (0.6 + Math.random() * 0.4);
        spark.mesh.visible = true;
        spark.mesh.position.copy(position);
        const speed = 6 + Math.random() * 10;
        spark.velocity.set(normal.x * speed + (Math.random() - 0.5) * 8, Math.random() * 6 + 2, normal.z * speed + (Math.random() - 0.5) * 8);
        spark.mesh.material.opacity = 1;
        spark.mesh.material.color.setHex(Math.random() > 0.4 ? 0xffcc00 : 0xff4400);
      }
    }

    update(dt) {
      for (let i = 0; i < this.maxSmoke; i++) {
        const p = this.smokeParticles[i];
        if (p.life > 0) {
          p.life -= dt;
          if (p.life <= 0) p.mesh.visible = false;
          else {
            p.mesh.position.addScaledVector(p.velocity, dt);
            const progress = 1 - (p.life / p.maxLife);
            p.mesh.scale.setScalar(THREE.MathUtils.lerp(p.startScale, p.endScale, progress));
            p.mesh.material.opacity = (1 - progress) * 0.45;
          }
        }
      }
      for (let i = 0; i < this.maxSparks; i++) {
        const s = this.sparks[i];
        if (s.life > 0) {
          s.life -= dt;
          if (s.life <= 0) s.mesh.visible = false;
          else {
            s.velocity.y -= 25 * dt;
            s.mesh.position.addScaledVector(s.velocity, dt);
            if (s.mesh.position.y < 0.05) { s.mesh.position.y = 0.05; s.velocity.y *= -0.3; }
            s.mesh.material.opacity = 1 - (s.life / s.maxLife);
          }
        }
      }
    }
  }

  // 3. HIGH-FIDELITY SUPERCAR MODEL
  class CarModel {
    constructor(options = {}) {
      this.name = options.name || 'Racer';
      this.primaryColor = options.primaryColor || 0xe6194b;
      this.isPlayer = !!options.isPlayer;
      this.group = new THREE.Group();
      this.wheelMeshes = [];
      this.frontWheelSteerGroups = [];
      this.brakeLightMats = [];
      this.buildCar();
    }

    buildCar() {
      const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: this.primaryColor,
        metalness: 0.82,
        roughness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08
      });

      const matteCarbon = new THREE.MeshStandardMaterial({ color: 0x16181f, metalness: 0.35, roughness: 0.65 });
      const glossyBlack = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.9, roughness: 0.15 });
      const windshieldMat = new THREE.MeshPhysicalMaterial({ color: 0x08101e, transparent: true, opacity: 0.85 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf5, metalness: 0.98, roughness: 0.08 });
      const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.88, metalness: 0.05 });
      const rotorMat = new THREE.MeshStandardMaterial({ color: 0x999da4, metalness: 0.88 });
      const caliperMat = new THREE.MeshStandardMaterial({ color: 0xdd1122, metalness: 0.7 });

      // Ambient contact shadow
      const shadowGeo = new THREE.PlaneGeometry(2.4, 5.0);
      shadowGeo.rotateX(-Math.PI / 2);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128; shadowCanvas.height = 256;
      const sctx = shadowCanvas.getContext('2d');
      const grad = sctx.createRadialGradient(64, 128, 10, 64, 128, 64);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 128, 256);
      const shadowPlane = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true }));
      shadowPlane.position.y = 0.04;
      this.group.add(shadowPlane);

      // Chassis & Splitter
      const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.24, 4.5), matteCarbon);
      lower.position.y = 0.28;
      lower.castShadow = true;
      const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.65), matteCarbon);
      splitter.position.set(0, 0.16, -2.25);
      this.group.add(lower, splitter);

      // Main fuselage
      const central = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.44, 4.1), bodyMaterial);
      central.position.set(0, 0.52, -0.05);
      central.castShadow = true;

      const fL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 1.4), bodyMaterial); fL.position.set(-0.9, 0.52, -1.35);
      const fR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 1.4), bodyMaterial); fR.position.set(0.9, 0.52, -1.35);
      const rL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 1.6), bodyMaterial); rL.position.set(-0.94, 0.56, 1.3);
      const rR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 1.6), bodyMaterial); rR.position.set(0.94, 0.56, 1.3);
      this.group.add(central, fL, fR, rL, rR);

      // Sloped hood with scoop
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.18, 1.55), bodyMaterial);
      hood.position.set(0, 0.56, -1.38);
      hood.rotation.x = 0.09;
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.65), glossyBlack);
      scoop.position.set(0, 0.68, -1.25);
      this.group.add(hood, scoop);

      // Cockpit cabin, roof, interior
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.46, 1.9), windshieldMat);
      cabin.position.set(0, 0.89, 0.05);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.06, 1.25), bodyMaterial);
      roof.position.set(0, 1.13, 0.12);
      this.group.add(cabin, roof);

      // Mirrors
      [-0.96, 0.96].forEach(x => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.12), bodyMaterial);
        m.position.set(x, 0.82, -0.55);
        this.group.add(m);
      });

      // GT Rear Wing
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.22), matteCarbon); p1.position.set(-0.52, 0.95, 1.8);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.22), matteCarbon); p2.position.set(0.52, 0.95, 1.8);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.06, 0.42), matteCarbon); blade.position.set(0, 1.15, 1.76); blade.rotation.x = -0.09;
      this.group.add(p1, p2, blade);

      // Exhausts
      const exhGeo = new THREE.CylinderGeometry(0.075, 0.08, 0.32, 16); exhGeo.rotateX(Math.PI / 2);
      [-0.42, -0.24, 0.24, 0.42].forEach(x => {
        const tip = new THREE.Mesh(exhGeo, chromeMat); tip.position.set(x, 0.28, 2.15); this.group.add(tip);
      });

      // Headlights & Tail bar
      const headMat = new THREE.MeshBasicMaterial({ color: 0x90e0ef });
      const hL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.06), headMat); hL.position.set(-0.65, 0.53, -2.12);
      const hR = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.06), headMat); hR.position.set(0.65, 0.53, -2.12);
      this.group.add(hL, hR);

      const tailMat = new THREE.MeshBasicMaterial({ color: 0xaa0000 });
      const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08), tailMat);
      tailBar.position.set(0, 0.62, 2.05);
      this.group.add(tailBar);
      this.brakeLightMats.push(tailMat);

      // Wheels with Calipers and Rotors
      const wheelPos = [
        { x: -0.96, y: 0.36, z: -1.35, isFront: true },
        { x: 0.96, y: 0.36, z: -1.35, isFront: true },
        { x: -0.98, y: 0.38, z: 1.35, isFront: false },
        { x: 0.98, y: 0.38, z: 1.35, isFront: false }
      ];

      const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 24); tireGeo.rotateZ(Math.PI / 2);
      const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.29, 16); rimGeo.rotateZ(Math.PI / 2);
      const rotorGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16); rotorGeo.rotateZ(Math.PI / 2);
      const calGeo = new THREE.BoxGeometry(0.08, 0.12, 0.14);

      wheelPos.forEach(p => {
        const steerGroup = new THREE.Group();
        steerGroup.position.set(p.x, p.y, p.z);

        const brakeAssy = new THREE.Group();
        const rotor = new THREE.Mesh(rotorGeo, rotorMat);
        const cal = new THREE.Mesh(calGeo, caliperMat);
        cal.position.set(p.x > 0 ? -0.06 : 0.06, 0.08, 0);
        brakeAssy.add(rotor, cal);
        steerGroup.add(brakeAssy);

        const rollGroup = new THREE.Group();
        const tire = new THREE.Mesh(tireGeo, rubberMat); tire.castShadow = true;
        const rim = new THREE.Mesh(rimGeo, chromeMat);
        for (let s = 0; s < 5; s++) {
          const spk = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.04, 0.04), chromeMat);
          spk.rotation.x = (s * Math.PI * 2) / 5;
          rollGroup.add(spk);
        }
        rollGroup.add(tire, rim);
        steerGroup.add(rollGroup);

        this.group.add(steerGroup);
        this.wheelMeshes.push(rollGroup);
        if (p.isFront) this.frontWheelSteerGroups.push(steerGroup);
      });
    }

    updateVisuals(speed, steerAngle, isBraking, dt) {
      const rollDelta = (speed / (0.36 * Math.PI * 2)) * (Math.PI * 2) * dt;
      this.wheelMeshes.forEach(w => w.rotation.x += rollDelta);
      this.frontWheelSteerGroups.forEach(s => s.rotation.y = steerAngle);
      const col = isBraking ? 0xff1122 : 0x770000;
      this.brakeLightMats.forEach(b => b.color.setHex(col));
    }
  }

  // 4. HIGH-SPEED GRAND PRIX CIRCUIT
  class Track {
    constructor(scene) {
      this.scene = scene;
      this.trackWidth = 18.0;
      this.roadSegments = 360;
      this.checkpoints = [];

      this.controlPoints = [
        new THREE.Vector3(0, 0, 40),
        new THREE.Vector3(0, 0, -60),
        new THREE.Vector3(0, 0, -160),
        new THREE.Vector3(0, 0, -230),
        new THREE.Vector3(35, 1.0, -290),
        new THREE.Vector3(100, 2.0, -320),
        new THREE.Vector3(175, 2.5, -290),
        new THREE.Vector3(210, 2.0, -210),
        new THREE.Vector3(225, 1.2, -100),
        new THREE.Vector3(220, 0.5, 0),
        new THREE.Vector3(185, 0.0, 90),
        new THREE.Vector3(135, 1.0, 160),
        new THREE.Vector3(110, 1.8, 240),
        new THREE.Vector3(50, 2.2, 300),
        new THREE.Vector3(-40, 2.0, 320),
        new THREE.Vector3(-130, 1.5, 280),
        new THREE.Vector3(-180, 1.0, 200),
        new THREE.Vector3(-195, 0.5, 90),
        new THREE.Vector3(-195, 0.0, -30),
        new THREE.Vector3(-185, 0.0, -140),
        new THREE.Vector3(-150, 0.5, -220),
        new THREE.Vector3(-85, 0.0, -240),
        new THREE.Vector3(-30, 0.0, -180),
        new THREE.Vector3(-10, 0.0, -70),
        new THREE.Vector3(0, 0, 0)
      ];

      this.spline = new THREE.CatmullRomCurve3(this.controlPoints, true, 'centripetal', 0.5);
      this.buildRoadMesh();
      this.buildBarriers();
      this.buildCheckpoints();
      this.buildPitLane();
      this.buildScenery();
      this.buildMountains();
      this.buildStartGantry();
    }

    buildRoadMesh() {
      const halfWidth = this.trackWidth / 2;
      const roadPositions = [], roadNormals = [], roadUvs = [], roadIndices = [];
      const curbPositions = [], curbColors = [], curbIndices = [];
      let vOffset = 0, cOffset = 0;

      for (let i = 0; i <= this.roadSegments; i++) {
        const t = i / this.roadSegments;
        const pt = this.spline.getPointAt(t % 1.0);
        const tangent = this.spline.getTangentAt(t % 1.0).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

        const leftPt = pt.clone().addScaledVector(normal, -halfWidth);
        const rightPt = pt.clone().addScaledVector(normal, halfWidth);

        roadPositions.push(leftPt.x, leftPt.y + 0.02, leftPt.z, rightPt.x, rightPt.y + 0.02, rightPt.z);
        roadNormals.push(0, 1, 0, 0, 1, 0);
        roadUvs.push(0, t * 65, 1, t * 65);

        if (i < this.roadSegments) {
          roadIndices.push(vOffset, vOffset + 1, vOffset + 2, vOffset + 1, vOffset + 3, vOffset + 2);
          vOffset += 2;
        }

        const curbOutL = pt.clone().addScaledVector(normal, -halfWidth - 1.2);
        const curbOutR = pt.clone().addScaledVector(normal, halfWidth + 1.2);
        curbPositions.push(leftPt.x, leftPt.y + 0.12, leftPt.z, curbOutL.x, curbOutL.y, curbOutL.z);
        curbPositions.push(rightPt.x, rightPt.y + 0.12, rightPt.z, curbOutR.x, curbOutR.y, curbOutR.z);

        const color = (Math.floor(t * 160) % 2 === 0) ? [0.92, 0.12, 0.12] : [0.96, 0.96, 0.96];
        curbColors.push(...color, ...color, ...color, ...color);

        if (i < this.roadSegments) {
          curbIndices.push(cOffset, cOffset + 1, cOffset + 4, cOffset + 1, cOffset + 5, cOffset + 4);
          curbIndices.push(cOffset + 2, cOffset + 3, cOffset + 6, cOffset + 3, cOffset + 7, cOffset + 6);
          cOffset += 4;
        }
      }

      const roadGeo = new THREE.BufferGeometry();
      roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
      roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
      roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
      roadGeo.setIndex(roadIndices);

      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#20232a';
      ctx.fillRect(0, 0, 512, 512);
      for (let p = 0; p < 9000; p++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#17191e' : '#2c2f37';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(16, 0, 10, 512);
      ctx.fillRect(486, 0, 10, 512);
      ctx.fillStyle = '#ffcc00';
      for (let y = 0; y < 512; y += 40) ctx.fillRect(251, y, 10, 22);

      const roadTexture = new THREE.CanvasTexture(canvas);
      roadTexture.wrapS = THREE.RepeatWrapping;
      roadTexture.wrapT = THREE.RepeatWrapping;
      roadTexture.repeat.set(1, 60);

      const roadMesh = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.85, metalness: 0.1 }));
      roadMesh.receiveShadow = true;
      this.scene.add(roadMesh);

      const curbGeo = new THREE.BufferGeometry();
      curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
      curbGeo.setAttribute('color', new THREE.Float32BufferAttribute(curbColors, 3));
      curbGeo.setIndex(curbIndices);
      curbGeo.computeVertexNormals();
      const curbMesh = new THREE.Mesh(curbGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 }));
      curbMesh.castShadow = true;
      curbMesh.receiveShadow = true;
      this.scene.add(curbMesh);

      const finishGeo = new THREE.PlaneGeometry(this.trackWidth, 4.5);
      finishGeo.rotateX(-Math.PI / 2);
      const fcan = document.createElement('canvas');
      fcan.width = 256; fcan.height = 64;
      const fctx = fcan.getContext('2d');
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 16; c++) {
          fctx.fillStyle = (r + c) % 2 === 0 ? '#fff' : '#111';
          fctx.fillRect(c * 16, r * 16, 16, 16);
        }
      }
      const finishMesh = new THREE.Mesh(finishGeo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fcan) }));
      finishMesh.position.set(0, 0.05, 40);
      this.scene.add(finishMesh);

      const terrain = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: 0x182a17, roughness: 0.95 }));
      terrain.rotation.x = -Math.PI / 2;
      terrain.position.y = -0.15;
      terrain.receiveShadow = true;
      this.scene.add(terrain);
    }

    buildBarriers() {
      const barrierSegments = 300;
      const halfWidth = this.trackWidth / 2 + 1.4;
      const barrierGeo = new THREE.BoxGeometry(0.35, 0.9, 3.8);
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x8a929b, metalness: 0.85, roughness: 0.35 });
      const grp = new THREE.Group();

      for (let i = 0; i < barrierSegments; i++) {
        const t = i / barrierSegments;
        const pt = this.spline.getPointAt(t);
        const tangent = this.spline.getTangentAt(t).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

        const lPos = pt.clone().addScaledVector(normal, -halfWidth); lPos.y += 0.48;
        const rPos = pt.clone().addScaledVector(normal, halfWidth); rPos.y += 0.48;

        const leftMesh = new THREE.Mesh(barrierGeo, steelMat); leftMesh.position.copy(lPos); leftMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        const rightMesh = new THREE.Mesh(barrierGeo, steelMat); rightMesh.position.copy(rPos); rightMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        grp.add(leftMesh, rightMesh);
      }
      this.scene.add(grp);
    }

    buildCheckpoints() {
      const num = 40;
      for (let i = 0; i < num; i++) {
        const t = i / num;
        this.checkpoints.push({
          index: i,
          t,
          position: this.spline.getPointAt(t),
          tangent: this.spline.getTangentAt(t).normalize(),
          normal: new THREE.Vector3().crossVectors(this.spline.getTangentAt(t).normalize(), new THREE.Vector3(0, 1, 0)).normalize()
        });
      }
    }

    buildPitLane() {
      const concreteMat = new THREE.MeshStandardMaterial({ color: 0x3d434d, roughness: 0.8 });
      const pitWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 180), concreteMat);
      pitWall.position.set(-14, 0.6, -80);
      const building = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 180), concreteMat);
      building.position.set(-28, 5, -80);
      const terrace = new THREE.Mesh(new THREE.BoxGeometry(22, 0.8, 184), new THREE.MeshStandardMaterial({ color: 0xff2a4b }));
      terrace.position.set(-28, 10.4, -80);
      this.scene.add(pitWall, building, terrace);
    }

    buildScenery() {
      const scenery = new THREE.Group();
      const stand = new THREE.Mesh(new THREE.BoxGeometry(16, 9, 160), new THREE.MeshStandardMaterial({ color: 0x2b3240 }));
      stand.position.set(24, 4.5, -80);
      const standRoof = new THREE.Mesh(new THREE.BoxGeometry(20, 0.8, 164), new THREE.MeshStandardMaterial({ color: 0x00f0ff }));
      standRoof.position.set(22, 10, -80);
      scenery.add(stand, standRoof);

      // Trees
      const trGeo = new THREE.CylinderGeometry(0.35, 0.5, 2.5, 7);
      const trMat = new THREE.MeshStandardMaterial({ color: 0x422f20 });
      const foGeo1 = new THREE.ConeGeometry(2.8, 4.8, 7);
      const foGeo2 = new THREE.ConeGeometry(2.2, 3.8, 7);
      const foMat = new THREE.MeshStandardMaterial({ color: 0x1a4f24 });

      for (let i = 0; i < 90; i++) {
        const t = Math.random();
        const pt = this.spline.getPointAt(t);
        const tangent = this.spline.getTangentAt(t).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        const dist = (this.trackWidth / 2) + 8 + Math.random() * 60;
        const treePos = pt.clone().addScaledVector(normal, (Math.random() > 0.5 ? 1 : -1) * dist);

        const tree = new THREE.Group();
        tree.position.set(treePos.x, 0, treePos.z);
        const tr = new THREE.Mesh(trGeo, trMat); tr.position.y = 1.25;
        const f1 = new THREE.Mesh(foGeo1, foMat); f1.position.y = 3.8;
        const f2 = new THREE.Mesh(foGeo2, foMat); f2.position.y = 5.6;
        tree.add(tr, f1, f2);
        tree.scale.setScalar(0.8 + Math.random() * 0.7);
        scenery.add(tree);
      }
      this.scene.add(scenery);
    }

    buildMountains() {
      const mGroup = new THREE.Group();
      const mMat = new THREE.MeshStandardMaterial({ color: 0x1f2735, roughness: 0.92, flatShading: true });
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const x = Math.cos(angle) * (550 + (Math.random() - 0.5) * 80);
        const z = Math.sin(angle) * (550 + (Math.random() - 0.5) * 80);
        const h = 120 + Math.random() * 160;
        const w = 140 + Math.random() * 90;
        const peak = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5), mMat);
        peak.position.set(x, h / 2 - 10, z);
        mGroup.add(peak);
      }
      this.scene.add(mGroup);
    }

    buildStartGantry() {
      const gantry = new THREE.Group();
      const beamMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, metalness: 0.85 });
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.5, 0.9), beamMat); p1.position.set(-13, 3.75, 40);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 7.5, 0.9), beamMat); p2.position.set(13, 3.75, 40);
      const top = new THREE.Mesh(new THREE.BoxGeometry(27, 1.2, 1.4), beamMat); top.position.set(0, 7.5, 40);
      gantry.add(p1, p2, top);

      this.signalLights = [];
      const bezGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16); bezGeo.rotateX(Math.PI / 2);
      for (let i = 0; i < 5; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0x330000 });
        const l = new THREE.Mesh(bezGeo, mat);
        l.position.set(-2.4 + i * 1.2, 6.2, 39.8);
        gantry.add(l);
        this.signalLights.push(mat);
      }
      this.scene.add(gantry);
    }

    setSignalLights(state) {
      if (!this.signalLights) return;
      if (state === '3') this.signalLights.forEach((m, i) => m.color.setHex(i < 2 ? 0xff0000 : 0x330000));
      else if (state === '2') this.signalLights.forEach((m, i) => m.color.setHex(i < 4 ? 0xff0000 : 0x330000));
      else if (state === '1') this.signalLights.forEach(m => m.color.setHex(0xff0000));
      else if (state === 'GO') this.signalLights.forEach(m => m.color.setHex(0x00ff44));
      else this.signalLights.forEach(m => m.color.setHex(0x330000));
    }

    getClosestCheckpoint(carPos) {
      let bestDist = Infinity, bestIdx = 0;
      for (let i = 0; i < this.checkpoints.length; i++) {
        const d = carPos.distanceTo(this.checkpoints[i].position);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      return { checkpoint: this.checkpoints[bestIdx], index: bestIdx, distance: bestDist };
    }

    getSplineProgress(carPos) {
      const { index } = this.getClosestCheckpoint(carPos);
      const n = this.checkpoints.length;
      let minD = Infinity, bestT = 0;
      const baseT = index / n;
      for (let s = -5; s <= 5; s++) {
        const testT = (baseT + (s / (n * 10)) + 1.0) % 1.0;
        const pt = this.spline.getPointAt(testT);
        const d = carPos.distanceTo(pt);
        if (d < minD) { minD = d; bestT = testT; }
      }
      const centerPoint = this.spline.getPointAt(bestT);
      const tangent = this.spline.getTangentAt(bestT).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      const lateralDist = carPos.clone().sub(centerPoint).dot(normal);
      return { t: bestT, centerPoint, tangent, normal, lateralDist, distanceFromCenter: Math.abs(lateralDist) };
    }
  }

  // 5. CAR PHYSICS
  class CarPhysics {
    constructor(carModel, track, isPlayer = true) {
      this.carModel = carModel;
      this.track = track;
      this.isPlayer = isPlayer;
      this.position = new THREE.Vector3(0, 0, 0);
      this.velocity = new THREE.Vector3(0, 0, 0);
      this.yaw = 0;
      this.speed = 0;
      this.steerAngle = 0;
      this.driftScore = 0;
      this.isDrifting = false;
      this.isBraking = false;

      this.maxSpeed = 58.0;
      this.maxReverseSpeed = -15.0;
      this.acceleration = 24.0;
      this.brakeForce = 38.0;
      this.handbrakeGrip = 0.35;
      this.normalLateralGrip = 0.88;
      this.rollingFriction = 3.5;
      this.airDrag = 0.0022;
      this.maxSteerAngle = 0.52;
      this.steerSpeed = 4.2;

      this.lastCollisionTime = 0;
      this.currentLap = 1;
      this.totalLaps = 3;
      this.lastCheckpointIdx = 0;
      this.lapCheckpointsPassed = 0;
      this.raceFinished = false;
      this.isWrongWay = false;
      this.raceProgress = 0;
    }

    reset(startPosition, startTangent, lapNumber = 1) {
      this.position.copy(startPosition);
      this.position.y = 0.05;
      this.velocity.set(0, 0, 0);
      this.speed = 0;
      this.steerAngle = 0;
      this.driftScore = 0;
      this.isDrifting = false;
      this.isBraking = false;
      this.currentLap = lapNumber;
      this.lastCheckpointIdx = 0;
      this.lapCheckpointsPassed = 0;
      this.raceFinished = false;
      this.isWrongWay = false;
      this.raceProgress = 0;
      this.yaw = Math.atan2(-startTangent.x, -startTangent.z);
      this.updateModelTransform();
    }

    update(input, dt, soundManager, particleSystem, camera) {
      if (this.raceFinished) input = { accel: false, brake: true, left: false, right: false, handbrake: false, reset: false };
      if (input.reset) { this.resetToNearestTrack(); return; }

      const speedRatio = Math.min(Math.abs(this.speed) / this.maxSpeed, 1.0);
      const effectiveMaxSteer = THREE.MathUtils.lerp(this.maxSteerAngle, this.maxSteerAngle * 0.42, speedRatio);

      let targetSteer = 0;
      if (input.left) targetSteer += effectiveMaxSteer;
      if (input.right) targetSteer -= effectiveMaxSteer;
      this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteer, this.steerSpeed * dt);

      let isBraking = false;
      if (input.accel) {
        if (this.speed < 0) this.speed += this.brakeForce * dt;
        else {
          const power = Math.max(1.0 - (this.speed / this.maxSpeed) * 0.7, 0.2);
          this.speed += this.acceleration * power * dt;
          if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        }
      } else if (input.brake) {
        if (this.speed > 0.5) { this.speed -= this.brakeForce * dt; isBraking = true; }
        else {
          this.speed -= this.acceleration * 0.5 * dt;
          if (this.speed < this.maxReverseSpeed) this.speed = this.maxReverseSpeed;
          isBraking = true;
        }
      } else {
        if (this.speed > 0) this.speed = Math.max(this.speed - this.rollingFriction * dt, 0);
        else if (this.speed < 0) this.speed = Math.min(this.speed + this.rollingFriction * dt, 0);
      }

      this.speed -= this.speed * Math.abs(this.speed) * this.airDrag * dt;
      this.isBraking = isBraking;

      const turnRate = (this.speed / 2.8) * Math.tan(this.steerAngle);
      this.yaw += turnRate * dt;

      const forwardVec = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const rightVec = new THREE.Vector3(forwardVec.z, 0, -forwardVec.x);

      let lateralGrip = input.handbrake ? this.handbrakeGrip : this.normalLateralGrip;
      if (input.handbrake && Math.abs(this.speed) > 10) {
        this.yaw += (this.steerAngle * 1.8) * dt;
        this.speed -= this.brakeForce * 0.45 * dt;
      }

      const currentLateralSpeed = this.velocity.dot(rightVec);
      const targetForwardVel = forwardVec.clone().multiplyScalar(this.speed);
      const dampedLateralVel = rightVec.clone().multiplyScalar(currentLateralSpeed * (1 - lateralGrip));
      this.velocity.copy(targetForwardVel).add(dampedLateralVel);

      const slipAngle = Math.abs(currentLateralSpeed);
      const driftCondition = (input.handbrake || slipAngle > 4.5) && Math.abs(this.speed) > 12;
      this.isDrifting = driftCondition;

      if (driftCondition) {
        this.driftScore += Math.floor(slipAngle * 10 * dt);
        if (particleSystem && this.isPlayer) {
          const lRear = this.position.clone().addScaledVector(rightVec, -0.9).addScaledVector(forwardVec, -1.5);
          const rRear = this.position.clone().addScaledVector(rightVec, 0.9).addScaledVector(forwardVec, -1.5);
          particleSystem.emitSmoke(lRear, this.velocity);
          particleSystem.emitSmoke(rRear, this.velocity);
        }
      }

      if (soundManager && this.isPlayer) {
        soundManager.updateSkid(input.handbrake ? 0.9 : Math.min(slipAngle / 9.0, 1.0));
      }

      this.position.addScaledVector(this.velocity, dt);
      this.handleTrackBoundaries(dt, soundManager, particleSystem, camera);
      this.updateCheckpoints();
      this.updateModelTransform();
      this.carModel.updateVisuals(this.speed, this.steerAngle, this.isBraking, dt);
    }

    handleTrackBoundaries(dt, soundManager, particleSystem, camera) {
      const progress = this.track.getSplineProgress(this.position);
      this.position.y = THREE.MathUtils.lerp(this.position.y, progress.centerPoint.y, 12 * dt);

      const maxAllowedDist = (this.track.trackWidth / 2) - 1.0;
      if (progress.distanceFromCenter > maxAllowedDist) {
        const sideSign = progress.lateralDist > 0 ? 1 : -1;
        const barrierNormal = progress.normal.clone().multiplyScalar(-sideSign);
        this.position.copy(progress.centerPoint).addScaledVector(progress.normal, sideSign * maxAllowedDist);

        const impactSpeed = Math.abs(this.speed);
        this.speed *= 0.62;
        this.velocity.multiplyScalar(0.62).addScaledVector(barrierNormal, 8.0);

        const now = performance.now();
        if (now - this.lastCollisionTime > 300) {
          this.lastCollisionTime = now;
          if (this.isPlayer) {
            if (soundManager) soundManager.playCrash(Math.min(impactSpeed / 25, 1.0));
            if (camera) camera.addShake(Math.min(impactSpeed / 30, 0.8));
            const flash = document.getElementById('collision-flash');
            if (flash) { flash.style.opacity = '0.7'; setTimeout(() => { flash.style.opacity = '0'; }, 80); }
          }
          if (particleSystem) particleSystem.emitSparks(this.position, barrierNormal);
        }
      }
    }

    updateCheckpoints() {
      const { checkpoint, index } = this.track.getClosestCheckpoint(this.position);
      const num = this.track.checkpoints.length;
      const forwardVec = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      this.isWrongWay = forwardVec.dot(checkpoint.tangent) < -0.35 && this.speed > 4;

      this.raceProgress = (this.currentLap - 1) + (index / num);

      const forwardDiff = (index - this.lastCheckpointIdx + num) % num;
      if (forwardDiff > 0 && forwardDiff <= 6) {
        if (this.lastCheckpointIdx > num * 0.7 && index <= 3 && this.lapCheckpointsPassed >= num * 0.7) {
          this.lapCheckpointsPassed = 0;
          this.currentLap++;
          if (this.currentLap > this.totalLaps) {
            this.currentLap = this.totalLaps;
            this.raceFinished = true;
          }
        } else {
          this.lapCheckpointsPassed += forwardDiff;
        }
        this.lastCheckpointIdx = index;
      }
    }

    resetToNearestTrack() {
      const progress = this.track.getSplineProgress(this.position);
      this.position.copy(progress.centerPoint);
      this.position.y += 0.2;
      this.velocity.set(0, 0, 0);
      this.speed = 0;
      this.steerAngle = 0;
      this.yaw = Math.atan2(-progress.tangent.x, -progress.tangent.z);
      this.updateModelTransform();
    }

    updateModelTransform() {
      this.carModel.group.position.copy(this.position);
      this.carModel.group.rotation.y = this.yaw;
    }
  }

  // 6. AI CONTROLLER
  class AIController {
    constructor(scene, track) {
      this.scene = scene;
      this.track = track;
      this.aiRacers = [];
      this.initOpponents();
    }

    initOpponents() {
      const profiles = [
        { name: 'V. Rossi', team: 'Viper Cobalt', primaryColor: 0x1a73e8, laneOffset: -3.5, baseSpeed: 52.0 },
        { name: 'S. Vance', team: 'Phantom Neon', primaryColor: 0x2bd95d, laneOffset: 3.2, baseSpeed: 50.5 },
        { name: 'M. Sterling', team: 'Solar Gold', primaryColor: 0xf59e0b, laneOffset: -1.6, baseSpeed: 53.0 },
        { name: 'L. Vega', team: 'Shadow Violet', primaryColor: 0x9333ea, laneOffset: 1.8, baseSpeed: 49.5 }
      ];

      profiles.forEach(p => {
        const model = new CarModel({ name: p.name, primaryColor: p.primaryColor, isPlayer: false });
        this.scene.add(model.group);
        const physics = new CarPhysics(model, this.track, false);
        physics.maxSpeed = p.baseSpeed;
        physics.acceleration = 22.0;
        this.aiRacers.push({ profile: p, model, physics, lookaheadT: 0.04, laneOffset: p.laneOffset });
      });
    }

    resetGrid() {
      const slots = [{ lane: -3.0, dist: -14 }, { lane: 3.0, dist: -22 }, { lane: -3.0, dist: -30 }, { lane: 3.0, dist: -38 }];
      this.aiRacers.forEach((r, idx) => {
        const slot = slots[idx];
        const startT = (slot.dist / 1400 + 1.0) % 1.0;
        const pt = this.track.spline.getPointAt(startT);
        const tangent = this.track.spline.getTangentAt(startT).normalize();
        const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
        r.physics.reset(pt.clone().addScaledVector(normal, slot.lane), tangent, 1);
      });
    }

    update(dt, isRaceActive, playerCar) {
      if (!isRaceActive) return;
      this.aiRacers.forEach(r => {
        const { physics } = r;
        const progress = this.track.getSplineProgress(physics.position);
        const targetT = (progress.t + r.lookaheadT) % 1.0;
        const targetPt = this.track.spline.getPointAt(targetT);
        const targetTan = this.track.spline.getTangentAt(targetT).normalize();
        const targetNorm = new THREE.Vector3().crossVectors(targetTan, new THREE.Vector3(0, 1, 0)).normalize();
        const targetPos = targetPt.clone().addScaledVector(targetNorm, r.laneOffset);

        const toTarget = targetPos.clone().sub(physics.position);
        const forward = new THREE.Vector3(-Math.sin(physics.yaw), 0, -Math.cos(physics.yaw));
        const right = new THREE.Vector3(forward.z, 0, -forward.x);
        const steerInput = Math.max(-1, Math.min(1, toTarget.dot(right) / (Math.max(toTarget.dot(forward), 1.0) * 0.75)));

        const input = { left: steerInput > 0.08, right: steerInput < -0.08, accel: true, brake: false, handbrake: false, reset: false };

        const curveT = (progress.t + 0.06) % 1.0;
        if (this.track.spline.getTangentAt(progress.t).angleTo(this.track.spline.getTangentAt(curveT)) > 0.45 && physics.speed > 35) {
          input.accel = false; input.brake = true;
        }

        if (playerCar && physics.position.distanceTo(playerCar.position) < 6.0) {
          if (playerCar.position.clone().sub(physics.position).dot(forward) > 0) input.accel = false;
        }

        physics.update(input, dt, null, null, null);
      });
    }

    getRacers() { return this.aiRacers; }
  }

  // 7. CHASE CAMERA
  class ChaseCamera {
    constructor(camera) {
      this.camera = camera;
      this.distance = 6.4;
      this.height = 2.35;
      this.pitchOffset = 0.95;
      this.baseFOV = 60;
      this.maxFOV = 75;
      this.shakeIntensity = 0;
      this.currentPos = new THREE.Vector3();
      this.currentLookAt = new THREE.Vector3();
      this.initialized = false;
    }

    reset(carPos, carYaw) {
      const backward = new THREE.Vector3(Math.sin(carYaw), 0, Math.cos(carYaw));
      this.currentPos.copy(carPos).addScaledVector(backward, this.distance);
      this.currentPos.y += this.height;
      this.currentLookAt.copy(carPos);
      this.currentLookAt.y += this.pitchOffset;
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLookAt);
      this.initialized = true;
    }

    addShake(amount) { this.shakeIntensity = Math.min(this.shakeIntensity + amount, 1.2); }

    update(carPos, carYaw, carSpeed, maxSpeed, dt) {
      if (!this.initialized) { this.reset(carPos, carYaw); return; }
      const backward = new THREE.Vector3(Math.sin(carYaw), 0, Math.cos(carYaw));
      const forward = backward.clone().negate();

      const targetPos = carPos.clone().addScaledVector(backward, this.distance).add(new THREE.Vector3(0, this.height, 0));
      const targetLook = carPos.clone().addScaledVector(forward, 2.5).add(new THREE.Vector3(0, this.pitchOffset, 0));

      const normSpeed = Math.min(Math.max(Math.abs(carSpeed) / maxSpeed, 0), 1);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, THREE.MathUtils.lerp(this.baseFOV, this.maxFOV, normSpeed), dt * 3);
      this.camera.updateProjectionMatrix();

      this.currentPos.lerp(targetPos, 1 - Math.exp(-7.0 * dt));
      this.currentLookAt.lerp(targetLook, 1 - Math.exp(-9.0 * dt));

      if (this.shakeIntensity > 0.001) {
        this.shakeIntensity = Math.max(0, this.shakeIntensity - 4.5 * dt);
        this.camera.position.set(
          this.currentPos.x + (Math.random() - 0.5) * this.shakeIntensity * 0.45,
          this.currentPos.y + (Math.random() - 0.5) * this.shakeIntensity * 0.35,
          this.currentPos.z + (Math.random() - 0.5) * this.shakeIntensity * 0.45
        );
      } else {
        this.camera.position.copy(this.currentPos);
      }
      this.camera.lookAt(this.currentLookAt);
    }
  }

  // 8. UI MANAGER
  class UIManager {
    constructor(track, soundManager) {
      this.track = track;
      this.soundManager = soundManager;
      this.hudElement = document.getElementById('hud');
      this.speedText = document.getElementById('hud-speed');
      this.gaugeFill = document.getElementById('gauge-fill');
      this.gearText = document.getElementById('hud-gear');
      this.lapText = document.getElementById('hud-lap');
      this.timerText = document.getElementById('hud-timer');
      this.bestLapText = document.getElementById('hud-best-lap');
      this.posText = document.getElementById('hud-pos');
      this.speedLines = document.getElementById('speed-lines');

      this.countdownBanner = document.getElementById('countdown-banner');
      this.countdownText = document.getElementById('countdown-text');
      this.driftNotification = document.getElementById('drift-notification');
      this.driftPoints = document.getElementById('drift-points');
      this.wrongWayBanner = document.getElementById('wrong-way-banner');
      this.lapAnnouncement = document.getElementById('lap-announcement');
      this.lapAnnouncementText = document.getElementById('lap-announcement-text');

      this.startScreen = document.getElementById('start-screen');
      this.pauseScreen = document.getElementById('pause-screen');
      this.finishScreen = document.getElementById('finish-screen');

      this.finishTitle = document.getElementById('finish-title');
      this.finishPos = document.getElementById('finish-position');
      this.finalTotalTime = document.getElementById('final-total-time');
      this.finalBestLap = document.getElementById('final-best-lap');
      this.finalTopSpeed = document.getElementById('final-top-speed');
      this.leaderboardBody = document.getElementById('leaderboard-body');

      this.btnStart = document.getElementById('btn-start');
      this.btnToggleAudio = document.getElementById('btn-toggle-audio');
      this.btnResume = document.getElementById('btn-resume');
      this.btnPauseRestart = document.getElementById('btn-pause-restart');
      this.btnPauseSound = document.getElementById('btn-pause-sound');
      this.btnRestart = document.getElementById('btn-restart');

      this.mapCanvas = document.getElementById('minimap-canvas');
      this.mapCtx = this.mapCanvas ? this.mapCanvas.getContext('2d') : null;
      this.initMinimapCache();

      this.maxSpeedRecorded = 0;
      this.bestLapTime = Infinity;
      this.lastAnnouncedLap = 1;
    }

    initMinimapCache() {
      if (!this.track || !this.mapCanvas) return;
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      this.mapPoints = [];
      for (let i = 0; i < 140; i++) {
        const pt = this.track.spline.getPointAt(i / 140);
        this.mapPoints.push(pt);
        if (pt.x < minX) minX = pt.x; if (pt.x > maxX) maxX = pt.x;
        if (pt.z < minZ) minZ = pt.z; if (pt.z > maxZ) maxZ = pt.z;
      }
      const pad = 16, w = this.mapCanvas.width - pad * 2, h = this.mapCanvas.height - pad * 2;
      const spanX = Math.max(maxX - minX, 1), spanZ = Math.max(maxZ - minZ, 1);
      this.mapScale = Math.min(w / spanX, h / spanZ);
      this.mapOffsetX = (this.mapCanvas.width - spanX * this.mapScale) / 2 - minX * this.mapScale;
      this.mapOffsetZ = (this.mapCanvas.height - spanZ * this.mapScale) / 2 - minZ * this.mapScale;
    }

    reset() {
      this.lastAnnouncedLap = 1;
      this.maxSpeedRecorded = 0;
      this.bestLapTime = Infinity;
      if (this.countdownBanner) this.countdownBanner.classList.add('hidden');
      if (this.wrongWayBanner) this.wrongWayBanner.classList.add('hidden');
      if (this.driftNotification) this.driftNotification.classList.add('hidden');
      if (this.lapAnnouncement) this.lapAnnouncement.classList.add('hidden');
    }

    formatTime(ms) {
      if (!ms || ms === Infinity || isNaN(ms)) return '--:--.--';
      const totSec = Math.floor(ms / 1000);
      const m = Math.floor(totSec / 60), s = totSec % 60, c = Math.floor((ms % 1000) / 10);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
    }

    showHUD() {
      this.hudElement.classList.remove('hidden');
      this.startScreen.classList.add('hidden');
      this.pauseScreen.classList.add('hidden');
      this.finishScreen.classList.add('hidden');
      if (this.wrongWayBanner) this.wrongWayBanner.classList.add('hidden');
      if (this.driftNotification) this.driftNotification.classList.add('hidden');
      if (this.lapAnnouncement) this.lapAnnouncement.classList.add('hidden');
    }

    showPause(s) { if (s) this.pauseScreen.classList.remove('hidden'); else this.pauseScreen.classList.add('hidden'); }

    showCountdown(count) {
      this.countdownBanner.classList.remove('hidden');
      if (count > 0) {
        this.countdownText.textContent = count;
        this.countdownText.style.color = '#fff';
      } else {
        this.countdownText.textContent = 'GO!';
        this.countdownText.style.color = '#00ff44';
        setTimeout(() => this.countdownBanner.classList.add('hidden'), 900);
      }
    }

    update(playerPhysics, aiRacers, raceElapsedTime) {
      const kmh = Math.round(Math.abs(playerPhysics.speed) * 3.6);
      this.speedText.textContent = kmh;
      if (kmh > this.maxSpeedRecorded) this.maxSpeedRecorded = kmh;

      this.speedLines.style.opacity = kmh > 150 ? Math.min((kmh - 150) / 50, 1.0).toString() : '0';
      this.gaugeFill.style.strokeDashoffset = 440 - Math.min(kmh / 220, 1.0) * 340;

      let g = 'GEAR 1';
      if (playerPhysics.speed < -0.5) g = 'GEAR R';
      else if (kmh > 165) g = 'GEAR 5';
      else if (kmh > 115) g = 'GEAR 4';
      else if (kmh > 70) g = 'GEAR 3';
      else if (kmh > 35) g = 'GEAR 2';
      this.gearText.textContent = g;

      this.lapText.innerHTML = `${playerPhysics.currentLap}<span class="hud-sub">/${playerPhysics.totalLaps}</span>`;
      if (playerPhysics.currentLap === playerPhysics.totalLaps && this.lastAnnouncedLap < playerPhysics.totalLaps) {
        this.lastAnnouncedLap = playerPhysics.currentLap;
        this.lapAnnouncementText.textContent = 'FINAL LAP!';
        this.lapAnnouncement.classList.remove('hidden');
        setTimeout(() => this.lapAnnouncement.classList.add('hidden'), 2200);
      }

      this.timerText.textContent = this.formatTime(raceElapsedTime);
      if (this.bestLapTime < Infinity) this.bestLapText.textContent = this.formatTime(this.bestLapTime);

      const allRacers = [
        { progress: playerPhysics.raceProgress, isPlayer: true },
        ...aiRacers.map(r => ({ progress: r.physics.raceProgress, isPlayer: false }))
      ].sort((a, b) => b.progress - a.progress);
      const playerRank = allRacers.findIndex(r => r.isPlayer) + 1;
      this.posText.innerHTML = `${playerRank}<span class="hud-sub">/5</span>`;

      if (playerPhysics.isWrongWay) this.wrongWayBanner.classList.remove('hidden');
      else this.wrongWayBanner.classList.add('hidden');

      if (playerPhysics.isDrifting) {
        this.driftNotification.classList.remove('hidden');
        this.driftPoints.textContent = `+${playerPhysics.driftScore}`;
      } else {
        this.driftNotification.classList.add('hidden');
      }

      this.renderMinimap(playerPhysics, aiRacers);
    }

    renderMinimap(playerPhysics, aiRacers) {
      if (!this.mapCtx || !this.mapPoints) return;
      const ctx = this.mapCtx;
      ctx.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
      ctx.strokeStyle = '#3a4454';
      ctx.lineWidth = 4;
      ctx.beginPath();
      this.mapPoints.forEach((pt, i) => {
        const mx = pt.x * this.mapScale + this.mapOffsetX;
        const my = pt.z * this.mapScale + this.mapOffsetZ;
        if (i === 0) ctx.moveTo(mx, my); else ctx.lineTo(mx, my);
      });
      ctx.closePath();
      ctx.stroke();

      aiRacers.forEach(r => {
        ctx.fillStyle = `#${r.profile.primaryColor.toString(16).padStart(6, '0')}`;
        ctx.beginPath();
        ctx.arc(r.physics.position.x * this.mapScale + this.mapOffsetX, r.physics.position.z * this.mapScale + this.mapOffsetZ, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      const px = playerPhysics.position.x * this.mapScale + this.mapOffsetX;
      const py = playerPhysics.position.z * this.mapScale + this.mapOffsetZ;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-playerPhysics.yaw + Math.PI);
      ctx.fillStyle = '#ff2a4b';
      ctx.shadowColor = '#ff2a4b';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(5, 5); ctx.lineTo(0, 3); ctx.lineTo(-5, 5);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    showFinishScreen(rank, totalTime, bestLap, standings) {
      this.hudElement.classList.add('hidden');
      this.finishScreen.classList.remove('hidden');
      this.finishTitle.textContent = rank === 1 ? 'CHAMPION!' : (rank <= 3 ? 'PODIUM FINISH!' : 'RACE FINISHED');
      this.finishPos.textContent = rank === 1 ? '1ST PLACE - GOLD TROPHY' : `${rank}TH PLACE`;
      this.finishPos.style.color = rank === 1 ? '#ffb703' : (rank <= 3 ? '#00f0ff' : '#8e9bb4');
      this.finalTotalTime.textContent = this.formatTime(totalTime);
      this.finalBestLap.textContent = this.formatTime(bestLap);
      this.finalTopSpeed.textContent = `${this.maxSpeedRecorded} KM/H`;

      this.leaderboardBody.innerHTML = '';
      standings.forEach((r, idx) => {
        const tr = document.createElement('tr');
        if (r.isPlayer) tr.classList.add('player-row');
        tr.innerHTML = `<td>#${idx + 1}</td><td>${r.name}</td><td>${r.car}</td><td>${this.formatTime(r.time)}</td>`;
        this.leaderboardBody.appendChild(tr);
      });
    }
  }

  // 9. GAME MANAGER
  class Game {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.gameState = 'MENU';
      this.clock = new THREE.Clock();
      this.raceStartTime = 0;
      this.raceElapsedTime = 0;
      this.currentLapStartTime = 0;
      this.bestLapTime = Infinity;
      this.countdownTimer = 0;
      this.countdownStep = 3;

      this.input = { accel: false, brake: false, left: false, right: false, handbrake: false, reset: false };

      this.initGraphics();
      this.initWorld();
      this.initAudioAndUI();
      this.bindInputs();

      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    initGraphics() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0f1522);
      this.scene.fog = new THREE.FogExp2(0x0f1522, 0.002);

      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 900);
      this.chaseCamera = new ChaseCamera(this.camera);

      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.scene.add(new THREE.AmbientLight(0xdde6f5, 0.55));
      this.scene.add(new THREE.HemisphereLight(0x89b6f8, 0x1a3318, 0.65));

      this.sunLight = new THREE.DirectionalLight(0xfff6e5, 1.6);
      this.sunLight.position.set(90, 140, 70);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.scene.add(this.sunLight);

      const sky = new THREE.Mesh(new THREE.SphereGeometry(750, 24, 18), new THREE.MeshBasicMaterial({ color: 0x142035, side: THREE.BackSide }));
      this.scene.add(sky);

      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    initWorld() {
      this.track = new Track(this.scene);
      this.particles = new ParticleSystem(this.scene);
      this.playerModel = new CarModel({ name: 'Player 1', primaryColor: 0xe6194b, isPlayer: true });
      this.scene.add(this.playerModel.group);
      this.playerPhysics = new CarPhysics(this.playerModel, this.track, true);
      this.aiController = new AIController(this.scene, this.track);
      this.resetGridPositions();
    }

    resetGridPositions() {
      const polePt = this.track.spline.getPointAt(0);
      const poleTangent = this.track.spline.getTangentAt(0).normalize();
      const poleNormal = new THREE.Vector3().crossVectors(poleTangent, new THREE.Vector3(0, 1, 0)).normalize();
      this.playerPhysics.reset(polePt.clone().addScaledVector(poleNormal, -2.5), poleTangent, 1);
      this.chaseCamera.reset(this.playerPhysics.position, this.playerPhysics.yaw);
      this.aiController.resetGrid();
      this.track.setSignalLights('off');
    }

    initAudioAndUI() {
      this.soundManager = new SoundManager();
      this.ui = new UIManager(this.track, this.soundManager);

      this.ui.btnStart.addEventListener('click', () => { this.soundManager.resume(); this.startCountdown(); });
      const toggle = () => {
        const m = this.soundManager.toggleMute();
        const t = m ? '🔇 SOUND: OFF' : '🔊 SOUND: ON';
        this.ui.btnToggleAudio.textContent = t;
        if (this.ui.btnPauseSound) this.ui.btnPauseSound.textContent = t;
      };
      this.ui.btnToggleAudio.addEventListener('click', toggle);
      if (this.ui.btnPauseSound) this.ui.btnPauseSound.addEventListener('click', toggle);
      this.ui.btnResume.addEventListener('click', () => { this.gameState = 'RACING'; this.ui.showPause(false); });
      this.ui.btnPauseRestart.addEventListener('click', () => { this.restartRace(); });
      this.ui.btnRestart.addEventListener('click', () => { this.restartRace(); });
    }

    bindInputs() {
      window.addEventListener('keydown', e => {
        if (e.repeat) return;
        if (e.code === 'Escape' || e.code === 'KeyP') {
          if (this.gameState === 'RACING') { this.gameState = 'PAUSED'; this.soundManager.stopEngine(); this.ui.showPause(true); }
          else if (this.gameState === 'PAUSED') { this.gameState = 'RACING'; this.ui.showPause(false); }
          return;
        }
        this.setKey(e.code, true);
      });
      window.addEventListener('keyup', e => this.setKey(e.code, false));
    }

    setKey(code, val) {
      if (code === 'KeyW' || code === 'ArrowUp') this.input.accel = val;
      if (code === 'KeyS' || code === 'ArrowDown') this.input.brake = val;
      if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = val;
      if (code === 'KeyD' || code === 'ArrowRight') this.input.right = val;
      if (code === 'Space') this.input.handbrake = val;
      if (code === 'KeyR') this.input.reset = val;
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

      const interval = setInterval(() => {
        this.countdownStep--;
        if (this.countdownStep > 0) {
          this.track.setSignalLights(String(this.countdownStep));
          this.ui.showCountdown(this.countdownStep);
          this.soundManager.playCountdown(this.countdownStep);
        } else {
          this.track.setSignalLights('GO');
          this.ui.showCountdown(0);
          this.soundManager.playCountdown(0);
          this.gameState = 'RACING';
          this.raceStartTime = performance.now();
          this.currentLapStartTime = this.raceStartTime;
          clearInterval(interval);
        }
      }, 1000);
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

      const racers = [
        { name: 'YOU', car: 'Apex GT Red', progress: this.playerPhysics.raceProgress, isPlayer: true, time: totalTime },
        ...this.aiController.getRacers().map(r => ({
          name: r.profile.name,
          car: r.profile.team,
          progress: r.physics.raceProgress,
          isPlayer: false,
          time: Math.max(totalTime + (this.playerPhysics.raceProgress - r.physics.raceProgress) * 12000, 35000)
        }))
      ].sort((a, b) => b.progress - a.progress);

      const rank = racers.findIndex(r => r.isPlayer) + 1;
      this.ui.showFinishScreen(rank, totalTime, this.bestLapTime, racers);
    }

    animate() {
      requestAnimationFrame(this.animate);
      const dt = Math.min(this.clock.getDelta(), 0.1);

      if (this.gameState === 'RACING') {
        const now = performance.now();
        this.raceElapsedTime = now - this.raceStartTime;
        const prevLap = this.playerPhysics.currentLap;

        this.playerPhysics.update(this.input, dt, this.soundManager, this.particles, this.chaseCamera);

        if (this.playerPhysics.currentLap > prevLap) {
          const lapTime = now - this.currentLapStartTime;
          this.currentLapStartTime = now;
          if (lapTime < this.bestLapTime) { this.bestLapTime = lapTime; this.ui.bestLapTime = lapTime; }
        }

        if (this.playerPhysics.raceFinished) this.onRaceFinished();

        this.aiController.update(dt, true, this.playerPhysics);
        this.soundManager.updateEngine(this.playerPhysics.speed, this.playerPhysics.maxSpeed, this.input.accel);
        this.ui.update(this.playerPhysics, this.aiController.getRacers(), this.raceElapsedTime);
        this.chaseCamera.update(this.playerPhysics.position, this.playerPhysics.yaw, this.playerPhysics.speed, this.playerPhysics.maxSpeed, dt);
      } else if (this.gameState === 'MENU') {
        const t = performance.now() * 0.0004;
        this.camera.position.set(this.playerPhysics.position.x + Math.sin(t) * 9, this.playerPhysics.position.y + 3.2, this.playerPhysics.position.z + Math.cos(t) * 9);
        this.camera.lookAt(this.playerPhysics.position.x, this.playerPhysics.position.y + 1.0, this.playerPhysics.position.z);
      } else if (this.gameState === 'COUNTDOWN') {
        this.chaseCamera.update(this.playerPhysics.position, this.playerPhysics.yaw, 0, this.playerPhysics.maxSpeed, dt);
      }

      this.particles.update(dt);
      this.sunLight.position.x = this.camera.position.x + 80;
      this.sunLight.position.z = this.camera.position.z + 60;
      this.sunLight.target.position.copy(this.camera.position);
      this.sunLight.target.updateMatrixWorld();

      this.renderer.render(this.scene, this.camera);
    }
  }

  window.addEventListener('DOMContentLoaded', () => { new Game(); });
})();
