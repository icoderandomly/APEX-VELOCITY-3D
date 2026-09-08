// ============================================================================
// APEX VELOCITY 3D - Vehicle Dynamics & Arcade Physics Engine
// Features smooth acceleration, realistic drift mechanics, and boundary collision
// ============================================================================

import * as THREE from 'three';

export class CarPhysics {
  constructor(carModel, track, isPlayer = true) {
    this.carModel = carModel;
    this.track = track;
    this.isPlayer = isPlayer;

    // Kinematics
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = 0; // Rotation around Y axis in radians
    this.speed = 0; // Longitudinal speed in m/s
    this.steerAngle = 0;
    this.driftScore = 0;
    this.isDrifting = false;
    this.isBraking = false;

    // Performance Tuning Parameters
    this.maxSpeed = 58.0;          // ~210 km/h top speed
    this.maxReverseSpeed = -15.0;  // ~54 km/h reverse
    this.acceleration = 24.0;      // m/s^2 forward thrust
    this.brakeForce = 38.0;        // Strong braking
    this.handbrakeGrip = 0.35;     // Reduces lateral grip for drifting
    this.normalLateralGrip = 0.88; // Crisp cornering grip
    this.rollingFriction = 3.5;    // Coasting decay
    this.airDrag = 0.0022;         // Drag at high speeds
    this.maxSteerAngle = 0.52;     // ~30 degrees max steer
    this.steerSpeed = 4.2;

    // Collision state
    this.lastCollisionTime = 0;

    // Race progress state
    this.currentLap = 1;
    this.totalLaps = 3;
    this.lastCheckpointIdx = 0;
    this.lapCheckpointsPassed = 0;
    this.raceFinished = false;
    this.lapTimes = [];
    this.currentLapStartTime = 0;
    this.isWrongWay = false;
    this.raceProgress = 0; // Total distance/spline progress across laps
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
    this.lapTimes = [];
    this.isWrongWay = false;
    this.raceProgress = 0;

    // Align yaw to track tangent
    this.yaw = Math.atan2(-startTangent.x, -startTangent.z);

    this.updateModelTransform();
  }

  // Handle user input controls
  update(input, dt, soundManager, particleSystem, camera) {
    if (this.raceFinished) {
      // Natural deceleration after finishing
      input = { accel: false, brake: true, left: false, right: false, handbrake: false, reset: false };
    }

    // Reset Car Key ('R')
    if (input.reset) {
      this.resetToNearestTrack();
      return;
    }

    // 1. Steering Dynamics (Steering sensitivity decreases at top speed for stability)
    const speedRatio = Math.min(Math.abs(this.speed) / this.maxSpeed, 1.0);
    const effectiveMaxSteer = THREE.MathUtils.lerp(this.maxSteerAngle, this.maxSteerAngle * 0.42, speedRatio);

    let targetSteer = 0;
    if (input.left) targetSteer += effectiveMaxSteer;
    if (input.right) targetSteer -= effectiveMaxSteer;

    this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, targetSteer, this.steerSpeed * dt);

    // 2. Acceleration / Braking Forces
    let isBraking = false;
    if (input.accel) {
      if (this.speed < 0) {
        // Braking while in reverse
        this.speed += this.brakeForce * dt;
      } else {
        // Forward acceleration (tapers near top speed)
        const powerFactor = Math.max(1.0 - (this.speed / this.maxSpeed) * 0.7, 0.2);
        this.speed += this.acceleration * powerFactor * dt;
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
      }
    } else if (input.brake) {
      if (this.speed > 0.5) {
        // Active forward braking
        this.speed -= this.brakeForce * dt;
        isBraking = true;
      } else {
        // Reverse
        this.speed -= this.acceleration * 0.5 * dt;
        if (this.speed < this.maxReverseSpeed) this.speed = this.maxReverseSpeed;
        isBraking = true;
      }
    } else {
      // Coasting Friction
      if (this.speed > 0) {
        this.speed = Math.max(this.speed - this.rollingFriction * dt, 0);
      } else if (this.speed < 0) {
        this.speed = Math.min(this.speed + this.rollingFriction * dt, 0);
      }
    }

    // Air Resistance
    this.speed -= this.speed * Math.abs(this.speed) * this.airDrag * dt;
    this.isBraking = isBraking;

    // 3. Yaw Rotation & Angular Velocity
    // Effective turning speed has a minimum floor so slow or stopped cars can steer away from walls
    const effectiveSpeed = Math.max(Math.abs(this.speed), 8.0) * (this.speed < -0.2 ? -1 : 1);
    const turnRate = (effectiveSpeed / 2.8) * Math.tan(this.steerAngle);
    this.yaw += turnRate * dt;

    // 4. Direction Vectors & Drift Mechanics
    const forwardVec = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const rightVec = new THREE.Vector3(forwardVec.z, 0, -forwardVec.x);

    // Lateral grip vs drift slip
    let lateralGrip = input.handbrake ? this.handbrakeGrip : this.normalLateralGrip;
    if (input.handbrake && Math.abs(this.speed) > 10) {
      // Handbrake induces aggressive rotation
      this.yaw += (this.steerAngle * 1.8) * dt;
      this.speed -= this.brakeForce * 0.45 * dt;
    }

    // Resolve longitudinal and lateral velocity
    const currentForwardSpeed = this.velocity.dot(forwardVec);
    const currentLateralSpeed = this.velocity.dot(rightVec);

