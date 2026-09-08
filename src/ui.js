// ============================================================================
// APEX VELOCITY 3D - Racing Heads-Up Display & UI Manager
// Real-time analog/digital speedometer, radar mini-map, position calculator, and modals
// ============================================================================

export class UIManager {
  constructor(track, soundManager) {
    this.track = track;
    this.soundManager = soundManager;

    // DOM Elements
    this.hudElement = document.getElementById('hud');
    this.speedText = document.getElementById('hud-speed');
    this.gaugeFill = document.getElementById('gauge-fill');
    this.gearText = document.getElementById('hud-gear');
    this.lapText = document.getElementById('hud-lap');
    this.timerText = document.getElementById('hud-timer');
    this.bestLapText = document.getElementById('hud-best-lap');
    this.posText = document.getElementById('hud-pos');
    this.speedLines = document.getElementById('speed-lines');

    // Overlays & Alerts
    this.countdownBanner = document.getElementById('countdown-banner');
    this.countdownText = document.getElementById('countdown-text');
    this.driftNotification = document.getElementById('drift-notification');
    this.driftPoints = document.getElementById('drift-points');
    this.wrongWayBanner = document.getElementById('wrong-way-banner');
    this.lapAnnouncement = document.getElementById('lap-announcement');
    this.lapAnnouncementText = document.getElementById('lap-announcement-text');

    // Modals
    this.startScreen = document.getElementById('start-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.finishScreen = document.getElementById('finish-screen');

    // Finish Results Elements
    this.finishTitle = document.getElementById('finish-title');
    this.finishPos = document.getElementById('finish-position');
    this.finalTotalTime = document.getElementById('final-total-time');
    this.finalBestLap = document.getElementById('final-best-lap');
    this.finalTopSpeed = document.getElementById('final-top-speed');
    this.leaderboardBody = document.getElementById('leaderboard-body');

    // Buttons
    this.btnStart = document.getElementById('btn-start');
    this.btnToggleAudio = document.getElementById('btn-toggle-audio');
    this.btnResume = document.getElementById('btn-resume');
    this.btnPauseRestart = document.getElementById('btn-pause-restart');
    this.btnPauseSound = document.getElementById('btn-pause-sound');
    this.btnRestart = document.getElementById('btn-restart');

    // Mini-map setup
    this.mapCanvas = document.getElementById('minimap-canvas');
    this.mapCtx = this.mapCanvas ? this.mapCanvas.getContext('2d') : null;
    this.initMinimapCache();

    // Stats tracking
    this.maxSpeedRecorded = 0;
    this.bestLapTime = Infinity;
    this.lastAnnouncedLap = 1;
  }

  initMinimapCache() {
    if (!this.track || !this.mapCanvas) return;

    // Determine bounding box of the track spline for proper map normalization
    const samples = 120;
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    this.mapPoints = [];
    for (let i = 0; i < samples; i++) {
      const pt = this.track.spline.getPointAt(i / samples);
      this.mapPoints.push(pt);
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.z < minZ) minZ = pt.z;
      if (pt.z > maxZ) maxZ = pt.z;
    }

    const padding = 16;
    const w = this.mapCanvas.width - padding * 2;
    const h = this.mapCanvas.height - padding * 2;

    const spanX = Math.max(maxX - minX, 1);
    const spanZ = Math.max(maxZ - minZ, 1);
    this.mapScale = Math.min(w / spanX, h / spanZ);

    this.mapOffsetX = (this.mapCanvas.width - spanX * this.mapScale) / 2 - minX * this.mapScale;
    this.mapOffsetZ = (this.mapCanvas.height - spanZ * this.mapScale) / 2 - minZ * this.mapScale;
  }

  formatTime(ms) {
    if (!ms || ms === Infinity || isNaN(ms)) return '--:--.--';
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  }

