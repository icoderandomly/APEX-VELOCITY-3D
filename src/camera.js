// ============================================================================
// APEX VELOCITY 3D - Smooth Third-Person Chase Camera with Dynamic Shake
// ============================================================================

import * as THREE from 'three';

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;

    // Follow parameters
    this.distance = 6.2;
    this.height = 2.4;
    this.pitchOffset = 1.0;
    this.smoothPosSpeed = 7.0;
    this.smoothLookSpeed = 9.0;

    // Dynamic FOV
    this.baseFOV = 60;
    this.maxFOV = 75;

    // Camera shake
    this.shakeIntensity = 0;
    this.shakeDecay = 4.5;

    // Internal vectors
    this.currentPos = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    this.initialized = false;
  }

  reset(carPosition, carYaw) {
    const backward = new THREE.Vector3(Math.sin(carYaw), 0, Math.cos(carYaw));
    this.currentPos.copy(carPosition).addScaledVector(backward, this.distance);
    this.currentPos.y += this.height;

    this.currentLookAt.copy(carPosition);
    this.currentLookAt.y += this.pitchOffset;

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
    this.camera.fov = this.baseFOV;
    this.camera.updateProjectionMatrix();

    this.initialized = true;
  }

  addShake(amount) {
    this.shakeIntensity = Math.min(this.shakeIntensity + amount, 1.2);
  }

  update(carPosition, carRotationY, carSpeed, maxSpeed, dt) {
    if (!this.initialized) {
      this.reset(carPosition, carRotationY);
      return;
    }

    // Direction behind car
    const backward = new THREE.Vector3(Math.sin(carRotationY), 0, Math.cos(carRotationY));
    const forward = backward.clone().negate();

    // Target camera position
    const targetPos = carPosition.clone()
      .addScaledVector(backward, this.distance)
      .add(new THREE.Vector3(0, this.height, 0));

    // Dynamic FOV expansion with speed
    const normSpeed = Math.min(Math.max(Math.abs(carSpeed) / maxSpeed, 0), 1);
    const targetFOV = THREE.MathUtils.lerp(this.baseFOV, this.maxFOV, normSpeed);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, dt * 3);
    this.camera.updateProjectionMatrix();

    // Target look-at slightly ahead of the car
    const targetLookAt = carPosition.clone()
      .addScaledVector(forward, 2.5)
      .add(new THREE.Vector3(0, this.pitchOffset, 0));

    // Smooth lerp for position and lookAt
    const posAlpha = 1 - Math.exp(-this.smoothPosSpeed * dt);
    const lookAlpha = 1 - Math.exp(-this.smoothLookSpeed * dt);

    this.currentPos.lerp(targetPos, posAlpha);
    this.currentLookAt.lerp(targetLookAt, lookAlpha);

    // Apply collision shake offset
    if (this.shakeIntensity > 0.001) {
      this.shakeIntensity -= this.shakeDecay * dt;
      if (this.shakeIntensity < 0) this.shakeIntensity = 0;

      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.45;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.35;
      const shakeZ = (Math.random() - 0.5) * this.shakeIntensity * 0.45;

      this.camera.position.set(
        this.currentPos.x + shakeX,
        this.currentPos.y + shakeY,
        this.currentPos.z + shakeZ
      );
    } else {
      this.camera.position.copy(this.currentPos);
    }

    this.camera.lookAt(this.currentLookAt);
  }
}