    const targetForwardVel = forwardVec.clone().multiplyScalar(this.speed);
    const dampedLateralVel = rightVec.clone().multiplyScalar(currentLateralSpeed * (1 - lateralGrip));

    this.velocity.copy(targetForwardVel).add(dampedLateralVel);

    // Detect Drift
    const slipAngle = Math.abs(currentLateralSpeed);
    const driftCondition = (input.handbrake || slipAngle > 4.5) && Math.abs(this.speed) > 12;
    this.isDrifting = driftCondition;

    if (driftCondition) {
      this.driftScore += Math.floor(slipAngle * 10 * dt);
      if (particleSystem && this.isPlayer) {
        // Emit smoke from rear wheels
        const leftRear = this.position.clone().addScaledVector(rightVec, -0.9).addScaledVector(forwardVec, -1.5);
        const rightRear = this.position.clone().addScaledVector(rightVec, 0.9).addScaledVector(forwardVec, -1.5);
        particleSystem.emitSmoke(leftRear, this.velocity);
        particleSystem.emitSmoke(rightRear, this.velocity);
      }
    }

    // Update Skid Sound
    if (soundManager && this.isPlayer) {
      const skidIntensity = input.handbrake ? 0.9 : Math.min(slipAngle / 9.0, 1.0);
      soundManager.updateSkid(skidIntensity);
    }

    // 5. Integrate Position
    this.position.addScaledVector(this.velocity, dt);

    // 6. Track Boundaries & Collision Detection
    this.handleTrackBoundaries(dt, soundManager, particleSystem, camera);

    // 7. Checkpoints, Progress & Lap Management
    this.updateCheckpoints();

    // 8. Update 3D Model
    this.updateModelTransform();
    this.carModel.updateVisuals(this.speed, this.steerAngle, this.isBraking, dt);
  }

  // Collide with steel barriers if car strays beyond track width
  handleTrackBoundaries(dt, soundManager, particleSystem, camera) {
    const progress = this.track.getSplineProgress(this.position);

    // Match elevation smoothly with track surface
    const targetY = progress.centerPoint.y;
    this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, 12 * dt);

    const halfTrack = this.track.trackWidth / 2;
    const carHalfWidth = 1.0;
    const maxAllowedDist = halfTrack - carHalfWidth;

    if (progress.distanceFromCenter > maxAllowedDist) {
      // Car struck outer or inner barrier!
      const sideSign = progress.lateralDist > 0 ? 1 : -1;
      // Push back inside boundary
      const clampedOffset = sideSign * maxAllowedDist;
      const barrierNormal = progress.normal.clone().multiplyScalar(-sideSign);

      this.position.copy(progress.centerPoint).addScaledVector(progress.normal, clampedOffset);
      this.position.y = targetY;

      // Align car heading smoothly towards track direction so it glances off rather than sticking
      const trackYaw = Math.atan2(-progress.tangent.x, -progress.tangent.z);
      let yawDelta = trackYaw - this.yaw;
      while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
      while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
      this.yaw += yawDelta * 0.4;

      // Elastic barrier rebound with speed preservation along track
      const impactSpeed = Math.abs(this.speed);
      this.speed = Math.max(impactSpeed * 0.72, 10.0); // Maintain forward speed
      this.velocity.copy(progress.tangent).multiplyScalar(this.speed);
      this.velocity.addScaledVector(barrierNormal, 4.0); // Deflect away from barrier

      const now = performance.now();
      if (now - this.lastCollisionTime > 250) {
        this.lastCollisionTime = now;

        if (this.isPlayer) {
          if (soundManager) soundManager.playCrash(Math.min(impactSpeed / 25, 1.0));
          if (camera) camera.addShake(Math.min(impactSpeed / 30, 0.8));

          // Screen collision flash
          const flash = document.getElementById('collision-flash');
          if (flash) {
            flash.style.opacity = '0.7';
            setTimeout(() => { flash.style.opacity = '0'; }, 80);
          }
        }

        if (particleSystem) {
          particleSystem.emitSparks(this.position, barrierNormal);
        }
      }
    }
  }

  // Checkpoints & Lap increment
  updateCheckpoints() {
    const { checkpoint, index } = this.track.getClosestCheckpoint(this.position);
    const numCheckpoints = this.track.checkpoints.length;

    // Check wrong way orientation
    const forwardVec = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const dot = forwardVec.dot(checkpoint.tangent);
    this.isWrongWay = dot < -0.35 && this.speed > 4;

    // Calculate race progression metric (continuous value)
    const t = index / numCheckpoints;
    this.raceProgress = (this.currentLap - 1) + t;

    // Robust sequential checkpoint validation (handles speed jumps up to 6 checkpoints ahead)
    const forwardDiff = (index - this.lastCheckpointIdx + numCheckpoints) % numCheckpoints;
    if (forwardDiff > 0 && forwardDiff <= 6) {
      // Check if crossing finish line (from high checkpoint back to 0)
      if (this.lastCheckpointIdx > numCheckpoints * 0.7 && index <= 3 && this.lapCheckpointsPassed >= numCheckpoints * 0.7) {
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

  // Reset car facing forward on track centerline
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

    // Tilt car pitch with track slope for realistic hill climbing and descending
    const progress = this.track.getSplineProgress(this.position);
    if (progress && progress.tangent) {
      const pitch = Math.asin(THREE.MathUtils.clamp(progress.tangent.y, -0.6, 0.6));
      this.carModel.group.rotation.x = -pitch;
    }
  }
}
