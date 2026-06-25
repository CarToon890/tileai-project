document.addEventListener("DOMContentLoaded", () => {
  const addObstacleBtn = document.getElementById("addObstacleBtn");
  const obstaclesList = document.getElementById("obstaclesList");
  const errorMsg = document.getElementById("errorMsg");
  const canvas = document.getElementById("layoutCanvas");
  const ctx = canvas.getContext("2d");

  // State
  let currentLayout = [];
  let currentScale = 1;
  let obstacles = [];
  let isDragging = false;
  let dragTargetIndex = -1;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let currentCanvasPadding = 40;

  // Auto-calculate on input change
  const inputs = ["roomW", "roomL", "tileSize", "origin", "material", "grout"];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener("input", triggerCalc);
  });

  // Add obstacle
  addObstacleBtn.addEventListener("click", () => {
    const roomW = parseFloat(document.getElementById("roomW").value) || 300;
    const roomL = parseFloat(document.getElementById("roomL").value) || 400;
    
    // Add to center
    const obs = { x: roomW/2 - 25, y: roomL/2 - 25, w: 50, h: 50 };
    obstacles.push(obs);
    renderObstacleList();
    triggerCalc();
  });

  function renderObstacleList() {
    obstaclesList.innerHTML = "";
    obstacles.forEach((obs, index) => {
      const div = document.createElement("div");
      div.className = "obstacle-item";
      div.innerHTML = `
        <span>X:</span><input type="number" class="obs-x" value="${Math.round(obs.x)}">
        <span>Y:</span><input type="number" class="obs-y" value="${Math.round(obs.y)}">
        <span>กว้าง:</span><input type="number" class="obs-w" value="${obs.w}">
        <span>ยาว:</span><input type="number" class="obs-h" value="${obs.h}">
        <span class="obstacle-remove" title="ลบสิ่งกีดขวาง">×</span>
      `;
      
      div.querySelector(".obs-x").addEventListener("input", (e) => {
        obstacles[index].x = parseFloat(e.target.value) || 0;
        triggerCalc();
      });
      div.querySelector(".obs-y").addEventListener("input", (e) => {
        obstacles[index].y = parseFloat(e.target.value) || 0;
        triggerCalc();
      });
      div.querySelector(".obs-w").addEventListener("input", (e) => {
        obstacles[index].w = parseFloat(e.target.value) || 0;
        triggerCalc();
      });
      div.querySelector(".obs-h").addEventListener("input", (e) => {
        obstacles[index].h = parseFloat(e.target.value) || 0;
        triggerCalc();
      });
      div.querySelector(".obstacle-remove").addEventListener("click", () => {
        obstacles.splice(index, 1);
        renderObstacleList();
        triggerCalc();
      });
      
      obstaclesList.appendChild(div);
    });
  }

  // Canvas Drag & Drop
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - currentCanvasPadding) / currentScale;
    const mouseY = (e.clientY - rect.top - currentCanvasPadding) / currentScale;

    // Check if clicked inside any obstacle (iterate backwards to click top-most)
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      if (mouseX >= obs.x && mouseX <= obs.x + obs.w &&
          mouseY >= obs.y && mouseY <= obs.y + obs.h) {
        isDragging = true;
        dragTargetIndex = i;
        dragOffsetX = mouseX - obs.x;
        dragOffsetY = mouseY - obs.y;
        canvas.style.cursor = "grabbing";
        break;
      }
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - currentCanvasPadding) / currentScale;
    const mouseY = (e.clientY - rect.top - currentCanvasPadding) / currentScale;

    if (isDragging && dragTargetIndex !== -1) {
      let newX = mouseX - dragOffsetX;
      let newY = mouseY - dragOffsetY;
      
      const roomW = parseFloat(document.getElementById("roomW").value) || 0;
      const roomL = parseFloat(document.getElementById("roomL").value) || 0;
      const obsW = obstacles[dragTargetIndex].w;
      const obsH = obstacles[dragTargetIndex].h;
      
      // Clamp to room bounds so obstacles can't be dragged outside
      newX = Math.max(0, Math.min(newX, roomW - obsW));
      newY = Math.max(0, Math.min(newY, roomL - obsH));
      
      obstacles[dragTargetIndex].x = newX;
      obstacles[dragTargetIndex].y = newY;
      
      // Just visually redraw without API call for smooth dragging
      const sizeStr = document.getElementById("tileSize").value;
      const parts = sizeStr.split("x");
      const tileW = parseFloat(parts[0]);
      const tileL = parseFloat(parts[1]);
      drawLayout(roomW, roomL, tileW, tileL, obstacles, currentLayout);
    } else {
      // Hover effect
      let isHovering = false;
      for (const obs of obstacles) {
        if (mouseX >= obs.x && mouseX <= obs.x + obs.w &&
            mouseY >= obs.y && mouseY <= obs.y + obs.h) {
          isHovering = true;
          break;
        }
      }
      canvas.style.cursor = isHovering ? "grab" : "default";
    }
  });

  canvas.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = "grab";
      renderObstacleList(); // Update X,Y inputs in sidebar
      triggerCalc(); // Recalculate tiles after drop
    }
  });

  canvas.addEventListener("mouseleave", () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = "default";
      triggerCalc();
    }
  });

  let calcTimeout;
  function triggerCalc() {
    clearTimeout(calcTimeout);
    calcTimeout = setTimeout(fetchOptimization, 200); // debounce API calls
  }

  async function fetchOptimization() {
    errorMsg.style.display = "none";
    
    const roomW = parseFloat(document.getElementById("roomW").value) || 0;
    const roomL = parseFloat(document.getElementById("roomL").value) || 0;
    const origin = document.getElementById("origin").value;
    const grout = parseFloat(document.getElementById("grout").value) || 0.2;
    
    const sizeStr = document.getElementById("tileSize").value;
    const parts = sizeStr.split("x");
    const tileW = parseFloat(parts[0]);
    const tileL = parseFloat(parts[1]);

    // Clamp obstacles to ensure they don't fall outside the new room bounds
    let obsChanged = false;
    obstacles.forEach(obs => {
      const oldX = obs.x, oldY = obs.y;
      obs.x = Math.max(0, Math.min(obs.x, roomW - obs.w));
      obs.y = Math.max(0, Math.min(obs.y, roomL - obs.h));
      if (oldX !== obs.x || oldY !== obs.y) obsChanged = true;
    });
    
    if (obsChanged) {
      renderObstacleList(); // Update inputs in sidebar if they changed
    }

    try {
      const res = await fetch("/api/optimize-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomW, roomL, tileW, tileL, grout, origin, obstacles
        })
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      currentLayout = data.layout;
      
      // Update Summary
      document.getElementById("sTotal").textContent = data.summary.totalUsed;
      document.getElementById("sFull").textContent = data.summary.fullTiles;
      document.getElementById("sCut").textContent = data.summary.cutTiles;
      document.getElementById("sWaste").textContent = data.summary.wastePercent;
      
      const printDesc = document.getElementById("printDesc");
      if (printDesc) {
        printDesc.textContent = `ขนาดห้อง: ${roomW}x${roomL} cm | ขนาดกระเบื้อง: ${tileW}x${tileL} cm | ร่องยาแนว: ${grout} cm`;
      }

      // Cost Calculation
      const matPrices = {
        ceramic: { "30x30": 150, "60x60": 200,  "60x120": 250,  "80x80": 220  },
        granito: { "30x30": 400, "60x60": 450,  "60x120": 550,  "80x80": 500  },
        marble:  { "30x30": 900, "60x60": 1200, "60x120": 1500, "80x80": 1300 },
        wood:    { "30x30": 400, "60x60": 500,  "60x120": 600,  "80x80": 550  },
      };
      
      const mat = document.getElementById("material") ? document.getElementById("material").value : "ceramic";
      const pricePerSqm = matPrices[mat][sizeStr] || 0;
      
      const sqmPerTile = (tileW / 100) * (tileL / 100);
      const totalSqm = data.summary.totalUsed * sqmPerTile;
      const totalCost = Math.round(totalSqm * pricePerSqm);
      const pricePerTile = Math.round(sqmPerTile * pricePerSqm);
      
      // Calculate No Plan Waste & Savings
      // แบบไม่วางแผน (No Plan) = ตัดทิ้งไม่นำกลับมาใช้ใหม่ (กว้าง/ขนาดบวกยาแนว) * (ยาว/ขนาดบวกยาแนว)
      const noPlanTiles = Math.ceil(roomW / (tileW + grout)) * Math.ceil(roomL / (tileL + grout));
      const noPlanArea = noPlanTiles * tileW * tileL;
      // หาพื้นที่ห้องหักอุปสรรค
      let actualRoomArea = roomW * roomL;
      for(const obs of obstacles) actualRoomArea -= (obs.w * obs.h);
      
      const noPlanWaste = noPlanArea > 0 ? ((noPlanArea - actualRoomArea) / noPlanArea) * 100 : 0;
      const savedTiles = Math.max(0, noPlanTiles - data.summary.totalUsed);
      const savedCost = savedTiles * pricePerTile;
      
      if(document.getElementById("sNoPlanWaste")) {
        document.getElementById("sNoPlanWaste").textContent = noPlanWaste.toFixed(1);
      }
      if(document.getElementById("sSavings")) {
        document.getElementById("sSavings").textContent = savedTiles;
      }
      if(document.getElementById("sSavingsCost")) {
        document.getElementById("sSavingsCost").textContent = savedCost.toLocaleString("th-TH");
      }
      if(document.getElementById("sCost")) {
        document.getElementById("sCost").textContent = totalCost.toLocaleString("th-TH");
      }
      if(document.getElementById("sCostFormula")) {
        document.getElementById("sCostFormula").textContent = `${data.summary.totalUsed} แผ่น × ฿${pricePerTile}/แผ่น`;
      }

      // Render Cut List
      const cutListGrid = document.getElementById("cutListGrid");
      if (cutListGrid) {
        cutListGrid.innerHTML = "";
        const cutTiles = data.layout.filter(t => t.type === "cut");
        if (cutTiles.length === 0) {
          cutListGrid.innerHTML = `<div style="grid-column: 1/-1; color: var(--muted); font-size: 13px;">🎉 ไม่มีชิ้นส่วนที่ต้องตัด (พอดีเต็มแผ่น)</div>`;
        } else {
          cutTiles.forEach((tile, idx) => {
            const isSliver = tile.w < 5 || tile.h < 5;
            const div = document.createElement("div");
            
            if (isSliver) {
              div.style.cssText = "background: #fef2f2; border: 1px solid #fecaca; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #991b1b; display: flex; flex-direction: column; gap: 4px;";
              div.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                  <strong>ชิ้นที่ ${idx + 1}</strong>
                  <span>${Math.round(tile.w)} × ${Math.round(tile.h)} cm</span>
                </div>
                <div style="font-size: 10px; font-weight: 500; color: #dc2626; display: flex; align-items: center; gap: 4px;">
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                  ตัดยาก/เสี่ยงแตก
                </div>
              `;
            } else {
              div.style.cssText = "background: #fffbeb; border: 1px solid #fde68a; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #92400e; display: flex; justify-content: space-between;";
              div.innerHTML = `
                <strong>ชิ้นที่ ${idx + 1}</strong>
                <span>${Math.round(tile.w)} × ${Math.round(tile.h)} cm</span>
              `;
            }
            cutListGrid.appendChild(div);
          });
        }
      }

      // Draw Layout
      drawLayout(roomW, roomL, tileW, tileL, obstacles, currentLayout);

    } catch (err) {
      errorMsg.textContent = err.message;
      errorMsg.style.display = "block";
    }
  }

  function drawLayout(roomW, roomL, tileW, tileL, obsArray, layout) {
    const padding = 40;
    const container = document.getElementById("canvasContainer");
    
    // Temporarily shrink canvas to measure true container size without infinite growth feedback loop
    canvas.style.display = 'none';
    
    // Calculate scale to fit inside container (assuming 40px base padding)
    const maxWidth = container.clientWidth - padding * 2 - 40 * 2;
    const maxHeight = container.clientHeight - padding * 2 - 40 * 2;
    
    canvas.style.display = 'block';
    
    const scaleX = maxWidth / roomW;
    const scaleY = maxHeight / roomL;
    
    currentScale = Math.max(Math.min(scaleX, scaleY), 1.0);
    
    // Calculate dynamic padding to prevent large tiles from being clipped
    const maxOverhang = Math.max(tileW, tileL) * currentScale;
    currentCanvasPadding = Math.max(40, maxOverhang * 0.8);
    
    const logicalWidth = (roomW * currentScale) + (currentCanvasPadding * 2);
    const logicalHeight = (roomL * currentScale) + (currentCanvasPadding * 2);
    
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    
    canvas.style.width = logicalWidth + "px";
    canvas.style.height = logicalHeight + "px";
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    ctx.save();
    
    ctx.translate(currentCanvasPadding, currentCanvasPadding);

    // Draw Room Background
    ctx.fillStyle = "#f9f6f0";
    ctx.fillRect(0, 0, roomW * currentScale, roomL * currentScale);
    ctx.strokeStyle = "#d6d3cd";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, roomW * currentScale, roomL * currentScale);

    // Array to hold text rendering commands to draw on top of obstacles
    const labelsToDraw = [];

    // Draw Tiles
    let cutIndex = 1;
    layout.forEach(tile => {
      const x = tile.x * currentScale;
      const y = tile.y * currentScale;
      const w = tile.w * currentScale;
      const h = tile.h * currentScale;

      ctx.beginPath();
      ctx.rect(x, y, w, h);
      
      if (tile.type === "full") {
        ctx.fillStyle = "rgba(138, 176, 153, 0.6)";
        ctx.fill();
        ctx.strokeStyle = "#5e8b75";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        const isSliver = tile.w < 5 || tile.h < 5;
        
        if (isSliver) {
          ctx.fillStyle = "rgba(224, 138, 115, 0.6)";
          ctx.fill();
          ctx.strokeStyle = "#bd5a44";
        } else {
          ctx.fillStyle = "rgba(230, 184, 133, 0.6)";
          ctx.fill();
          ctx.strokeStyle = "#b88142";
        }
        ctx.lineWidth = 1;
        ctx.stroke();
        
        if (tile.originalX !== undefined && tile.originalY !== undefined) {
          const ox = tile.originalX * currentScale;
          const oy = tile.originalY * currentScale;
          const ow = tileW * currentScale;
          const oh = tileL * currentScale;
          
          ctx.save();
          ctx.strokeStyle = isSliver ? "rgba(239, 68, 68, 0.6)" : "rgba(249, 115, 22, 0.6)"; 
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(ox, oy, ow, oh);
          ctx.restore();
        }
        
        // Center text on the CUT piece so they never overlap if an obstacle splits a tile
        let cx = x + w / 2;
        let cy = y + h / 2;
        
        labelsToDraw.push({ text: cutIndex.toString(), cx, cy });
        cutIndex++;
      }
    });

    // Draw Obstacles
    obsArray.forEach(obs => {
      const x = obs.x * currentScale;
      const y = obs.y * currentScale;
      const w = obs.w * currentScale;
      const h = obs.h * currentScale;
      
      ctx.fillStyle = "#d1cec7";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#8c8a85";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y);
      ctx.lineTo(x, y + h);
      ctx.strokeStyle = "#94a3b8";
      ctx.stroke();
    });

    // Draw Labels ON TOP of everything
    const fontSize = Math.max(14, Math.min(48, 24 * currentScale));
    ctx.font = `bold ${fontSize}px 'IBM Plex Sans Thai', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    
    labelsToDraw.forEach(label => {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeText(label.text, label.cx, label.cy);
      ctx.fillStyle = "#78350f";
      ctx.fillText(label.text, label.cx, label.cy);
    });

    ctx.restore();
    
    // Draw dimension labels
    ctx.fillStyle = "#475569";
    ctx.font = "500 13px 'IBM Plex Sans Thai', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Top label (Width)
    const centerX = currentCanvasPadding + (roomW * currentScale) / 2;
    ctx.fillText(`กว้าง: ${roomW} cm`, centerX, currentCanvasPadding / 2);
    
    // Left label (Length)
    const centerY = currentCanvasPadding + (roomL * currentScale) / 2;
    ctx.save();
    ctx.translate(currentCanvasPadding / 2, centerY);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`ยาว: ${roomL} cm`, 0, 0);
    ctx.restore();
  }

  // Initial render
  setTimeout(triggerCalc, 100);

  // Redraw on window resize to fit container
  window.addEventListener("resize", () => {
    const roomW = parseFloat(document.getElementById("roomW").value) || 0;
    const roomL = parseFloat(document.getElementById("roomL").value) || 0;
    const sizeStr = document.getElementById("tileSize").value;
    const parts = sizeStr.split("x");
    const tileW = parseFloat(parts[0]);
    const tileL = parseFloat(parts[1]);
    if (roomW > 0 && roomL > 0) drawLayout(roomW, roomL, tileW, tileL, obstacles, currentLayout);
  });
});
