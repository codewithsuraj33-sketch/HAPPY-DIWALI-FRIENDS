// Clean single-file script.js implementation
(function () {
  const canvas = document.getElementById('c');
  if (!canvas) throw new Error("Canvas element with id 'c' not found.");
  const ctx = canvas.getContext('2d');

  const opts = {
    strings: ['HAPPY', 'DIWALI FRIENDS'],
    quoteText: '✨ “May this Diwali light up our friendship with joy, laughter, and endless memories. Wishing you a sparkling and happy Diwali, my friend!” 🪔💛',
    friendNames: ['Sudeep Sarkar','Jeet Sakhari','Ranjan kumar Patra','Subhashish Behera'],
    quoteDuration: 15000,
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
    ctx.font = opts.charSize + 'px Verdana';
    calc.totalWidth = opts.charSpacing * Math.max.apply(null, opts.strings.map(function(s){ return s.length; }));
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
      else if (this.circleFading){ ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = 'rgba(255,200,110,0.9)'; ctx.fillStyle = this.lightColor(76); ctx.fillText(this.char, this.x + this.dx, this.y + this.dy); ctx.restore(); ++this.tick2; var proportion2 = this.tick2 / Math.max(1, this.circleFadeTime); var armonic2 = -Math.cos(proportion2 * Math.PI)/2 + 0.5; ctx.beginPath(); ctx.fillStyle = this.lightAlpha(100, 1 - armonic2); ctx.arc(this.x, this.y, this.circleFinalSize, 0, Tau); ctx.fill(); if (this.tick2 >= this.circleFadeTime) this.circleFading = false; }
      else { ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(255,190,80,0.85)'; ctx.fillStyle = this.lightColor(72); ctx.fillText(this.char, this.x + this.dx, this.y + this.dy); ctx.restore(); }
      for (var j=0;j<this.shards.length;++j){ this.shards[j].step(); if (!this.shards[j].alive){ this.shards.splice(j,1); --j; } }
      if (this.tick > opts.letterContemplatingWaitTime){ this.phase = 'balloon'; this.tick = 0; this.spawning = true; this.spawnTime = Math.floor(opts.balloonSpawnTime * Math.random()); this.inflating = false; this.inflateTime = Math.floor(opts.balloonBaseInflateTime + opts.balloonAddedInflateTime * Math.random()); this.size = Math.floor(opts.balloonBaseSize + opts.balloonAddedSize * Math.random()); var rad = opts.balloonBaseRadian + opts.balloonAddedRadian * Math.random(); var vel = opts.balloonBaseVel + opts.balloonAddedVel * Math.random(); this.vx = Math.cos(rad) * vel; this.vy = Math.sin(rad) * vel; this.cx = this.x; this.cy = this.y; }
    } else if (this.phase === 'balloon'){
      ctx.strokeStyle = this.lightColor(82); ctx.lineWidth = 1.2;
      if (this.spawning){ ++this.tick; ctx.fillStyle = this.lightColor(72); ctx.fillText(this.char, this.x + this.dx, this.y + this.dy); if (this.tick >= this.spawnTime){ this.tick = 0; this.spawning = false; this.inflating = true; } }
      else if (this.inflating){ ++this.tick; var proportion3 = this.tick / Math.max(1, this.inflateTime); var x2 = (this.cx = this.x); var y2 = (this.cy = this.y - this.size * proportion3); ctx.fillStyle = this.alphaColor(proportion3 * 0.9); ctx.beginPath(); generateBalloonPath(ctx, x2, y2, this.size * proportion3); ctx.fill(); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2, this.y); ctx.stroke(); ctx.fillStyle = this.lightColor(70); ctx.fillText(this.char, this.x + this.dx, this.y + this.dy); if (this.tick >= this.inflateTime){ this.tick = 0; this.inflating = false; } }
      else { this.cx += this.vx; this.cy += (this.vy += opts.upFlow); ctx.fillStyle = this.color; ctx.beginPath(); generateBalloonPath(ctx, this.cx, this.cy, this.size); ctx.fill(); ctx.beginPath(); ctx.moveTo(this.cx, this.cy); ctx.lineTo(this.cx, this.cy + this.size); ctx.stroke(); ctx.fillStyle = this.lightColor(76); ctx.fillText(this.char, this.cx + this.dx, this.cy + this.dy + this.size); if (this.cy + this.size < -hh - 120 || this.cx < -hw - 120 || this.cx > hw + 120) this.phase = 'done'; }
    }
  };

  function Shard(x,y,vx,vy,color){ this.vx = vx * (opts.fireworkShardBaseVel + opts.fireworkShardAddedVel * Math.random()); this.vy = vy * (opts.fireworkShardBaseVel + opts.fireworkShardAddedVel * Math.random()); this.x = x; this.y = y; this.prevPoints = [[x,y]]; this.color = color; this.alive = true; this.size = opts.fireworkShardBaseSize + opts.fireworkShardAddedSize * Math.random(); }
  Shard.prototype.step = function(){ this.x += this.vx; this.y += this.vy += opts.gravity; if (this.prevPoints.length > opts.fireworkShardPrevPoints) this.prevPoints.shift(); this.prevPoints.push([this.x,this.y]); var lwp = this.size / Math.max(1,this.prevPoints.length); for (var i=0;i<this.prevPoints.length-1;++i){ var p=this.prevPoints[i], p2=this.prevPoints[i+1]; ctx.strokeStyle = this.color; ctx.lineWidth = (i+1)*lwp*0.6; ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(p2[0],p2[1]); ctx.stroke(); } if (this.prevPoints[0][1] > hh + 60) this.alive = false; };

  function generateBalloonPath(ctx,x,y,size){ ctx.moveTo(x,y); ctx.bezierCurveTo(x-size/2,y-size/2,x-size/4,y-size,x,y-size); ctx.bezierCurveTo(x+size/4,y-size,x+size/2,y-size/2,x,y); }

  function createLetters(){ letters.length = 0; var rows = opts.strings.length; var longest = Math.max.apply(null, opts.strings.map(function(s){ return s.length; })); calc.totalWidth = opts.charSpacing * longest; var blockHeight = opts.lineHeight * rows; for (var r=0;r<rows;++r){ var str = opts.strings[r]; var rowWidth = opts.charSpacing * str.length; var xOffset = -rowWidth/2 + opts.charSpacing/2; var y = r * opts.lineHeight + opts.lineHeight/2 - blockHeight/2; for (var c=0;c<str.length;++c){ var x = xOffset + c * opts.charSpacing; letters.push(new Letter(str[c], x, y)); } } }

  function animate(){ window.requestAnimationFrame(animate); ctx.save(); ctx.setTransform(DPR,0,0,DPR,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle = '#0c0610'; ctx.fillRect(0,0,canvas.width/DPR,canvas.height/DPR); var g = ctx.createRadialGradient(hw,hh,0,hw,hh,Math.max(w,h)*0.9); g.addColorStop(0,'rgba(255,190,80,0.06)'); g.addColorStop(0.25,'rgba(255,160,60,0.03)'); g.addColorStop(1,'rgba(0,0,0,0.6)'); ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width/DPR,canvas.height/DPR); ctx.restore(); ctx.save(); ctx.translate(hw,hh); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.font = opts.charSize + 'px Verdana'; var allDone = true; for (var i=0;i<letters.length;++i){ letters[i].step(); if (letters[i].phase !== 'done') allDone = false; } ctx.restore(); if (allDone){ if (!quoteActive){ quoteActive = true; quoteStart = performance.now(); quoteTimer = setTimeout(function(){ quoteActive = false; quoteTimer = null; for (var k=0;k<letters.length;++k) letters[k].reset(); }, opts.quoteDuration); } } if (quoteActive){ var elapsed = performance.now() - quoteStart; ctx.save(); ctx.translate(hw,hh); ctx.fillStyle = 'rgba(255,240,210,0.96)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '20px Verdana'; var maxWidth = Math.max(200, Math.min(w*0.8,900)); var words = opts.quoteText.split(' '); var lines = []; var ln = ''; for (var m=0;m<words.length;++m){ var test = ln ? ln + ' ' + words[m] : words[m]; if (ctx.measureText(test).width > maxWidth && ln){ lines.push(ln); ln = words[m]; } else ln = test; } if (ln) lines.push(ln); var lineHeight = 26; var totalH = lines.length * lineHeight; var startY = -totalH/2 - 20; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; for (var ii=0; ii<lines.length; ++ii) ctx.fillText(lines[ii], 0, startY + ii * lineHeight); var names = opts.friendNames || []; if (names.length > 0){ var seg = opts.quoteDuration / names.length; var idx = Math.min(names.length-1, Math.floor(elapsed / Math.max(1, seg))); var name = names[idx]; ctx.font = opts.charSize + 'px Verdana'; ctx.fillStyle = 'rgba(255,245,220,0.98)'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14; var nameY = startY + totalH + 24 + (opts.charSize/2); ctx.fillText(name, 0, nameY); var img = friendImgs[idx]; if (img && img.complete){ var rawSize = Math.floor(opts.charSize * (opts.friendPhotoScale || 1.2)); var photoSize = Math.min(opts.friendPhotoMax || 120, Math.max(opts.friendPhotoMin || 72, rawSize)); var photoY = startY - photoSize - 12; ctx.save(); ctx.beginPath(); ctx.arc(0, photoY + photoSize/2, photoSize/2, 0, Tau); ctx.closePath(); ctx.clip(); ctx.drawImage(img, -photoSize/2, photoY, photoSize, photoSize); ctx.restore(); ctx.beginPath(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.arc(0, photoY + photoSize/2, photoSize/2, 0, Tau); ctx.stroke(); } } ctx.restore(); } }

  // setup
  setSize();
  window.addEventListener('resize', function(){ window.requestAnimationFrame(function(){ setSize(); createLetters(); }); }, { passive: true });
  createLetters();
  animate();

})();