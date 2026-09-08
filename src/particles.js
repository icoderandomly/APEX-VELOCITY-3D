// ============================================================================
// APEX VELOCITY 3D - Particle Effects System
// High-performance tire smoke, collision sparks, and speed visuals
// ============================================================================

import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;

    // Tire Smoke Pool
    this.maxSmoke = 120;
    this.smokeParticles = [];
    this.smokeIndex = 0;

    const smokeGeo = new THREE.SphereGeometry(0.35, 6, 6);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });

    this.smokeMeshGroup = new THREE.Group();
    this.scene.add(this.smokeMeshGroup);

    for (let i = 0; i < this.maxSmoke; i++) {
      const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
      mesh.visible = false;
      this.smokeMeshGroup.add(mesh);
      this.smokeParticles.push({
        mesh,
        life: 0,
        maxLife: 0.8,
        velocity: new THREE.Vector3(),
        startScale: 0.4,
        endScale: 1.8
      });
    }

    // Collision Spark Pool
    this.maxSparks = 60;
    this.sparks = [];
    const sparkGeo = new THREE.SphereGeometry(0.12, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffaa11,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });

    this.sparkGroup = new THREE.Group();
    this.scene.add(this.sparkGroup);

    for (let i = 0; i < this.maxSparks; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
      mesh.visible = false;
      this.sparkGroup.add(mesh);
      this.sparks.push({
        mesh,
        life: 0,
        maxLife: 0.4,
        velocity: new THREE.Vector3()
      });
    }
  }

  emitSmoke(position, carVelocity) {
    const p = this.smokeParticles[this.smokeIndex];
    this.smokeIndex = (this.smokeIndex + 1) % this.maxSmoke;

    p.life = p.maxLife;
    p.mesh.visible = true;
    p.mesh.position.copy(position);
    p.mesh.position.y += 0.15;

    // Slight drift opposite to car motion with random spread
    p.velocity.set(
      -carVelocity.x * 0.2 + (Math.random() - 0.5) * 1.5,
      0.8 + Math.random() * 0.8,
      -carVelocity.z * 0.2 + (Math.random() - 0.5) * 1.5
    );

    p.mesh.scale.setScalar(p.startScale);
    p.mesh.material.opacity = 0.5;
  }

  emitSparks(position, normal) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * this.maxSparks);
      const spark = this.sparks[idx];

      spark.life = spark.maxLife * (0.6 + Math.random() * 0.4);
      spark.mesh.visible = true;
      spark.mesh.position.copy(position);

      const speed = 6 + Math.random() * 10;
      spark.velocity.set(
        normal.x * speed + (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        normal.z * speed + (Math.random() - 0.5) * 8
      );

      spark.mesh.material.opacity = 1;
      spark.mesh.material.color.setHex(Math.random() > 0.4 ? 0xffcc00 : 0xff4400);
    }
  }

  update(dt) {
    // Update Smoke
    for (let i = 0; i < this.maxSmoke; i++) {
      const p = this.smokeParticles[i];
      if (p.life > 0) {
        p.life -= dt;
        if (p.life <= 0) {
          p.mesh.visible = false;
        } else {
          p.mesh.position.addScaledVector(p.velocity, dt);
          const progress = 1 - (p.life / p.maxLife);
          const scale = THREE.MathUtils.lerp(p.startScale, p.endScale, progress);
          p.mesh.scale.setScalar(scale);
          p.mesh.material.opacity = (1 - progress) * 0.45;
        }
      }
    }

    // Update Sparks
    for (let i = 0; i < this.maxSparks; i++) {
      const s = this.sparks[i];
      if (s.life > 0) {
        s.life -= dt;
        if (s.life <= 0) {
          s.mesh.visible = false;
        } else {
          s.velocity.y -= 25 * dt; // Gravity
          s.mesh.position.addScaledVector(s.velocity, dt);
          if (s.mesh.position.y < 0.05) {
            s.mesh.position.y = 0.05;
            s.velocity.y *= -0.3; // Bounce
          }
          const progress = 1 - (s.life / s.maxLife);
          s.mesh.material.opacity = 1 - progress;
        }
      }
    }
  }
}
