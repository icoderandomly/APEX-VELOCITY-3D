// ============================================================================
// APEX VELOCITY 3D - AI Opponent Racing Controller
// Waypoint spline navigation with dynamic corner braking, lane offsets, and overtaking
// ============================================================================

import * as THREE from 'three';
import { CarModel } from './car.js';
import { CarPhysics } from './physics.js';

export class AIController {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    this.aiRacers = [];

    this.initOpponents();
  }

  initOpponents() {
    // 4 Distinct AI Competitors
    const profiles = [
      {
        name: 'V. Rossi',
        team: 'Viper Cobalt',
        primaryColor: 0x1a73e8,
        laneOffset: -2.8,
        baseSpeed: 52.0,
        aggressiveness: 1.05
      },
      {
        name: 'S. Vance',
        team: 'Phantom Neon',
        primaryColor: 0x2bd95d,
        laneOffset: 2.5,
        baseSpeed: 50.5,
        aggressiveness: 0.98
      },
      {
        name: 'M. Sterling',
        team: 'Solar Gold',
        primaryColor: 0xf59e0b,
        laneOffset: -1.2,
        baseSpeed: 53.0,
        aggressiveness: 1.08
      },
      {
        name: 'L. Vega',
        team: 'Shadow Violet',
        primaryColor: 0x9333ea,
        laneOffset: 1.4,
        baseSpeed: 49.5,
        aggressiveness: 0.95
      }
    ];

    profiles.forEach((p, idx) => {
      const model = new CarModel({
        name: p.name,
        primaryColor: p.primaryColor,
        isPlayer: false
      });
      this.scene.add(model.group);

      const physics = new CarPhysics(model, this.track, false);
      physics.maxSpeed = p.baseSpeed * (0.95 + Math.random() * 0.1);
      physics.acceleration = 22.0 * p.aggressiveness;

      this.aiRacers.push({
        profile: p,
        model,
        physics,
        lookaheadT: 0.045 + Math.random() * 0.015,
        laneOffset: p.laneOffset,
        speedVariation: 1.0
      });
    });
  }

  resetGrid() {
    const gridSlots = [
      { lane: 3.5, tOffset: 0.993 },  // Grid 2
      { lane: -3.5, tOffset: 0.985 }, // Grid 3
      { lane: 3.5, tOffset: 0.977 },  // Grid 4
      { lane: -3.5, tOffset: 0.969 }  // Grid 5
    ];

    this.aiRacers.forEach((racer, idx) => {
      const slot = gridSlots[idx];
      const centerPt = this.track.spline.getPointAt(slot.tOffset);
      const tangent = this.track.spline.getTangentAt(slot.tOffset).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const spawnPos = centerPt.clone().addScaledVector(normal, slot.lane);
      racer.physics.reset(spawnPos, tangent, 1);
      racer.stuckTime = 0;
    });
  }

  update(dt, isRaceActive, playerCar) {
    if (!isRaceActive) return;

    this.aiRacers.forEach(racer => {
      const { physics, profile } = racer;

      // Current spline progression
      const currentSpline = this.track.getSplineProgress(physics.position);

      // Lookahead waypoint along track spline (0.04 t ahead)
      const targetT = (currentSpline.t + racer.lookaheadT) % 1.0;
      const targetCenter = this.track.spline.getPointAt(targetT);
      const targetTangent = this.track.spline.getTangentAt(targetT).normalize();
      const targetNormal = new THREE.Vector3().crossVectors(targetTangent, new THREE.Vector3(0, 1, 0)).normalize();

      // Target position with lane offset
      const targetPos = targetCenter.clone().addScaledVector(targetNormal, racer.laneOffset);

      // Angle-Based Navigation (Robust 360-degree heading)
      const dx = targetPos.x - physics.position.x;
      const dz = targetPos.z - physics.position.z;
      const targetAngle = Math.atan2(-dx, -dz);

      let angleDiff = targetAngle - physics.yaw;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const steerAmount = Math.max(-1.0, Math.min(1.0, angleDiff * 3.2));

      const input = {
        left: steerAmount > 0.05,
        right: steerAmount < -0.05,
        accel: true,
        brake: false,
        handbrake: false,
        reset: false
      };

      // Intelligent Corner Braking: inspect upcoming curvature
      const curvatureLookahead = (currentSpline.t + 0.05) % 1.0;
      const t1 = this.track.spline.getTangentAt(currentSpline.t).normalize();
      const t2 = this.track.spline.getTangentAt(curvatureLookahead).normalize();
      const angleDelta = t1.angleTo(t2);

      // Scale cornering speed based on upcoming curve angle
      const safeSpeed = angleDelta > 0.06 ? Math.max(52.0 - angleDelta * 130.0, 26.0) : physics.maxSpeed;

      if (physics.speed > safeSpeed) {
        input.accel = false;
        input.brake = true;
      }

      // Proximity collision avoidance with player
      if (playerCar) {
        const distToPlayer = physics.position.distanceTo(playerCar.position);
        if (distToPlayer < 7.0) {
          const forwardVec = new THREE.Vector3(-Math.sin(physics.yaw), 0, -Math.cos(physics.yaw));
          const toPlayer = playerCar.position.clone().sub(physics.position);
          if (toPlayer.dot(forwardVec) > 0) {
            input.accel = false;
            if (distToPlayer < 4.0) input.brake = true;
          }
        }
      }

      // Anti-Stuck Watchdog: if stuck for > 1.2s, recover smoothly
      if (physics.speed < 6.0) {
        racer.stuckTime = (racer.stuckTime || 0) + dt;
        if (racer.stuckTime > 1.2) {
          physics.resetToNearestTrack();
          physics.speed = 22.0;
          racer.stuckTime = 0;
        }
      } else {
        racer.stuckTime = 0;
      }

      // Update AI physics
      physics.update(input, dt, null, null, null);
    });
  }

  // Retrieve list of all AI racers for leaderboard and positions
  getRacers() {
    return this.aiRacers;
  }
}