  reset() {
    this.lastAnnouncedLap = 1;
    this.maxSpeedRecorded = 0;
    this.bestLapTime = Infinity;
    this.countdownBanner.classList.add('hidden');
    this.wrongWayBanner.classList.add('hidden');
    this.driftNotification.classList.add('hidden');
    this.lapAnnouncement.classList.add('hidden');
  }

  showHUD() {
    this.hudElement.classList.remove('hidden');
    this.startScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.finishScreen.classList.add('hidden');
    this.wrongWayBanner.classList.add('hidden');
    this.driftNotification.classList.add('hidden');
    this.lapAnnouncement.classList.add('hidden');
  }

  showPause(show) {
    if (show) {
      this.pauseScreen.classList.remove('hidden');
    } else {
      this.pauseScreen.classList.add('hidden');
    }
  }

  showCountdown(count) {
    this.countdownBanner.classList.remove('hidden');
    if (count > 0) {
      this.countdownText.textContent = count;
      this.countdownText.style.color = '#ffffff';
    } else {
      this.countdownText.textContent = 'GO!';
      this.countdownText.style.color = '#00ff44';
      setTimeout(() => {
        this.countdownBanner.classList.add('hidden');
      }, 900);
    }
  }

  update(playerPhysics, aiRacers, raceElapsedTime, currentLapTime) {
    // 1. Speedometer Update (Convert m/s to km/h: 1 m/s = 3.6 km/h)
    const kmh = Math.round(Math.abs(playerPhysics.speed) * 3.6);
    this.speedText.textContent = kmh;

    if (kmh > this.maxSpeedRecorded) {
      this.maxSpeedRecorded = kmh;
    }

    // High speed motion blur effect (> 150 km/h)
    if (kmh > 150) {
      const speedAlpha = Math.min((kmh - 150) / 50, 1.0);
      this.speedLines.style.opacity = speedAlpha.toString();
    } else {
      this.speedLines.style.opacity = '0';
    }

    // Speedometer SVG Gauge Arc (stroke-dashoffset from 440 down to 100)
    const speedRatio = Math.min(kmh / 220, 1.0);
    const dashoffset = 440 - speedRatio * 340;
    this.gaugeFill.style.strokeDashoffset = dashoffset;

    // Dynamic Gear Calculation
    let gearText = 'GEAR 1';
    if (playerPhysics.speed < -0.5) {
      gearText = 'GEAR R';
    } else if (kmh > 165) {
      gearText = 'GEAR 5';
    } else if (kmh > 115) {
      gearText = 'GEAR 4';
    } else if (kmh > 70) {
      gearText = 'GEAR 3';
    } else if (kmh > 35) {
      gearText = 'GEAR 2';
    }
    this.gearText.textContent = gearText;

    // 2. Lap Display & Announcements
    this.lapText.innerHTML = `${playerPhysics.currentLap}<span class="hud-sub">/${playerPhysics.totalLaps}</span>`;

    if (playerPhysics.currentLap === playerPhysics.totalLaps && this.lastAnnouncedLap < playerPhysics.totalLaps) {
      this.lastAnnouncedLap = playerPhysics.currentLap;
      this.lapAnnouncementText.textContent = 'FINAL LAP!';
      this.lapAnnouncement.classList.remove('hidden');
      setTimeout(() => { this.lapAnnouncement.classList.add('hidden'); }, 2200);
    }

    // 3. Race Timer
    this.timerText.textContent = this.formatTime(raceElapsedTime);
    if (this.bestLapTime < Infinity) {
      this.bestLapText.textContent = this.formatTime(this.bestLapTime);
    }

    // 4. Live Position Calculation
    const allRacers = [
      { name: 'YOU', progress: playerPhysics.raceProgress, isPlayer: true },
      ...aiRacers.map(r => ({ name: r.profile.name, progress: r.physics.raceProgress, isPlayer: false }))
    ];

    allRacers.sort((a, b) => b.progress - a.progress);
    const playerRank = allRacers.findIndex(r => r.isPlayer) + 1;
    const suffixes = ['th', 'ST', 'ND', 'RD', 'TH', 'TH'];
    const suffix = suffixes[playerRank] || 'TH';
    this.posText.innerHTML = `${playerRank}<span class="hud-sub">/5</span>`;

    // 5. Wrong Way & Drift Alerts
    if (playerPhysics.isWrongWay) {
      this.wrongWayBanner.classList.remove('hidden');
    } else {
      this.wrongWayBanner.classList.add('hidden');
    }

    if (playerPhysics.isDrifting) {
      this.driftNotification.classList.remove('hidden');
      this.driftPoints.textContent = `+${playerPhysics.driftScore}`;
    } else {
      this.driftNotification.classList.add('hidden');
    }

    // 6. Mini-Map Drawing
    this.renderMinimap(playerPhysics, aiRacers);
  }

