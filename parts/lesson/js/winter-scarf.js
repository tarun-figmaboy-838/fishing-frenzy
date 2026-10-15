// One generated accessory shared by every pose. Registration is prepared offline:
// no pixel reads, network requests or extra animation clocks in the render loop.
(function () {
  const art = new Image();
  art.decoding = 'async';
  art.src = new URL('../assets/images/winter-scarf-flat.webp', document.currentScript.src).href;
  // working canvases, one pair per cell size: the mascot (256 or 512), the tape walk (512) and the protractor (896)
  // draw in turn every frame, and resizing a shared pair would reallocate it each time
  const pads = new Map();
  const pad = (cell) => {
    let p = pads.get(cell);
    if (!p) {
      p = { costume: document.createElement('canvas'), foreground: document.createElement('canvas') };
      p.costume.width = p.costume.height = p.foreground.width = p.foreground.height = cell;
      pads.set(cell, p);
    }
    return p;
  };
  const wingPaths = new Map();
  window.WinterScarf = {
    draw(ctx, anim, frame, x, y, width, height) {
      if (!art.complete || !art.naturalWidth) return;
      const poses = window.SWIFTEE_SCARF_ANCHORS && window.SWIFTEE_SCARF_ANCHORS[anim];
      const p = poses && poses[frame];
      if (!p) return;
      // A chunky collar wrapped round the neck just below the beak (as on the front-page banner), its tail
      // hanging out at the side.
      const w = p[2] * width * 1.1 / .763, h = w * .76; // its ends tuck in at the body's edge, not past it
      ctx.save();
      if (p[4]) {
        ctx.beginPath();
        ctx.rect(x + p[4] * width, y, (1 - p[4]) * width, height);
        ctx.clip();
      }
      ctx.translate(x + p[0] * width, y + (p[1] + .03) * height);
      ctx.rotate(p[3]);
      if (p[5] === -1) ctx.scale(-1, 1);
      // A restrained contact shadow seats the fabric against the torso.
      ctx.shadowColor = 'rgba(14, 91, 82, .20)';
      ctx.shadowBlur = width / 512;
      ctx.shadowOffsetY = height / 512;
      ctx.drawImage(art, -.571 * w, -.54 * h, w, h);
      ctx.restore();
    },
    // Composite before the caller's opacity/rotation/mirroring is applied. The
    // costume and body must fade together, not as two overlapping alpha layers.
    frame(ctx, source, sx, sy, cell, anim, frame, x, y, width, height) {
      const { costume, foreground } = pad(cell);
      const c = costume.getContext('2d');
      c.clearRect(0, 0, cell, cell);
      c.drawImage(source, sx, sy, cell, cell, 0, 0, cell, cell);
      this.draw(c, anim, frame, 0, 0, cell, cell);
      const masks = window.SWIFTEE_SCARF_OCCLUSION;
      const poses = masks && masks.frames[anim];
      const packed = poses && masks.masks[poses[frame]];
      if (packed) {
        const key = anim + ':' + frame + ':' + cell;
        let path = wingPaths.get(key);
        if (!path) {
          path = new Path2D();
          const bytes = atob(packed), k = cell / 256;
          for (let i = 0; i < bytes.length; i += 4) {
            path.rect(bytes.charCodeAt(i) * k, bytes.charCodeAt(i + 1) * k,
              bytes.charCodeAt(i + 2) * k, bytes.charCodeAt(i + 3) * k);
          }
          if (wingPaths.size >= 160) wingPaths.delete(wingPaths.keys().next().value);
          wingPaths.set(key, path);
        }
        // Feather the registered wing boundary by half a source pixel. A hard
        // rectangle clip leaves stair steps and looks like a cut in the collar.
        const front = foreground.getContext('2d');
        front.clearRect(0, 0, cell, cell);
        front.save();
        front.fillStyle = '#fff';
        front.filter = 'blur(' + (cell / 512) + 'px)';
        front.fill(path);
        front.filter = 'none';
        front.globalCompositeOperation = 'source-in';
        front.drawImage(source, sx, sy, cell, cell, 0, 0, cell, cell);
        front.restore();
        c.drawImage(foreground, 0, 0);
      }
      ctx.drawImage(costume, x, y, width, height);
    }
  };
})();
