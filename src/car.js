// ============================================================================
// APEX VELOCITY 3D - High-Fidelity Supercar 3D Model
// Sculpted aerodynamic body, clearcoat metallic paint, detailed wheels, 
// Brembo-style brake calipers, LED projector lights, cockpit interior, and ambient shadow
// ============================================================================

import * as THREE from 'three';

export class CarModel {
  constructor(options = {}) {
    this.name = options.name || 'Racer';
    this.primaryColor = options.primaryColor || 0xe6194b;
    this.isPlayer = !!options.isPlayer;

    this.group = new THREE.Group();

    // References for animations
    this.wheelMeshes = [];
    this.frontWheelSteerGroups = [];
    this.brakeLightMats = [];
    this.headlights = [];
    this.spotLights = [];

    this.buildCar();
  }

  buildCar() {
    // 1. Premium Automotive Materials
    // Ultra-realistic clearcoat metallic car paint
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: this.primaryColor,
      metalness: 0.82,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.95
    });

    const matteCarbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x16181f,
      metalness: 0.35,
      roughness: 0.65
    });

    const glossyBlack = new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      metalness: 0.9,
      roughness: 0.15
    });

    const windshieldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x08101e,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.75,
      transparent: true,
      opacity: 0.85
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8ecf5,
      metalness: 0.98,
      roughness: 0.08
    });

    const rubberMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e2024,
      roughness: 0.88,
      metalness: 0.05
    });

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xd6dade,
      metalness: 0.92,
      roughness: 0.2
    });

    const brakeRotorMat = new THREE.MeshStandardMaterial({
      color: 0x999da4,
      metalness: 0.88,
      roughness: 0.35
    });

    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdd1122,
      metalness: 0.7,
      roughness: 0.3
    });

    // 2. Soft Ambient Contact Shadow Under the Car
    const shadowGeo = new THREE.PlaneGeometry(2.4, 5.0);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d');
    const grad = sctx.createRadialGradient(64, 128, 10, 64, 128, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 128, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.position.y = 0.04;
    this.group.add(shadowPlane);

    // 3. Lower Chassis, Diffuser & Front Splitter
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.24, 4.5), matteCarbonMaterial);
    lowerBody.position.y = 0.28;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.group.add(lowerBody);

    // Sculpted Carbon Front Splitter with Aero Winglets
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.65), matteCarbonMaterial);
    splitter.position.set(0, 0.16, -2.25);
    splitter.castShadow = true;
    this.group.add(splitter);

    const wingletGeo = new THREE.BoxGeometry(0.06, 0.16, 0.45);
    const wingletL = new THREE.Mesh(wingletGeo, matteCarbonMaterial);
    wingletL.position.set(-1.0, 0.22, -2.25);
    const wingletR = new THREE.Mesh(wingletGeo, matteCarbonMaterial);
    wingletR.position.set(1.0, 0.22, -2.25);
    this.group.add(wingletL, wingletR);

    // Rear Carbon Diffuser with Aero Fins
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 0.6), matteCarbonMaterial);
    diffuser.position.set(0, 0.22, 2.25);
    diffuser.rotation.x = -0.15;
    this.group.add(diffuser);

    for (let f = -0.6; f <= 0.6; f += 0.4) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.5), matteCarbonMaterial);
      fin.position.set(f, 0.24, 2.25);
      this.group.add(fin);
    }

    // 4. Main Body: Contoured Hood & Wheel Arches
    // Central tapered fuselage
    const centralBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.44, 4.1), bodyMaterial);
    centralBody.position.set(0, 0.52, -0.05);
    centralBody.castShadow = true;
    centralBody.receiveShadow = true;
    this.group.add(centralBody);

    // Front Flared Wheel Arches (Fenders)
    const frontFenderL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 1.4), bodyMaterial);
    frontFenderL.position.set(-0.9, 0.52, -1.35);
    frontFenderL.castShadow = true;
    const frontFenderR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 1.4), bodyMaterial);
    frontFenderR.position.set(0.9, 0.52, -1.35);
    frontFenderR.castShadow = true;
    this.group.add(frontFenderL, frontFenderR);

    // Rear Muscular Haunches
    const rearHaunchL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 1.6), bodyMaterial);
    rearHaunchL.position.set(-0.94, 0.56, 1.3);
    rearHaunchL.castShadow = true;
    const rearHaunchR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 1.6), bodyMaterial);
    rearHaunchR.position.set(0.94, 0.56, 1.3);
    rearHaunchR.castShadow = true;
    this.group.add(rearHaunchL, rearHaunchR);

    // Sloped Aerodynamic Hood with center power bulge
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.18, 1.55), bodyMaterial);
    hood.position.set(0, 0.56, -1.38);
    hood.rotation.x = 0.09;
    hood.castShadow = true;
    this.group.add(hood);

    // Hood Air Extraction Scoop
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.65), glossyBlack);
    scoop.position.set(0, 0.68, -1.25);
    this.group.add(scoop);

    // Front Grille with Dark Hex Mesh
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.15), glossyBlack);
    grille.position.set(0, 0.35, -2.26);
    this.group.add(grille);

    // Dual Racing Stripes
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 3.8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripeL.position.set(-0.16, 0.74, -0.15);
    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 3.8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripeR.position.set(0.16, 0.74, -0.15);
    this.group.add(stripeL, stripeR);

    // 5. Cockpit Cabin & Interior
    // Windshield & Side Windows
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.46, 1.9), windshieldMaterial);
    cabin.position.set(0, 0.89, 0.05);
    cabin.castShadow = true;
    this.group.add(cabin);

    // Sleek Tapered Roof Shell
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.06, 1.25), bodyMaterial);
    roof.position.set(0, 1.13, 0.12);
    roof.castShadow = true;
    this.group.add(roof);

    // Visible Interior Cockpit (Steering Wheel + Bucket Seats)
    const seatGeo = new THREE.BoxGeometry(0.42, 0.5, 0.45);
    const seatL = new THREE.Mesh(seatGeo, glossyBlack);
    seatL.position.set(-0.32, 0.82, 0.1);
    const seatR = new THREE.Mesh(seatGeo, glossyBlack);
    seatR.position.set(0.32, 0.82, 0.1);

    const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 16), chromeMaterial);
    steeringWheel.position.set(-0.32, 0.9, -0.28);
    steeringWheel.rotation.x = -0.3;
    this.group.add(seatL, seatR, steeringWheel);

    // Aerodynamic Side Mirrors
    const mirrorStemGeo = new THREE.BoxGeometry(0.15, 0.04, 0.04);
    const mirrorHousingGeo = new THREE.BoxGeometry(0.24, 0.11, 0.12);

    const mirrorL = new THREE.Group();
    mirrorL.position.set(-0.96, 0.82, -0.55);
    mirrorL.add(new THREE.Mesh(mirrorHousingGeo, bodyMaterial), new THREE.Mesh(mirrorStemGeo, matteCarbonMaterial));

    const mirrorR = new THREE.Group();
    mirrorR.position.set(0.96, 0.82, -0.55);
    mirrorR.add(new THREE.Mesh(mirrorHousingGeo, bodyMaterial), new THREE.Mesh(mirrorStemGeo, matteCarbonMaterial));
    this.group.add(mirrorL, mirrorR);

    // 6. GT Racing Wing & Quad Chrome Exhausts
    const wingPylonGeo = new THREE.BoxGeometry(0.06, 0.42, 0.22);
    const pylonL = new THREE.Mesh(wingPylonGeo, matteCarbonMaterial);
    pylonL.position.set(-0.52, 0.95, 1.8);
    pylonL.rotation.x = -0.2;
    const pylonR = new THREE.Mesh(wingPylonGeo, matteCarbonMaterial);
    pylonR.position.set(0.52, 0.95, 1.8);
    pylonR.rotation.x = -0.2;

    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.06, 0.42), matteCarbonMaterial);
    wingBlade.position.set(0, 1.15, 1.76);
    wingBlade.rotation.x = -0.09;
    wingBlade.castShadow = true;

    const endplateGeo = new THREE.BoxGeometry(0.04, 0.28, 0.48);
    const endplateL = new THREE.Mesh(endplateGeo, bodyMaterial);
    endplateL.position.set(-0.98, 1.16, 1.76);
    const endplateR = new THREE.Mesh(endplateGeo, bodyMaterial);
    endplateR.position.set(0.98, 1.16, 1.76);
    this.group.add(pylonL, pylonR, wingBlade, endplateL, endplateR);

    // Quad Polished Chrome Exhaust Tips
    const exhaustGeo = new THREE.CylinderGeometry(0.075, 0.08, 0.32, 16);
    exhaustGeo.rotateX(Math.PI / 2);
    [-0.42, -0.24, 0.24, 0.42].forEach(x => {
      const tip = new THREE.Mesh(exhaustGeo, chromeMaterial);
      tip.position.set(x, 0.28, 2.15);
      this.group.add(tip);
    });

    // 7. Projector LED Headlights & Full-Width LED Taillights
    const headHousingGeo = new THREE.BoxGeometry(0.42, 0.12, 0.18);
    const headGlassGeo = new THREE.BoxGeometry(0.38, 0.08, 0.06);
    const headLedMat = new THREE.MeshBasicMaterial({ color: 0x90e0ef });

    const headL = new THREE.Mesh(headGlassGeo, headLedMat);
    headL.position.set(-0.65, 0.53, -2.12);
    const headR = new THREE.Mesh(headGlassGeo, headLedMat);
    headR.position.set(0.65, 0.53, -2.12);
    this.group.add(headL, headR);

    // Front Projector Headlights Light Cones
    if (this.isPlayer) {
      const spotL = new THREE.SpotLight(0xffffff, 3.5, 45, Math.PI / 6, 0.5);
      spotL.position.set(-0.65, 0.55, -2.1);
      const targetL = new THREE.Object3D();
      targetL.position.set(-0.65, 0, -28);
      this.group.add(targetL);
      spotL.target = targetL;
      this.group.add(spotL);

      const spotR = new THREE.SpotLight(0xffffff, 3.5, 45, Math.PI / 6, 0.5);
      spotR.position.set(0.65, 0.55, -2.1);
      const targetR = new THREE.Object3D();
      targetR.position.set(0.65, 0, -28);
      this.group.add(targetR);
      spotR.target = targetR;
      this.group.add(spotR);

      this.spotLights.push(spotL, spotR);
    }

    // Full-Width Sleek LED Brake Light Bar
    const tailBarGeo = new THREE.BoxGeometry(1.5, 0.08, 0.08);
    const tailBarMat = new THREE.MeshBasicMaterial({ color: 0xaa0000 });
    const tailBar = new THREE.Mesh(tailBarGeo, tailBarMat);
    tailBar.position.set(0, 0.62, 2.05);
    this.group.add(tailBar);
    this.brakeLightMats.push(tailBarMat);

    // 8. Detailed Sport Wheels (Alloy Rims + Drilled Rotors + Red Calipers)
    const wheelPositions = [
      { x: -0.96, y: 0.36, z: -1.35, isFront: true },
      { x: 0.96, y: 0.36, z: -1.35, isFront: true },
      { x: -0.98, y: 0.38, z: 1.35, isFront: false },
      { x: 0.98, y: 0.38, z: 1.35, isFront: false }
    ];

    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 24);
    tireGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.29, 16);
    rimGeo.rotateZ(Math.PI / 2);

    const rotorGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16);
    rotorGeo.rotateZ(Math.PI / 2);

    const caliperGeo = new THREE.BoxGeometry(0.08, 0.12, 0.14);

    wheelPositions.forEach((p) => {
      const steerGroup = new THREE.Group();
      steerGroup.position.set(p.x, p.y, p.z);

      // Brake Assembly (stays stationary while wheel spins)
      const brakeAssembly = new THREE.Group();
      const rotor = new THREE.Mesh(rotorGeo, brakeRotorMat);
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(p.x > 0 ? -0.06 : 0.06, 0.08, 0);
      brakeAssembly.add(rotor, caliper);
      steerGroup.add(brakeAssembly);

      // Wheel Roll Group (spins with speed)
      const rollGroup = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, rubberMaterial);
      tire.castShadow = true;

      const rim = new THREE.Mesh(rimGeo, rimMaterial);

      // 5-Spoke Wheel Pattern
      for (let s = 0; s < 5; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.04, 0.04), chromeMaterial);
        spoke.rotation.x = (s * Math.PI * 2) / 5;
        rollGroup.add(spoke);
      }

      rollGroup.add(tire, rim);
      steerGroup.add(rollGroup);

      this.group.add(steerGroup);
      this.wheelMeshes.push(rollGroup);

      if (p.isFront) {
        this.frontWheelSteerGroups.push(steerGroup);
      }
    });
  }

  updateVisuals(speed, steerAngle, isBraking, dt) {
    // Spin wheels
    const rollDelta = (speed / (0.36 * Math.PI * 2)) * (Math.PI * 2) * dt;
    this.wheelMeshes.forEach(w => w.rotation.x += rollDelta);

    // Steer front wheels
    this.frontWheelSteerGroups.forEach(s => s.rotation.y = steerAngle);

    // Brake lights glow
    const col = isBraking ? 0xff1122 : 0x770000;
    this.brakeLightMats.forEach(m => m.color.setHex(col));
  }
}
