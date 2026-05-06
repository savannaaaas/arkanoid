const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");

let W, H;
let particles = [];

function getBallSpeed() {
  return Math.hypot(ball.dx, ball.dy);
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x,
      y,
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
      life: 30 + Math.random() * 20,
      color,
    });
  }
}

function clearTimer(name) {
  if (bonusEffects[name]) {
    clearTimeout(bonusEffects[name]);
    bonusEffects[name] = null;
  }
}

function clearBonusEffects() {
  clearTimer("expandTimer");
  clearTimer("slowTimer");
}

function resize() {
  W = canvas.width = innerWidth;
  H = canvas.height = innerHeight;
}
addEventListener("resize", resize);
resize();

function resetPaddle() {
  paddle.w = 160;
  paddle.y = H - 40;
  paddle.x = W / 2 - paddle.w / 2;
}

let audioCtx = null;
let soundsEnabled = false;

function initAudio() {
  if (!audioCtx && soundsEnabled) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
  }
}

function playSound(freq, type = "sine", duration = 0.08) {
  if (!audioCtx || !soundsEnabled) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + duration,
  );

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

let notifications = [];

function addNotification(text, color = "#0ff", duration = 1200) {
  notifications.push({
    text: text,
    color: color,
    x: W / 2,
    y: H - 100,
    alpha: 1,
    life: duration,
  });
}

let bonusEffects = {
  slow: false,
  expand: false,
  slowTimer: null,
  expandTimer: null,
};

const STORAGE_KEY = "arkanoid_save";

function saveGame() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      level,
      score,
    }),
  );
}

function loadGame() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return false;
  const parsed = JSON.parse(data);
  level = parsed.level;
  score = parsed.score;
  return true;
}

let state = "menu";
let level = 1;
let score = 0;

const paddle = { x: 0, y: 0, w: 160, h: 15 };
const ball = { x: 0, y: 0, r: 8, dx: 4, dy: -4 };

let bricks = [];
let bonuses = [];

function createLevel(lvl) {
  bricks = [];
  bonuses = [];
  const rows = 3 + lvl;
  const cols = 6;

  const bw = W / cols;
  const bh = 25;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      bricks.push({
        x: c * bw,
        y: 50 + r * bh,
        w: bw - 4,
        h: bh - 4,
        hp: 1 + Math.floor(lvl / 2),
        baseHue: (lvl * 35 + r * 10) % 360,
      });
    }
  }
}

function resetBall() {
  ball.x = W / 2;
  ball.y = H - 80;
  const isMobile = innerWidth < 768;
  const baseSpeed = isMobile ? 6.5 : 5.5;
  ball.dx = baseSpeed * (Math.random() > 0.5 ? 1 : -1);
  ball.dy = -baseSpeed;
  if (Math.abs(ball.dx) < 2) ball.dx = ball.dx > 0 ? 2 : -2;
}

function resetGame() {
  resetPaddle();
  resetBall();
  bonuses = [];
  createLevel(level);
}

function init() {
  resetGame();
}

let pointerX = W / 2;

addEventListener("mousemove", (e) => {
  if (state === "game") pointerX = e.clientX;
});
addEventListener("touchmove", (e) => {
  if (state === "game") {
    e.preventDefault();
    pointerX = e.touches[0].clientX;
  }
});

