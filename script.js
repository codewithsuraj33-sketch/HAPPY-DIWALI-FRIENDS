// Clean single-file script.js implementation — final consolidated version
(function () {
  'use strict';

  const canvas = document.getElementById('c');
  if (!canvas) throw new Error("Canvas element with id 'c' not found.");
  const ctx = canvas.getContext('2d');

  const backgroundMusic = document.getElementById('background-music');
  const musicToggle = document.getElementById('music-toggle');
  if (musicToggle) {
    musicToggle.addEventListener('click', () => {
      if (backgroundMusic.paused) {
        backgroundMusic.play();
        musicToggle.textContent = 'Pause Music';
      } else {
        backgroundMusic.pause();
        musicToggle.textContent = 'Play Music';
      }
    });
  }

  const opts = {
    strings: ['HAPPY', 'DIWALI FRIENDS'],
    quoteText: '✨ “May this Diwali light up our friendship with joy, laughter, and endless memories. Wishing you a sparkling and happy Diwali, my friend!” 🪔💛',
    friendNames: ['Sudeep Sarkar','Jeet Sakhari','Ranjan kumar Patra','Subhashish Behera', 'TO MY NEW FRIENDS AND FUTURE FRIENDS OR CLASSMATE'],
    quoteDuration: 22000,
    friendPhotoScale: 2.2,
    friendPhotoMin: 96,
    friendPhotoMax: 320,
    charSize: 44,
    charSpacing: 62,
    lineHeight: 72,
    gravity: 0.12,
    upFlow: -0.06,
    fireworkPrevPoints: 12,
    fireworkBaseLineWidth: 6,
    fireworkAddedLineWidth: 8,
    fireworkSpawnTime: 140,
    fireworkBaseReachTime: 36,
    fireworkAddedReachTime: 40,
    fireworkCircleBaseSize: 22,
    fireworkCircleAddedSize: 14,
    fireworkCircleBaseTime: 36,
    fireworkCircleAddedTime: 26,
    fireworkCircleFadeBaseTime: 12,
    fireworkCircleFadeAddedTime: 8,
    fireworkBaseShards: 7,
    fireworkAddedShards: 8,
    fireworkShardPrevPoints: 3,
    fireworkShardBaseVel: 3.4,
    fireworkShardAddedVel: 2.6,
    fireworkShardBaseSize: 2,
    fireworkShardAddedSize: 3,
    letterContemplatingWaitTime: 260,
    balloonSpawnTime: 18,
    balloonBaseInflateTime: 12,
    balloonAddedInflateTime: 18,
    balloonBaseSize: 18,
    balloonAddedSize: 24,
    balloonBaseVel: 0.36,
    balloonAddedVel: 0.5,
    balloonBaseRadian: -(Math.PI / 2 - 0.4),
    balloonAddedRadian: -0.9
  };

  let DPR = Math.max(window.devicePixelRatio || 1, 1);
  let w = innerWidth, h = innerHeight, hw = w/2, hh = h/2;
  let calc = { totalWidth: 0 };
  const Tau = Math.PI * 2;
  const letters = [];

  let quoteActive = false;
  let quoteStart = 0;
  let quoteTimer = null;
   let quoteAlpha = 0; // for fade in/out of quote overlay (0..1)
  // control whether letter glyphs (HAPPY / DIWALI FRIENDS) are drawn
  let drawLetterGlyphs = true;
   let isMuted = false;
  let surpriseLinkShown = false;
  const surpriseLink = document.getElementById('surprise-link');

  // Audio helpers: speech synthesis and small WebAudio firework sound
  let audioCtx = null;
  function ensureAudio() {
    if (audioCtx) return audioCtx;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    audioCtx = new C();
    return audioCtx;
  }

  let lastSpoken = 0;
  function speakText(text) {
     if (isMuted) return;
    if (!('speechSynthesis' in window)) return;
    // debounce speech for 6s
    const now = performance.now();
    if (now - lastSpoken < 6000) return;
    lastSpoken = now;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB';
      u.rate = 0.95;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('speech failed', e);
    }
  }

  function playFireworkSound() {
     if (isMuted) return;
     const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    // noise burst
    const dur = 0.18;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; ++i) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, now); ng.gain.exponentialRampToValueAtTime(0.6, now + 0.01); ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(50, now + dur);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, now); og.gain.exponentialRampToValueAtTime(0.45, now + 0.01); og.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const master = ctx.createGain(); master.gain.value = 0.6;
    src.connect(ng).connect(master);
    osc.connect(og).connect(master);
    master.connect(ctx.destination);

    src.start(now); src.stop(now + dur);
    osc.start(now); osc.stop(now + dur);
  }

  const friendImgs = [];
  (function preload() {
    const names = opts.friendNames || [];
    friendImgs.length = names.length;
    for (let i = 0; i < names.length; ++i) {
      friendImgs[i] = null;
      const raw = names[i] + '.jpg';
      const enc = encodeURIComponent(names[i]) + '.jpg';
      const candidates = [
        './' + enc,
        './' + raw,
        './friends/' + enc,
        './friends/' + raw,
        '../friends/' + enc,
        '../friends/' + raw,
        '/friends/' + enc,
        '/friends/' + raw
      ];
       (function tryLoad(idx) {
        if (idx >= candidates.length) { friendImgs[i] = null; console.warn('Friend image not found for', names[i]); return; }
        const url = candidates[idx];
        const img = new Image();
        img.onload = function () { friendImgs[i] = img; console.log('Loaded friend image for', names[i], 'from', url); };
        img.onerror = function () { tryLoad(idx + 1); };
        img.src = url;
      })(0);
    }
  })();

   // Wait for images to load (with timeout) before starting; show preloader until ready
   function waitForImages(timeoutMs) {
     return new Promise((resolve) => {
       const start = performance.now();
       function check() {
         const allTried = friendImgs.every(function (v, i) { return v === null || (v && v.complete); });
         if (allTried) return resolve(true);
         if (performance.now() - start > (timeoutMs || 3500)) return resolve(false);
         setTimeout(check, 120);
       }
       check();
     });
   }

  function setSize() {
    DPR = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = Math.max(1, innerWidth);
    const cssH = Math.max(1, innerHeight);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * DPR);
    canvas.height = Math.round(cssH * DPR);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(DPR, DPR);
    w = cssW; h = cssH; hw = w/2; hh = h/2;

    if (w < 768) { // Mobile devices
        opts.charSize = 20;
        opts.charSpacing = 25;
        opts.lineHeight = 30;
    } else { // Desktop
        opts.charSize = 44;
        opts.charSpacing = 62;
        opts.lineHeight = 72;
    }

    ctx.font = opts.charSize + 'px Verdana';
    const longest = Math.max.apply(null, opts.strings.map(function(s){ return s.length; }));
    calc.totalWidth = opts.charSpacing * longest;
  }

  function hueForX(x) {
    if (calc.totalWidth <= 0) return 40;
    var t = (x + calc.totalWidth/2) / calc.totalWidth;
    return 30 + 25 * Math.min(Math.max(t,0),1);
  }

  function Letter(char, x, y) {
    this.char = char; this.x = x; this.y = y;
    this.dx = -ctx.measureText(char).width/2; this.dy = opts.charSize/2; this.fireworkDy = this.y - hh;
    var hue = hueForX(x); this.hue = hue; this.color = 'hsl('+hue+',90%,50%)';
    this.lightColor = function(l){ return 'hsl('+hue+',90%,'+l+'%)'; };
    this.alphaColor = function(a){ return 'hsla('+hue+',90%,52%,'+a+')'; };
    this.lightAlpha = function(l,a){ return 'hsla('+hue+',90%,'+l+'%,'+a+')'; };
    this.reset();
  }

  Letter.prototype.reset = function(){
    this.phase = 'firework'; this.tick = 0; this.spawned = false;
    this.spawningTime = Math.floor(opts.fireworkSpawnTime * Math.random());
    this.reachTime = Math.floor(opts.fireworkBaseReachTime + opts.fireworkAddedReachTime * Math.random());
    this.lineWidth = opts.fireworkBaseLineWidth + opts.fireworkAddedLineWidth * Math.random();
    this.prevPoints = [[0, hh, 0]];
  };

  Letter.prototype.step = function(){
    if (this.phase === 'firework'){
      if (!this.spawned){ ++this.tick; if (this.tick >= this.spawningTime){ this.tick = 0; this.spawned = true; } }
      else {
        ++this.tick; var lp = this.tick / Math.max(1, this.reachTime); var ap = Math.sin(lp * (Tau/4));
        var x = lp * this.x; var y = hh + ap * this.fireworkDy;
        if (this.prevPoints.length > opts.fireworkPrevPoints) this.prevPoints.shift();
        this.prevPoints.push([x,y,lp*this.lineWidth]);
        var lwp = 1/Math.max(1, this.prevPoints.length - 1);
        for (var i=1;i<this.prevPoints.length;++i){ var p=this.prevPoints[i], p2=this.prevPoints[i-1]; ctx.strokeStyle = this.alphaColor((i/this.prevPoints.length)*0.9); ctx.lineWidth = p[2]*lwp*i; ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(p2[0],p2[1]); ctx.stroke(); }
        if (this.tick >= this.reachTime){
          this.phase = 'contemplate';
          this.circleFinalSize = opts.fireworkCircleBaseSize + opts.fireworkCircleAddedSize * Math.random();
          this.circleCompleteTime = Math.floor(opts.fireworkCircleBaseTime + opts.fireworkCircleAddedTime * Math.random());
          this.circleCreating = true; this.circleFading = false;
          this.circleFadeTime = Math.floor(opts.fireworkCircleFadeBaseTime + opts.fireworkCircleFadeAddedTime * Math.random());
          this.tick = 0; this.tick2 = 0; this.shards = [];
          var shardCount = Math.max(5, Math.floor(opts.fireworkBaseShards + opts.fireworkAddedShards * Math.random()));
          var angle = (Tau / shardCount); var cos = Math.cos(angle), sin = Math.sin(angle); var vx = 1, vy = 0;
          for (var k=0;k<shardCount;++k){ var vx1 = vx; vx = vx * cos - vy * sin; vy = vx1 * sin + vy * cos; this.shards.push(new Shard(this.x, this.y, vx, vy, this.alphaColor(1))); }
        }
      }
    } else if (this.phase === 'contemplate'){
      ++this.tick; if (this.circleCreating){ ++this.tick2; var proportion = this.tick2 / Math.max(1, this.circleCompleteTime); var armonic = -Math.cos(proportion * Math.PI)/2 + 0.5; ctx.beginPath(); ctx.fillStyle = this.lightAlpha(40 + 60 * proportion, proportion); ctx.arc(this.x, this.y, armonic * this.circleFinalSize, 0, Tau); ctx.fill(); if (this.tick2 > this.circleCompleteTime){ this.tick2 = 0; this.circleCreating = false; this.circleFading = true; } }
      else if (this.circleFading){ ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = 'rgba(255,200,110,0.9)'; ctx.fillStyle = this.lightColor(76); if (drawLetterGlyphs) ctx.fillText(this.char, this.x + this.dx, this.y + this.dy); ctx.restore(); ++this.tick2; var proportion2 = this.tick2 / Math.max(1, this.circleFadeTime); var armonic2 = -Math.cos(proportion2 * Math.PI)/2 + 0.5; ctx.beginPath(); ctx.fillStyle = this.lightAlpha(100, 1 - armonic2); ctx.arc(this.x, this.y, this.circleFinalSize, 0, Tau); ctx.fill(); if (this.tick2 >= this.circleFadeTime) this.circleFading = false; }
      else { ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(255,190,80,0.85)'; ctx.fillStyle = this.lightColor(72); if (drawLetterGlyphs) ctx.fillText(this.char, this.x + this.dx, this.y + this.dy); ctx.restore(); }
      for (var j=0;j<this.shards.length;++j){ this.shards[j].step(); if (!this.shards[j].alive){ this.shards.splice(j,1); --j; } }
      if (this.tick > opts.letterContemplatingWaitTime){ this.phase = 'balloon'; this.tick = 0; this.spawning = true; this.spawnTime = Math.floor(opts.balloonSpawnTime * Math.random()); this.inflating = false; this.inflateTime = Math.floor(opts.balloonBaseInflateTime + opts.balloonAddedInflateTime * Math.random()); this.size = Math.floor(opts.balloonBaseSize + opts.balloonAddedSize * Math.random()); var rad = opts.balloonBaseRadian + opts.balloonAddedRadian * Math.random(); var vel = opts.balloonBaseVel + opts.balloonAddedVel * Math.random(); this.vx = Math.cos(rad) * vel; this.vy = Math.sin(rad) * vel; this.cx = this.x; this.cy = this.y; }
    } else if (this.phase === 'balloon'){
      ctx.strokeStyle = this.lightColor(82); ctx.lineWidth = 1.2;
      if (this.spawning){ ++this.tick; ctx.fillStyle = this.lightColor(72); if (drawLetterGlyphs) ctx.fillText(this.char, this.x + this.dx, this.y + this.dy); if (this.tick >= this.spawnTime){ this.tick = 0; this.spawning = false; this.inflating = true; } }
      else if (this.inflating){ ++this.tick; var proportion3 = this.tick / Math.max(1, this.inflateTime); var x2 = (this.cx = this.x); var y2 = (this.cy = this.y - this.size * proportion3); ctx.fillStyle = this.alphaColor(proportion3 * 0.9); ctx.beginPath(); generateBalloonPath(ctx, x2, y2, this.size * proportion3); ctx.fill(); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2, this.y); ctx.stroke(); ctx.fillStyle = this.lightColor(70); ctx.fillText(this.char, this.x + this.dx, this.y + this.dy); if (this.tick >= this.inflateTime){ this.tick = 0; this.inflating = false; } }
      else { this.cx += this.vx; this.cy += (this.vy += opts.upFlow); ctx.fillStyle = this.color; ctx.beginPath(); generateBalloonPath(ctx, this.cx, this.cy, this.size); ctx.fill(); ctx.beginPath(); ctx.moveTo(this.cx, this.cy); ctx.lineTo(this.cx, this.cy + this.size); ctx.stroke(); ctx.fillStyle = this.lightColor(76); ctx.fillText(this.char, this.cx + this.dx, this.cy + this.dy + this.size); if (this.cy + this.size < -hh - 120 || this.cx < -hw - 120 || this.cx > hw + 120) this.phase = 'done'; }
    }
  };

  function Shard(x,y,vx,vy,color){ this.vx = vx * (opts.fireworkShardBaseVel + opts.fireworkShardAddedVel * Math.random()); this.vy = vy * (opts.fireworkShardBaseVel + opts.fireworkShardAddedVel * Math.random()); this.x = x; this.y = y; this.prevPoints = [[x,y]]; this.color = color; this.alive = true; this.size = opts.fireworkShardBaseSize + opts.fireworkShardAddedSize * Math.random(); }
  Shard.prototype.step = function(){ this.x += this.vx; this.y += this.vy += opts.gravity; if (this.prevPoints.length > opts.fireworkShardPrevPoints) this.prevPoints.shift(); this.prevPoints.push([this.x,this.y]); var lwp = this.size / Math.max(1,this.prevPoints.length); for (var i=0;i<this.prevPoints.length-1;++i){ var p=this.prevPoints[i], p2=this.prevPoints[i+1]; ctx.strokeStyle = this.color; ctx.lineWidth = (i+1)*lwp*0.6; ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(p2[0],p2[1]); ctx.stroke(); } if (this.prevPoints[0][1] > hh + 60) this.alive = false; };

  function generateBalloonPath(ctx,x,y,size){ ctx.moveTo(x,y); ctx.bezierCurveTo(x-size/2,y-size/2,x-size/4,y-size,x,y-size); ctx.bezierCurveTo(x+size/4,y-size,x+size/2,y-size/2,x,y); }

  function createFireworks(count){
    // play firework sound
    try { playFireworkSound(); } catch(e){}
    letters.length = 0;
    count = count || 20;
    for(var i=0; i<count; ++i) {
      var x = (Math.random() - 0.5) * w * 0.7;
      var y = (Math.random() - 0.5) * h * 0.7;
      letters.push(new Letter('', x, y));
    }
  }

  function createLetters(){
    // speak the greeting when letters appear
    try { speakText('Happy Diwali friends'); } catch(e){}
    letters.length = 0;
    var rows = opts.strings.length;
    var longest = Math.max.apply(null, opts.strings.map(function(s){ return s.length; }));
    calc.totalWidth = opts.charSpacing * longest;
    var blockHeight = opts.lineHeight * rows;
    for (var r = 0; r < rows; ++r){
      var str = opts.strings[r];
      var rowWidth = opts.charSpacing * str.length;
      var xOffset = -rowWidth/2 + opts.charSpacing/2;
      var y = r * opts.lineHeight + opts.lineHeight/2 - blockHeight/2;
      for (var c = 0; c < str.length; ++c){
        var x = xOffset + c * opts.charSpacing;
        letters.push(new Letter(str[c], x, y));
      }
    }
  }

  function animate() {
    window.requestAnimationFrame(animate);

    // clear and background (CSS px)
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0c0610';
    ctx.fillRect(0, 0, canvas.width / DPR, canvas.height / DPR);

    // radial glow
    var g = ctx.createRadialGradient(hw, hh, 0, hw, hh, Math.max(w, h) * 0.9);
    g.addColorStop(0, 'rgba(255,190,80,0.06)');
    g.addColorStop(0.25, 'rgba(255,160,60,0.03)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width / DPR, canvas.height / DPR);
    ctx.restore();

    // draw letters/particles in centered coords
    ctx.save();
    ctx.translate(hw, hh);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.font = opts.charSize + 'px Verdana';

    var allDone = true;
    for (var i = 0; i < letters.length; ++i) {
      letters[i].step();
      if (letters[i].phase !== 'done') allDone = false;
    }
    ctx.restore();

    // When all letters have completed, show the quote overlay — but keep only fireworks visible
    if (allDone && !quoteActive) {
      quoteActive = true;
      quoteStart = performance.now();
      // hide the HAPPY/DIWALI FRIEND glyphs while the quote is visible
      drawLetterGlyphs = false;
      // start fireworks under the quote
      createFireworks(24);
      if (quoteTimer) clearTimeout(quoteTimer);
      // when the quote duration finishes, stop the quote and restart the full animation from the start
      quoteTimer = setTimeout(function () {
        quoteActive = false;
        quoteTimer = null;
        drawLetterGlyphs = true;

        // Hide and reset surprise link
        if (surpriseLink) {
          surpriseLink.style.display = 'none';
        }
        surpriseLinkShown = false;

        createLetters();
      }, opts.quoteDuration);
    }

    // draw quote overlay if active (with alpha fade)
    var elapsed = quoteActive ? (performance.now() - quoteStart) : 0;
    // fade in/out logic
    if (quoteActive) quoteAlpha = Math.min(1, quoteAlpha + 0.04);
    else quoteAlpha = Math.max(0, quoteAlpha - 0.04);

    if (quoteAlpha > 0.001) {
      ctx.save();
      ctx.translate(hw, hh);
      ctx.globalAlpha = quoteAlpha;
      ctx.fillStyle = 'rgba(255,240,210,0.98)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '20px "Segoe UI", Verdana, sans-serif';

      var maxWidth = Math.max(200, Math.min(w * 0.8, 900));
      var words = opts.quoteText.split(' ');
      var lines = [];
      var ln = '';
      for (var m = 0; m < words.length; ++m) {
        var test = ln ? ln + ' ' + words[m] : words[m];
        if (ctx.measureText(test).width > maxWidth && ln) {
          lines.push(ln);
          ln = words[m];
        } else ln = test;
      }
      if (ln) lines.push(ln);

      var lineHeight = 26;
      var totalH = lines.length * lineHeight;
      var startY = -totalH / 2 - 20;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      for (var ii = 0; ii < lines.length; ++ii) ctx.fillText(lines[ii], 0, startY + ii * lineHeight);

      var names = opts.friendNames || [];
      if (names.length > 0) {
        var seg = 3000;
        var idx = Math.floor(elapsed / seg);
        if (idx >= names.length - 1) {
            idx = names.length - 1;
        }

        var name = names[idx];
        ctx.font = opts.charSize + 'px "Segoe UI", Verdana, sans-serif';
        ctx.fillStyle = 'rgba(255,245,220,0.98)';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 14;
        var nameY = startY + totalH + 24 + opts.charSize / 2;
        
        if (idx === names.length - 1) {
          ctx.fillText('TO MY NEW FRIENDS AND', 0, nameY - 15);
          ctx.fillText('FUTURE FRIENDS OR CLASSMATE', 0, nameY + 15);
        } else {
          ctx.fillText(name, 0, nameY);
        }

        var img = friendImgs[idx];
        if (idx === names.length - 1) {
          var rawSize = Math.floor(opts.charSize * (opts.friendPhotoScale || 1.2));
          var photoSize = Math.min(opts.friendPhotoMax || 120, Math.max(opts.friendPhotoMin || 72, rawSize));
          var photoY = startY - photoSize - 12;
          ctx.font = (photoSize / 2) + 'px "Segoe UI", Verdana, sans-serif';
          ctx.fillStyle = 'rgba(255,245,220,0.98)';
          ctx.shadowColor = 'rgba(0,0,0,0.6)';
          ctx.shadowBlur = 14;
          ctx.fillText('HAPPY', 0, photoY + photoSize / 2 - (photoSize / 4));
          ctx.fillText('DIWALI', 0, photoY + photoSize / 2 + (photoSize / 4));
        } else if (img && img.complete) {
          var rawSize = Math.floor(opts.charSize * (opts.friendPhotoScale || 1.2));
          var photoSize = Math.min(opts.friendPhotoMax || 120, Math.max(opts.friendPhotoMin || 72, rawSize));
          var photoY = startY - photoSize - 12;

          // draw clipped avatar
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, photoY + photoSize / 2, photoSize / 2, 0, Tau);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, -photoSize / 2, photoY, photoSize, photoSize);
          ctx.restore();

          // golden border with glow
          ctx.beginPath();
          ctx.lineWidth = Math.max(2, Math.round(photoSize * 0.06));
          ctx.strokeStyle = 'rgba(255,215,90,0.95)';
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'rgba(255,200,80,0.6)';
          ctx.arc(0, photoY + photoSize / 2, photoSize / 2 - (ctx.lineWidth/2), 0, Tau);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // Show surprise link based on timing
      const showSurpriseTime = (opts.friendNames.length - 1) * (opts.quoteDuration / opts.friendNames.length);
      if (elapsed > showSurpriseTime && !surpriseLinkShown) {
        if (surpriseLink) {
          surpriseLink.style.display = 'block';
        }
        surpriseLinkShown = true;
      }

      ctx.restore();
    }
  }

  // setup
  setSize();
  window.addEventListener('resize', function(){ window.requestAnimationFrame(function(){ setSize(); createLetters(); }); }, { passive: true });
  // handle orientation changes on mobile
  window.addEventListener('orientationchange', function(){ window.requestAnimationFrame(function(){ setSize(); createLetters(); }); }, { passive: true });
  // unlock audio/context on first touch (mobile browsers often require user gesture)
  function unlockAudioOnUserGesture() {
    try {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch (e) {}
    window.removeEventListener('touchstart', unlockAudioOnUserGesture);
    window.removeEventListener('mousedown', unlockAudioOnUserGesture);
  }
  window.addEventListener('touchstart', unlockAudioOnUserGesture, { passive: true });
  window.addEventListener('mousedown', unlockAudioOnUserGesture, { passive: true });
  // mute toggle wiring
  const muteBtn = document.getElementById('mute-toggle');
  if (muteBtn) {
    muteBtn.addEventListener('click', function () {
      isMuted = !isMuted;
      muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
      muteBtn.textContent = isMuted ? '🔇' : '🔊';
      // pause any currently playing audio
      try { if (isMuted && audioCtx && audioCtx.state === 'running') audioCtx.suspend(); else if (!isMuted && audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch (e){}
      try { if (isMuted) window.speechSynthesis.cancel(); } catch(e){}
    }, { passive: true });
  }

  // Insert YouTube iframe (autoplay muted) to play background music
  (function insertYT() {
    const container = document.getElementById('yt-player');
    if (!container) return;
    const vid = container.getAttribute('data-video-id') || 'B6aHSSucL_s';
    // build src with enablejsapi to allow future postMessage control
    const src = 'https://www.youtube.com/embed/' + vid + '?autoplay=1&loop=1&playlist=' + vid + '&mute=1&controls=0&rel=0&enablejsapi=1';
    const ifr = document.createElement('iframe');
    ifr.src = src;
    ifr.width = '1'; ifr.height = '1'; ifr.setAttribute('allow', 'autoplay; encrypted-media');
    ifr.setAttribute('frameborder', '0');
    container.appendChild(ifr);

    // when the user unmutes via mute button, try to unmute the iframe via postMessage to the YouTube player
    function post(command) {
      try { ifr.contentWindow.postMessage(JSON.stringify(command), '*'); } catch (e) {}
    }
    // listen to mute button changes and sync iframe
    if (muteBtn) {
      muteBtn.addEventListener('click', function () {
        if (isMuted) {
          // mute player
          post({ event: 'command', func: 'mute', args: [] });
        } else {
          // unmute and play
          post({ event: 'command', func: 'unMute', args: [] });
          post({ event: 'command', func: 'playVideo', args: [] });
        }
      }, { passive: true });
    }
  })();

  // Wait for images (and a short timeout). Show preloader until ready.
  const preloaderEl = document.getElementById('preloader');
  waitForImages(3500).then(function(loaded) {
    if (preloaderEl) preloaderEl.setAttribute('aria-hidden', 'true');
    if (preloaderEl && preloaderEl.parentNode) preloaderEl.parentNode.removeChild(preloaderEl);
    // start animation after a tiny delay so fade feels smooth
    createLetters();
    animate();
  });

})();