  renderMinimap(playerPhysics, aiRacers) {
    if (!this.mapCtx || !this.mapPoints) return;

    const ctx = this.mapCtx;
    const w = this.mapCanvas.width;
    const h = this.mapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw track circuit path
    ctx.strokeStyle = '#3a4454';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    this.mapPoints.forEach((pt, i) => {
      const mx = pt.x * this.mapScale + this.mapOffsetX;
      const my = pt.z * this.mapScale + this.mapOffsetZ;
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    });
    ctx.closePath();
    ctx.stroke();

    // Start/Finish Line marker
    const startPt = this.mapPoints[0];
    const smx = startPt.x * this.mapScale + this.mapOffsetX;
    const smy = startPt.z * this.mapScale + this.mapOffsetZ;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(smx, smy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw AI Opponents
    aiRacers.forEach(r => {
      const pos = r.physics.position;
      const ax = pos.x * this.mapScale + this.mapOffsetX;
      const ay = pos.z * this.mapScale + this.mapOffsetZ;

      ctx.fillStyle = `#${r.profile.primaryColor.toString(16).padStart(6, '0')}`;
      ctx.beginPath();
      ctx.arc(ax, ay, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Player Car (Glowing Red Arrow)
    const px = playerPhysics.position.x * this.mapScale + this.mapOffsetX;
    const py = playerPhysics.position.z * this.mapScale + this.mapOffsetZ;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-playerPhysics.yaw + Math.PI); // Coordinate rotation

    ctx.fillStyle = '#ff2a4b';
    ctx.shadowColor = '#ff2a4b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  showFinishScreen(playerRank, totalTime, bestLapTime, finalStandings) {
    this.hudElement.classList.add('hidden');
    this.finishScreen.classList.remove('hidden');

    if (playerRank === 1) {
      this.finishTitle.textContent = 'CHAMPION!';
      this.finishPos.textContent = '1ST PLACE - GOLD TROPHY';
      this.finishPos.style.color = '#ffb703';
    } else if (playerRank <= 3) {
      this.finishTitle.textContent = 'PODIUM FINISH!';
      this.finishPos.textContent = `${playerRank}${playerRank === 2 ? 'ND' : 'RD'} PLACE`;
      this.finishPos.style.color = '#00f0ff';
    } else {
      this.finishTitle.textContent = 'RACE FINISHED';
      this.finishPos.textContent = `${playerRank}TH PLACE`;
      this.finishPos.style.color = '#8e9bb4';
    }

    this.finalTotalTime.textContent = this.formatTime(totalTime);
    this.finalBestLap.textContent = this.formatTime(bestLapTime);
    this.finalTopSpeed.textContent = `${this.maxSpeedRecorded} KM/H`;

    // Populate Leaderboard Table
    this.leaderboardBody.innerHTML = '';
    finalStandings.forEach((racer, idx) => {
      const tr = document.createElement('tr');
      if (racer.isPlayer) {
        tr.classList.add('player-row');
      }

      tr.innerHTML = `
        <td>#${idx + 1}</td>
        <td>${racer.name}</td>
        <td>${racer.car}</td>
        <td>${this.formatTime(racer.time)}</td>
      `;
      this.leaderboardBody.appendChild(tr);
    });
  }
}