function update() {
  let targetX = pointerX - paddle.w / 2;
  targetX = Math.max(0, Math.min(targetX, W - paddle.w));
  paddle.x += (targetX - paddle.x) * 0.2;

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.dx *= -1;
    playSound(300);
  }
  if (ball.x + ball.r > W) {
    ball.x = W - ball.r;
    ball.dx *= -1;
    playSound(300);
  }
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.dy *= -1;
    playSound(300);
  }

  if (
    ball.dy > 0 &&
    ball.y + ball.r > paddle.y &&
    ball.y - ball.r < paddle.y + paddle.h &&
    ball.x + ball.r > paddle.x &&
    ball.x - ball.r < paddle.x + paddle.w
  ) {
    ball.y = paddle.y - ball.r;
    ball.dy *= -1;

    const hitPos = (ball.x - paddle.x) / paddle.w;
    const angle = (hitPos - 0.5) * 1.5;
    const speed = getBallSpeed();
    ball.dx = angle * speed * 1.2;
    ball.dy = -Math.abs(ball.dy);

    const currentSpeed = getBallSpeed();

    const isMobile = innerWidth < 768;

    const minSpeed = isMobile ? 4.5 : 4;
    const maxSpeed = isMobile ? 10 : 9;

    if (currentSpeed < minSpeed) {
      ball.dx = (ball.dx / currentSpeed) * minSpeed;
      ball.dy = (ball.dy / currentSpeed) * minSpeed;
    }
    if (currentSpeed > maxSpeed) {
      ball.dx = (ball.dx / currentSpeed) * maxSpeed;
      ball.dy = (ball.dy / currentSpeed) * maxSpeed;
    }

    playSound(400);
  }

  if (ball.y + ball.r > H) {
    state = "gameover";
    addNotification("💀 GAME OVER 💀", "#ff0000", 2000);
    document.getElementById("menu").style.display = "flex";
    playSound(120, "sawtooth", 0.3);
    return;
  }

  for (let i = bricks.length - 1; i >= 0; i--) {
    const b = bricks[i];

    if (
      ball.x + ball.r > b.x &&
      ball.x - ball.r < b.x + b.w &&
      ball.y + ball.r > b.y &&
      ball.y - ball.r < b.y + b.h
    ) {
      const overlapTop = Math.abs(ball.y + ball.r - b.y);
      const overlapBottom = Math.abs(ball.y - ball.r - (b.y + b.h));
      const overlapLeft = Math.abs(ball.x + ball.r - b.x);
      const overlapRight = Math.abs(ball.x - ball.r - (b.x + b.w));

      const minOverlap = Math.min(
        overlapTop,
        overlapBottom,
        overlapLeft,
        overlapRight,
      );

      if (minOverlap === overlapTop || minOverlap === overlapBottom) {
        ball.dy *= -1;
      } else {
        ball.dx *= -1;
      }

      b.hp--;
      score += 10;
      playSound(800);

      if (Math.random() < 0.2) {
        bonuses.push({
          x: b.x + b.w / 2,
          y: b.y + b.h / 2,
          type: Math.random() > 0.5 ? "expand" : "slow",
        });
      }

      if (b.hp <= 0) {
        spawnParticles(
          b.x + b.w / 2,
          b.y + b.h / 2,
          `hsl(${b.baseHue}, 80%, 60%)`,
        );
        bricks.splice(i, 1);
      }
      break;
    }
  }

  for (let i = bonuses.length - 1; i >= 0; i--) {
    const b = bonuses[i];
    b.y += 3;

    if (
      b.y + 5 > paddle.y &&
      b.y - 5 < paddle.y + paddle.h &&
      b.x + 5 > paddle.x &&
      b.x - 5 < paddle.x + paddle.w
    ) {
      if (b.type === "expand") {
        const oldWidth = paddle.w;
        paddle.w = Math.min(paddle.w + 40, W - 20);
        addNotification(`РАСШИРЕНИЕ!`, "#0ff", 1500);

        if (bonusEffects.expandTimer) clearTimeout(bonusEffects.expandTimer);
        bonusEffects.expandTimer = setTimeout(() => {
          if (state === "game") {
            paddle.w = Math.max(140, paddle.w - 40);
            addNotification(
              "ПЛАТФОРМА ВЕРНУЛАСЬ К ОБЫЧНОМУ СОСТОЯНИЮ",
              "#ffaa00",
              1200,
            );
          }
        }, 7000);
      }

      if (b.type === "slow") {
        const currentSpeed = getBallSpeed();
        const oldSpeed = Math.round(currentSpeed * 10) / 10;
        ball.dx *= 0.6;
        ball.dy *= 0.6;
        const newSpeed = Math.round(getBallSpeed() * 10) / 10;

        addNotification(`ЗАМЕДЛЕНИЕ СКОРОСТИ!`, "#ffaa00", 1500);

        if (bonusEffects.slowTimer) clearTimeout(bonusEffects.slowTimer);
        bonusEffects.slowTimer = setTimeout(() => {
          if (state === "game") {
            const currentSpd = getBallSpeed();
            const factor = 5.5 / currentSpd;
            ball.dx *= factor;
            ball.dy *= factor;
            addNotification("СКОРОСТЬ ВОССТАНОВЛЕНА!", "#0f0", 1200);
          }
        }, 5000);
      }

      playSound(200);
      bonuses.splice(i, 1);
      continue;
    }

    if (b.y - 5 > H) {
      addNotification("БОНУС УТЕРЯН!", "#ff6666", 800);
      bonuses.splice(i, 1);
    }
  }

  if (bricks.length === 0) {
    level++;
    addNotification(`УРОВЕНЬ ${level}!`, "#0f0", 2000);
    saveGame();
    resetGame();
    playSound(1000);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.dx;
    p.y += p.dy;
    p.dy += 0.05;
    p.life--;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updateNotifications() {
  for (let i = notifications.length - 1; i >= 0; i--) {
    const n = notifications[i];

    n.life -= 16;

    const t = n.life / 500;
    n.alpha = Math.max(0, Math.min(1, n.alpha));

    n.y -= 0.4;

    if (n.life <= 0) {
      notifications.splice(i, 1);
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawNotifications() {
  notifications.forEach((n) => {
    ctx.save();

    ctx.font = "500 16px Arial";
    ctx.textAlign = "center";
    ctx.globalAlpha = n.alpha;

    const paddingX = 18;
    const paddingY = 10;

    const metrics = ctx.measureText(n.text);
    const width = metrics.width + paddingX * 2;
    const height = 34;

    const x = n.x - width / 2;
    const y = n.y - height / 2;

    ctx.shadowBlur = 20;
    ctx.shadowColor = n.color;

    ctx.fillStyle = "rgba(10, 10, 20, 0.55)";
    roundRect(ctx, x, y, width, height, 12);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = n.color;
    ctx.globalAlpha = n.alpha * 0.7;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, width, height, 12);
    ctx.stroke();

    ctx.globalAlpha = n.alpha;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(n.text, n.x, n.y + 5);

    ctx.restore();
  });
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#0a0a2a");
  gradient.addColorStop(1, "#1a1a3a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  const paddleGradient = ctx.createLinearGradient(
    paddle.x,
    paddle.y,
    paddle.x,
    paddle.y + paddle.h,
  );

  paddleGradient.addColorStop(0, "#ff9ad5");
  paddleGradient.addColorStop(1, "#ff4fbf");

  ctx.fillStyle = paddleGradient;

  ctx.shadowBlur = 18;
  ctx.shadowColor = "#ff4fbf";

  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  ctx.shadowBlur = 0;

  const ballGradient = ctx.createRadialGradient(
    ball.x - 2,
    ball.y - 2,
    2,
    ball.x,
    ball.y,
    ball.r,
  );
  ballGradient.addColorStop(0, "#fff");
  ballGradient.addColorStop(1, "#0ff");
  ctx.fillStyle = ballGradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  bricks.forEach((b) => {
    const hue = b.baseHue + b.hp * 10;

    const color1 = `hsl(${hue}, 80%, 70%)`;
    const color2 = `hsl(${hue + 20}, 80%, 55%)`;

    const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    g.addColorStop(0, color1);
    g.addColorStop(1, color2);

    ctx.fillStyle = g;

    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ff4fbf";

    ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 3);

    ctx.shadowBlur = 0;

    if (b.hp > 1) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Arial";
      ctx.fillText(`${b.hp}`, b.x + b.w / 2 - 4, b.y + b.h / 2 + 5);
    }
  });

  particles.forEach((p) => {
    ctx.globalAlpha = p.life / 50;
    ctx.fillStyle = p.color;

    ctx.fillRect(p.x, p.y, 3, 3);
  });

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  bonuses.forEach((b) => {
    ctx.fillStyle = b.type === "expand" ? "#0ff" : "#ff0";
    ctx.shadowBlur = 8;
    ctx.fillRect(b.x - 6, b.y - 6, 12, 12);
    ctx.fillStyle = b.type === "expand" ? "#0aa" : "#aa0";
    ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
  });
  ctx.shadowBlur = 0;
  drawNotifications();

  hud.innerHTML = `
  <div style="background: rgba(0,0,0,0.7); padding: 5px 15px; border-radius: 20px;">
    Уровень: ${level} | Счёт: ${score}
  </div>
`;
}

function loop() {
  if (state === "game") {
    update();
    updateNotifications();
    draw();
  }
  requestAnimationFrame(loop);
}

loop();

const menu = document.getElementById("menu");

document.getElementById("startBtn").onclick = () => {
  soundsEnabled = true;
  initAudio();

  clearBonusEffects();

  level = 1;
  score = 0;
  resetGame();
  state = "game";
  menu.style.display = "none";
  saveGame();
};

document.getElementById("continueBtn").onclick = () => {
  if (loadGame()) {
    soundsEnabled = true;
    initAudio();
    clearBonusEffects();
    resetGame();
    state = "game";
    menu.style.display = "none";
  } else {
    alert("Нет сохранённой игры!");
  }
};

document.body.addEventListener(
  "click",
  () => {
    if (!soundsEnabled && state === "menu") {
      soundsEnabled = true;
      initAudio();
    }
  },
  { once: true },
);
