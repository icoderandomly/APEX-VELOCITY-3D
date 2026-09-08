// ============================================================================
// APEX VELOCITY 3D - Vibrant Sunset Grand Prix Circuit with Dramatic Rolling Hills
// Features 26m vertical hill undulations, glowing sunset horizon, and vibrant scenery
// ============================================================================

import * as THREE from 'three';

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.trackWidth = 20.0;
    this.roadSegments = 450;
    this.checkpoints = [];

    // Exhilarating Roller-Coaster Circuit with Smooth Dramatic Elevation (-4m to +22m)
    // Completely clean, non-intersecting loop with 500m straightaways separated by 320m
    this.controlPoints = [
      // 1. Main Straightaway: Climbing from valley up to a massive 18m hilltop crest!
      new THREE.Vector3(160, 0.0, 50),       // Start / Finish Line (t = 0)
      new THREE.Vector3(160, 5.0, -30),      // Uphill climb begins
      new THREE.Vector3(160, 13.0, -110),    // Steep climb
      new THREE.Vector3(160, 19.0, -190),    // Hilltop Crest - Panoramic view over the sunset!
      new THREE.Vector3(160, 12.0, -270),    // Thrilling downhill plunge
      new THREE.Vector3(160, 2.0, -340),     // Valley floor approach

      // 2. Turn 1 & 2: Sweeping Carousel Curve in the Valley (Radius ~160m)
      new THREE.Vector3(135, -2.0, -410),    // Valley compression
      new THREE.Vector3(75, -4.0, -470),     // Lowest valley point (-4m)
      new THREE.Vector3(0, 0.0, -490),       // Mid-turn rise
      new THREE.Vector3(-75, 8.0, -470),     // Climbing out of the valley
      new THREE.Vector3(-135, 16.0, -410),   // Turn exit onto scenic elevated ridge

      // 3. Back Straightaway: High Ridge Plateau (22m elevation), then fast valley descent
      new THREE.Vector3(-160, 21.0, -340),   // Peak ridge entry
      new THREE.Vector3(-160, 22.0, -230),   // High mountain straightaway (22m peak)
      new THREE.Vector3(-160, 16.0, -120),   // Downhill roller-coaster speed trap
      new THREE.Vector3(-160, 8.0, 0),       // Fast descent
      new THREE.Vector3(-160, 1.0, 120),     // Leveling off
      new THREE.Vector3(-160, -3.0, 230),    // Valley dip
      new THREE.Vector3(-160, 3.0, 320),     // Uphill exit

      // 4. Turn 3 & 4: Sweeping South Crest Curve
      new THREE.Vector3(-135, 9.0, 400),     // Climbing south hill
      new THREE.Vector3(-75, 15.0, 460),     // Ridge curve
      new THREE.Vector3(0, 18.0, 480),       // South panoramic crest (18m elevation)
      new THREE.Vector3(75, 12.0, 460),      // Downhill curve
      new THREE.Vector3(135, 6.0, 400),      // Sweeping descent
      new THREE.Vector3(160, 2.0, 320),      // Back to main straight
      new THREE.Vector3(160, 0.8, 210),      // Leveling off
      new THREE.Vector3(160, 0.0, 120)       // Approach to Start/Finish line
    ];

    this.spline = new THREE.CatmullRomCurve3(this.controlPoints, true, 'centripetal', 0.5);

    this.buildSunset();
    this.buildRoadMesh();
    this.buildBarriers();
    this.buildCheckpoints();
    this.buildGrandstands();
    this.buildCleanScenery();
    this.buildMountains();
    this.buildStartGantry();
  }

  // Giant Radiant Sunset Sun on the Horizon
  buildSunset() {
    const sunGroup = new THREE.Group();
    // Positioned low on the northern horizon
    const sunPos = new THREE.Vector3(0, 110, -780);

    // Glowing Golden-White Sun Core Sphere
    const sunGeo = new THREE.SphereGeometry(42, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfffbe6
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.copy(sunPos);
    sunGroup.add(sunMesh);

    // Dramatic Multi-Layer Radiant Sunset Halo Corona
    const coronaGeo = new THREE.RingGeometry(38, 140, 36);
    const coronaCanvas = document.createElement('canvas');
    coronaCanvas.width = 512;
    coronaCanvas.height = 512;
    const cctx = coronaCanvas.getContext('2d');
    const radGrad = cctx.createRadialGradient(256, 256, 30, 256, 256, 256);
    radGrad.addColorStop(0, 'rgba(255, 245, 180, 0.95)');
    radGrad.addColorStop(0.25, 'rgba(255, 170, 60, 0.7)');
    radGrad.addColorStop(0.55, 'rgba(255, 90, 40, 0.35)');
    radGrad.addColorStop(0.8, 'rgba(220, 40, 90, 0.12)');
    radGrad.addColorStop(1, 'rgba(180, 20, 120, 0)');
    cctx.fillStyle = radGrad;
    cctx.fillRect(0, 0, 512, 512);

    const coronaTex = new THREE.CanvasTexture(coronaCanvas);
    const coronaMat = new THREE.MeshBasicMaterial({
      map: coronaTex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const corona = new THREE.Mesh(coronaGeo, coronaMat);
    corona.position.copy(sunPos);
    corona.lookAt(0, 50, 0);
    sunGroup.add(corona);

    this.scene.add(sunGroup);
  }

  // 3D Hilly Road Surface
  buildRoadMesh() {
    const halfWidth = this.trackWidth / 2;

    const roadPositions = [];
    const roadNormals = [];
    const roadUvs = [];
    const roadIndices = [];

    const curbPositions = [];
    const curbColors = [];
    const curbIndices = [];

    let vOffset = 0;
    let cOffset = 0;

    for (let i = 0; i <= this.roadSegments; i++) {
      const t = i / this.roadSegments;
      const pt = this.spline.getPointAt(t % 1.0);
      const tangent = this.spline.getTangentAt(t % 1.0).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const leftPt = pt.clone().addScaledVector(normal, -halfWidth);
      const rightPt = pt.clone().addScaledVector(normal, halfWidth);

      roadPositions.push(leftPt.x, leftPt.y + 0.02, leftPt.z);
      roadPositions.push(rightPt.x, rightPt.y + 0.02, rightPt.z);

      roadNormals.push(0, 1, 0, 0, 1, 0);
      roadUvs.push(0, t * 80, 1, t * 80);

      if (i < this.roadSegments) {
        roadIndices.push(vOffset, vOffset + 1, vOffset + 2);
        roadIndices.push(vOffset + 1, vOffset + 3, vOffset + 2);
        vOffset += 2;
      }

      // Bright Red & White Rumble Curbs
      const curbWidth = 1.3;
      const curbHeight = 0.14;
      const curbOutL = pt.clone().addScaledVector(normal, -halfWidth - curbWidth);
      const curbOutR = pt.clone().addScaledVector(normal, halfWidth + curbWidth);

      curbPositions.push(leftPt.x, leftPt.y + curbHeight, leftPt.z);
      curbPositions.push(curbOutL.x, curbOutL.y + 0.02, curbOutL.z);
      curbPositions.push(rightPt.x, rightPt.y + curbHeight, rightPt.z);
      curbPositions.push(curbOutR.x, curbOutR.y + 0.02, curbOutR.z);

      const isRed = Math.floor(t * 200) % 2 === 0;
      const color = isRed ? [1.0, 0.1, 0.1] : [1.0, 1.0, 1.0];
      curbColors.push(...color, ...color, ...color, ...color);

      if (i < this.roadSegments) {
        curbIndices.push(cOffset, cOffset + 1, cOffset + 4);
        curbIndices.push(cOffset + 1, cOffset + 5, cOffset + 4);
        curbIndices.push(cOffset + 2, cOffset + 3, cOffset + 6);
        curbIndices.push(cOffset + 3, cOffset + 7, cOffset + 6);
        cOffset += 4;
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);

    // Clean, High-Contrast Asphalt Texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#262932';
    ctx.fillRect(0, 0, 512, 512);

    for (let p = 0; p < 8000; p++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#1f2128' : '#2e323d';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // Crisp white boundary lines
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 0, 12, 512);
    ctx.fillRect(484, 0, 12, 512);

    // Glowing yellow dashed center line
    ctx.fillStyle = '#ffcc00';
    for (let y = 0; y < 512; y += 40) {
      ctx.fillRect(250, y, 12, 22);
    }

    const roadTexture = new THREE.CanvasTexture(canvas);
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(1, 80);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.82,
      metalness: 0.12
    });

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    // Curbs
    const curbGeo = new THREE.BufferGeometry();
    curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
    curbGeo.setAttribute('color', new THREE.Float32BufferAttribute(curbColors, 3));
    curbGeo.setIndex(curbIndices);
    curbGeo.computeVertexNormals();

    const curbMesh = new THREE.Mesh(curbGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
    curbMesh.castShadow = true;
    curbMesh.receiveShadow = true;
    this.scene.add(curbMesh);

    // Checkered Start / Finish Line Decal
    const finishGeo = new THREE.PlaneGeometry(this.trackWidth, 4.5);
    finishGeo.rotateX(-Math.PI / 2);

    const finishCanvas = document.createElement('canvas');
    finishCanvas.width = 256;
    finishCanvas.height = 64;
    const fctx = finishCanvas.getContext('2d');
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 16; c++) {
        fctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#111111';
        fctx.fillRect(c * 16, r * 16, 16, 16);
      }
    }
    const finishMesh = new THREE.Mesh(
      finishGeo,
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(finishCanvas) })
    );
    finishMesh.position.set(160, 0.05, 50);
    this.scene.add(finishMesh);

    // Lush Vibrant Emerald Green Rolling Hill Terrain
    const terrainGeo = new THREE.PlaneGeometry(1800, 1800, 50, 50);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      // Rolling natural landscape waves
      const hillElevation = Math.sin(x * 0.007) * 14 + Math.cos(z * 0.007) * 14;
      posAttr.setY(i, hillElevation - 10);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32, // Vibrant emerald grass green
      roughness: 0.88,
      metalness: 0.05
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    this.scene.add(terrain);
  }

  // Smooth Perimeter Barriers outside curbs (elevation matching road height)
  buildBarriers() {
    const barrierSegments = 360;
    const halfWidth = this.trackWidth / 2 + 1.4;

    const barrierGeo = new THREE.BoxGeometry(0.35, 0.9, 4.2);
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xa0a8b2,
      metalness: 0.85,
      roughness: 0.3
    });

    const barrierGroup = new THREE.Group();

    for (let i = 0; i < barrierSegments; i++) {
      const t = i / barrierSegments;
      const pt = this.spline.getPointAt(t);
      const tangent = this.spline.getTangentAt(t).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      // Left Barrier
      const leftPos = pt.clone().addScaledVector(normal, -halfWidth);
      leftPos.y += 0.45;
      const leftMesh = new THREE.Mesh(barrierGeo, steelMat);
      leftMesh.position.copy(leftPos);
      leftMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      barrierGroup.add(leftMesh);

      // Right Barrier
      const rightPos = pt.clone().addScaledVector(normal, halfWidth);
      rightPos.y += 0.45;
      const rightMesh = new THREE.Mesh(barrierGeo, steelMat);
      rightMesh.position.copy(rightPos);
      rightMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      barrierGroup.add(rightMesh);
    }

    this.scene.add(barrierGroup);
  }

  // Checkpoints
  buildCheckpoints() {
    const numCheckpoints = 40;
    for (let i = 0; i < numCheckpoints; i++) {
      const t = i / numCheckpoints;
      const point = this.spline.getPointAt(t);
      const tangent = this.spline.getTangentAt(t).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      this.checkpoints.push({
        index: i,
        t,
        position: point,
        tangent,
        normal,
        width: this.trackWidth
      });
    }
  }

  // Grandstands placed safely 32m away from track
  buildGrandstands() {
    const grandstandGroup = new THREE.Group();
    const standMat = new THREE.MeshStandardMaterial({ color: 0x2b3240, roughness: 0.7 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xff2a4b, roughness: 0.4 });

    // Main Straight Grandstand (East at X = 194 -> 34m away from track centerline)
    const stand1 = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 200), standMat);
    stand1.position.set(194, 4, -40);
    stand1.castShadow = true;

    const roof1 = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 204), roofMat);
    roof1.position.set(192, 9.5, -40);
    roof1.castShadow = true;
    grandstandGroup.add(stand1, roof1);

    // Back Straight Grandstand (West at X = -194 -> 34m away on elevated ridge)
    const stand2 = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 200), standMat);
    stand2.position.set(-194, 25, -200);
    stand2.castShadow = true;

    const roof2 = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 204), new THREE.MeshStandardMaterial({ color: 0x00f0ff }));
    roof2.position.set(-192, 30.5, -200);
    roof2.castShadow = true;
    grandstandGroup.add(stand2, roof2);

    this.scene.add(grandstandGroup);
  }

  // Clean Roadside Scenery: Pine trees placed strictly 30m to 85m outside the track
  buildCleanScenery() {
    const sceneryGroup = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 2.5, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x422f20, roughness: 0.9 });
    const foliageGeo1 = new THREE.ConeGeometry(2.8, 4.8, 7);
    const foliageGeo2 = new THREE.ConeGeometry(2.2, 3.8, 7);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.8 }); // Rich pine green

    for (let i = 0; i < 90; i++) {
      const t = Math.random();
      const pt = this.spline.getPointAt(t);
      const tangent = this.spline.getTangentAt(t).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const side = Math.random() > 0.5 ? 1 : -1;
      const safeDist = (this.trackWidth / 2) + 20 + Math.random() * 65; // At least 30m away

      const treePos = pt.clone().addScaledVector(normal, side * safeDist);
      treePos.y = Math.max(pt.y - 2.0, 0);

      const tree = new THREE.Group();
      tree.position.copy(treePos);

      const tr = new THREE.Mesh(trunkGeo, trunkMat);
      tr.position.y = 1.25;
      tr.castShadow = true;

      const f1 = new THREE.Mesh(foliageGeo1, foliageMat);
      f1.position.y = 3.8;
      f1.castShadow = true;

      const f2 = new THREE.Mesh(foliageGeo2, foliageMat);
      f2.position.y = 5.6;
      f2.castShadow = true;

      tree.add(tr, f1, f2);
      tree.scale.setScalar(0.85 + Math.random() * 0.6);
      sceneryGroup.add(tree);
    }

    this.scene.add(sceneryGroup);
  }

  // Majestic Mountains Catching the Sunset Glow
  buildMountains() {
    const mountainGroup = new THREE.Group();
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x3d2b45, // Purple/crimson sunset mountain silhouette
      roughness: 0.9,
      flatShading: true
    });

    const numPeaks = 30;
    const radius = 720;

    for (let i = 0; i < numPeaks; i++) {
      const angle = (i / numPeaks) * Math.PI * 2;
      const x = Math.cos(angle) * (radius + (Math.random() - 0.5) * 90);
      const z = Math.sin(angle) * (radius + (Math.random() - 0.5) * 90);
      const height = 160 + Math.random() * 200;
      const width = 180 + Math.random() * 110;

      const peak = new THREE.Mesh(new THREE.ConeGeometry(width, height, 5), mountainMat);
      peak.position.set(x, height / 2 - 10, z);
      mountainGroup.add(peak);
    }

    this.scene.add(mountainGroup);
  }

  // Overhead Gantry spanning at Start Line
  buildStartGantry() {
    const gantryGroup = new THREE.Group();
    const gantryHeight = 7.5;
    const gantrySpan = this.trackWidth + 8.0;

    const beamMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, metalness: 0.85, roughness: 0.3 });

    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, gantryHeight, 0.9), beamMat);
    leftPillar.position.set(160 - (gantrySpan / 2), gantryHeight / 2, 50);

    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, gantryHeight, 0.9), beamMat);
    rightPillar.position.set(160 + (gantrySpan / 2), gantryHeight / 2, 50);

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(gantrySpan + 2.0, 1.2, 1.4), beamMat);
    crossBeam.position.set(160, gantryHeight, 50);

    gantryGroup.add(leftPillar, rightPillar, crossBeam);

    // 5 Signal Lights
    const lightBezelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
    lightBezelGeo.rotateX(Math.PI / 2);

    this.signalLights = [];
    for (let i = 0; i < 5; i++) {
      const lightMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
      const light = new THREE.Mesh(lightBezelGeo, lightMat);
      light.position.set(160 - 2.4 + i * 1.2, gantryHeight - 1.3, 49.8);
      gantryGroup.add(light);
      this.signalLights.push(lightMat);
    }

    this.scene.add(gantryGroup);
  }

  setSignalLights(state) {
    if (!this.signalLights || this.signalLights.length === 0) return;
    if (state === '3') {
      this.signalLights.forEach((m, idx) => m.color.setHex(idx < 2 ? 0xff0000 : 0x330000));
    } else if (state === '2') {
      this.signalLights.forEach((m, idx) => m.color.setHex(idx < 4 ? 0xff0000 : 0x330000));
    } else if (state === '1') {
      this.signalLights.forEach(m => m.color.setHex(0xff0000));
    } else if (state === 'GO') {
      this.signalLights.forEach(m => m.color.setHex(0x00ff44));
    } else {
      this.signalLights.forEach(m => m.color.setHex(0x330000));
    }
  }

  getClosestCheckpoint(carPos) {
    let bestDist = Infinity;
    let bestIdx = 0;

    for (let i = 0; i < this.checkpoints.length; i++) {
      const d = carPos.distanceTo(this.checkpoints[i].position);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return { checkpoint: this.checkpoints[bestIdx], index: bestIdx, distance: bestDist };
  }

  getSplineProgress(carPos) {
    const { index } = this.getClosestCheckpoint(carPos);
    const n = this.checkpoints.length;
    let minD = Infinity;
    let bestT = 0;
    const baseT = index / n;

    for (let step = -5; step <= 5; step++) {
      const testT = (baseT + (step / (n * 10)) + 1.0) % 1.0;
      const pt = this.spline.getPointAt(testT);
      const d = carPos.distanceTo(pt);
      if (d < minD) {
        minD = d;
        bestT = testT;
      }
    }

    const centerPoint = this.spline.getPointAt(bestT);
    const tangent = this.spline.getTangentAt(bestT).normalize();
    const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
    const lateralDist = carPos.clone().sub(centerPoint).dot(normal);

    return {
      t: bestT,
      centerPoint,
      tangent,
      normal,
      lateralDist,
      distanceFromCenter: Math.abs(lateralDist)
    };
  }
}
