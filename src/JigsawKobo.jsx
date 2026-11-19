import React, { useState, useRef, useEffect, useCallback } from "react";

// ===== ジグソーのふち(タブ)を描く =====
// e: null = 直線 / {kind, tab, ...} = 形状パラメータ
function edgeTo(ctx, ax, ay, bx, by, e) {
  if (!e) {
    ctx.lineTo(bx, by);
    return;
  }
  const dx = bx - ax;
  const dy = by - ay;
  // P(t, o): 辺に沿って t、法線方向へ o(辺の長さ比)
  const P = (t, o) => [ax + dx * t - dy * e.tab * o, ay + dy * t + dx * e.tab * o];
  if (e.kind === "wave") {
    // なめらかな波(k = 波の周期数)。半周期ごとにふくらみを交互に描く。
    // 両端の半周期は、角を辺に沿って(接線方向に)出発させる。角から斜めに
    // 出ると、同じ角から出る直交した辺の波と交差して細い重なりができるため。
    // 端の内側の制御点は、隣の半周期の制御点と一直線上で END 倍に伸ばして
    // つなぎ目のなめらかさを保ち、ふくらみの高さも中の半周期と揃える
    const seg = 2 * e.k;
    const END = 1.6;
    let d = 1;
    for (let i = 0; i < seg; i++) {
      const a = i / seg;
      const b = (i + 1) / seg;
      const h = b - a;
      const c1 =
        i === 0
          ? P(a + h * 0.3, 0)
          : i === seg - 1
            ? P(a + h * 0.3 * END, d * e.amp * END)
            : P(a + h * 0.3, d * e.amp);
      const c2 =
        i === seg - 1
          ? P(b - h * 0.3, 0)
          : i === 0
            ? P(b - h * 0.3 * END, d * e.amp * END)
            : P(b - h * 0.3, d * e.amp);
      ctx.bezierCurveTo(...c1, ...c2, ...P(b, 0));
      d = -d;
    }
    return;
  }
  if (e.kind === "step") {
    // 直角だけでできた四角い凸(レトロ風)
    const { mid, sz, wd } = e;
    ctx.lineTo(...P(mid - wd, 0));
    ctx.lineTo(...P(mid - wd, sz));
    ctx.lineTo(...P(mid + wd, sz));
    ctx.lineTo(...P(mid + wd, 0));
    ctx.lineTo(bx, by);
    return;
  }
  const { mid, sz, wd, neck, skew } = e;
  const apex = mid + skew;
  ctx.lineTo(...P(mid - wd, 0));
  ctx.bezierCurveTo(...P(mid, -neck), ...P(apex - wd * 2.2, sz), ...P(apex, sz));
  ctx.bezierCurveTo(...P(apex + wd * 2.2, sz), ...P(mid, -neck), ...P(mid + wd, 0));
  ctx.lineTo(bx, by);
}

// 辺ごとの形状を作る(styleで切り方を変える)
function mkEdge(style) {
  const tab = Math.random() < 0.5 ? 1 : -1;
  if (style === "square") {
    if (Math.random() < 0.25) return null; // たまに直線も混ぜる
    return {
      kind: "step",
      tab,
      mid: 0.35 + Math.random() * 0.3, // 凸の位置
      sz: 0.14 + Math.random() * 0.08, // 凸の高さ
      wd: 0.1 + Math.random() * 0.06, // 凸の半幅
    };
  }
  if (style === "wave") {
    const k = Math.random() < 0.5 ? 1 : 2; // 波の周期数
    return {
      kind: "wave",
      tab,
      k,
      amp: (k === 1 ? 0.08 : 0.055) + Math.random() * 0.05,
    };
  }
  if (style === "random") {
    return {
      kind: "knob",
      tab,
      mid: 0.42 + Math.random() * 0.16, // 凸の位置
      sz: 0.16 + Math.random() * 0.08, // 凸の高さ
      wd: 0.08 + Math.random() * 0.05, // 首の半幅
      neck: 0.04 + Math.random() * 0.05, // くびれの深さ
      skew: (Math.random() - 0.5) * 0.08, // 凸の傾き
    };
  }
  // classic: 中央に均一な凸(わずかな揺らぎのみ)
  return {
    kind: "knob",
    tab,
    mid: 0.48 + Math.random() * 0.04,
    sz: 0.19 + Math.random() * 0.03,
    wd: 0.1,
    neck: 0.06,
    skew: 0,
  };
}

// 逆向きにたどるとき用(隣のピースと同じ曲線になるよう反転)
function flipEdge(e) {
  if (!e) return e;
  if (e.kind === "wave") {
    // 波形は交互パターンの対称性により、向きを反転しても
    // tabの符号はそのままで一致する(反転すると波がずれてしまう)
    return { ...e };
  }
  return {
    ...e,
    tab: -e.tab,
    mid: 1 - e.mid,
    skew: e.skew !== undefined ? -e.skew : e.skew,
  };
}

function tracePiece(ctx, w, h, top, right, bottom, left) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  edgeTo(ctx, 0, 0, w, 0, top);
  edgeTo(ctx, w, 0, w, h, right);
  edgeTo(ctx, w, h, 0, h, bottom);
  edgeTo(ctx, 0, h, 0, 0, left);
  ctx.closePath();
}

// ===== サンプル画像(手持ち画像なしでも試せる) =====
function makeSampleImage() {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 600;
  const g = c.getContext("2d");
  const sky = g.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, "#2b1e66");
  sky.addColorStop(0.5, "#c94f7c");
  sky.addColorStop(1, "#f7b267");
  g.fillStyle = sky;
  g.fillRect(0, 0, 900, 600);
  // 太陽
  g.fillStyle = "#ffd166";
  g.beginPath();
  g.arc(620, 330, 110, 0, Math.PI * 2);
  g.fill();
  // 星
  g.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 40; i++) {
    g.beginPath();
    g.arc(Math.random() * 900, Math.random() * 250, Math.random() * 2 + 1, 0, Math.PI * 2);
    g.fill();
  }
  // 山
  const mountain = (col, base, amp) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, 600);
    for (let x = 0; x <= 900; x += 30) {
      g.lineTo(x, base - Math.abs(Math.sin(x / 130)) * amp - Math.sin(x / 47) * 20);
    }
    g.lineTo(900, 600);
    g.closePath();
    g.fill();
  };
  mountain("#4a2c6b", 430, 120);
  mountain("#2e1b4d", 500, 90);
  // 水面
  g.fillStyle = "#1b3a5c";
  g.fillRect(0, 520, 900, 80);
  g.strokeStyle = "rgba(255,209,102,0.6)";
  g.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.moveTo(560 - i * 12, 535 + i * 8);
    g.lineTo(680 + i * 12, 535 + i * 8);
    g.stroke();
  }
  return c.toDataURL("image/png");
}

// ===== 紙吹雪の演出 =====
function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      cv.width = cv.clientWidth * dpr;
      cv.height = cv.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    const W = () => cv.width;
    const colors = ["#f0a05a", "#ffd166", "#7bd389", "#5aa9e6", "#f76d8e", "#f2ead9"];
    // 上部から吹き上げ→落下する紙片
    const parts = Array.from({ length: 160 }, () => ({
      x: W() / 2 + (Math.random() - 0.5) * W() * 0.5,
      y: cv.height * (0.35 + Math.random() * 0.2),
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (-8 - Math.random() * 10) * dpr,
      w: (5 + Math.random() * 6) * dpr,
      h: (8 + Math.random() * 8) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[(Math.random() * colors.length) | 0],
      life: 0,
    }));
    const g = 0.32 * dpr;
    let raf;
    let t = 0;
    const tick = () => {
      t++;
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach((p) => {
        p.vy += g;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - p.life / 200);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * (0.6 + 0.4 * Math.abs(Math.sin(p.rot))));
        ctx.restore();
      });
      if (t < 220) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9998,
      }}
    />
  );
}

// ===== 切り出し(クロップ)用のヘルパー =====
// 2本指のタッチ間の距離
function touchDist(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
// 2本指のタッチの中点
function touchMid(a, b) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}
// 基準となるzoom/panから、focal(枠内のローカル座標)を固定したまま
// newZoomへ変化させた場合の新しいpanを計算する
function computePanForZoom(newZoom, focal, refZoom, refPan, fr) {
  const leftOld = (fr.w * (1 - refZoom)) / 2 + refPan.x;
  const topOld = (fr.h * (1 - refZoom)) / 2 + refPan.y;
  const fracX = (focal.x - leftOld) / (fr.w * refZoom);
  const fracY = (focal.y - topOld) / (fr.h * refZoom);
  const leftNew = focal.x - fracX * fr.w * newZoom;
  const topNew = focal.y - fracY * fr.h * newZoom;
  return {
    x: leftNew - (fr.w * (1 - newZoom)) / 2,
    y: topNew - (fr.h * (1 - newZoom)) / 2,
  };
}

// 盤面の大きさの探索範囲と、盤面の上の余白
const BOARD_MAX_FRAC = 0.96;
const BOARD_MIN_FRAC = 0.3;
const BOARD_TOP = 6;
// 絵の大きさ = 枠外に並べたピース同士の間隔(ピース寸法に対する比)。
// 1 なら一切重ならない。小さいほど絵が大きく、ピースは接近して並ぶ。
// 間隔は連続的に変わるので、どの写真・分割数でも設定が確実に効く
const SIZE_SEP = { normal: 1.0, large: 0.55, max: 0.35 };
const SIZE_OPTIONS = [
  ["normal", "標準"],
  ["large", "大きめ"],
  ["max", "最大"],
];

// 盤面(完成エリア)の外で、ピースを置ける領域。盤面を上寄せにして
// 下に幅いっぱいの広い帯を作る。余白を細い帯に分断しないための配置
function trayRegions(aw, ah, L, pw, ph) {
  const sideH = L.by + L.bh;
  return [
    { x: 0, y: sideH, w: aw, h: ah - sideH }, // 盤面の下(全幅)
    { x: 0, y: 0, w: L.bx, h: sideH }, // 盤面の左
    { x: L.bx + L.bw, y: 0, w: aw - L.bx - L.bw, h: sideH }, // 盤面の右
  ].filter((r) => r.w >= pw && r.h >= ph); // ピースが丸ごと入る領域だけ使う
}

// n×n枚を枠外の領域に均等配置する。返り値の sep は隣り合うピースの
// 間隔(ピース寸法に対する比)で、1 なら重なりなし
function planTray(aw, ah, L, n) {
  const pw = Math.ceil(L.cellW + L.pad * 2); // ピース画像の幅(透明な余白込み)
  const ph = Math.ceil(L.cellH + L.pad * 2);
  const regs = trayRegions(aw, ah, L, pw, ph);
  if (regs.length === 0) return { sep: 0, slots: [], pw, ph };

  const area = regs.reduce((a, r) => a + r.w * r.h, 0);
  const need = n * n;
  let remain = need;
  let sep = Infinity;
  const slots = [];

  regs.forEach((r, i) => {
    // 各領域の広さに応じて枚数を割り振る(最後の領域が端数を引き受ける)
    const k =
      i === regs.length - 1
        ? remain
        : Math.min(remain, Math.max(1, Math.round((need * (r.w * r.h)) / area)));
    remain -= k;
    if (k <= 0) return;
    // 領域の形に合わせて列数を決め、領域いっぱいに均等に散らす
    let cols = Math.max(1, Math.round(Math.sqrt((k * (r.w / pw)) / (r.h / ph))));
    cols = Math.min(cols, k);
    const rows = Math.ceil(k / cols);
    const stepX = cols > 1 ? (r.w - pw) / (cols - 1) : 0;
    const stepY = rows > 1 ? (r.h - ph) / (rows - 1) : 0;
    if (cols > 1) sep = Math.min(sep, stepX / pw);
    if (rows > 1) sep = Math.min(sep, stepY / ph);
    let c = 0;
    for (let j = 0; j < rows && c < k; j++)
      for (let i2 = 0; i2 < cols && c < k; i2++, c++)
        slots.push({ x: r.x + i2 * stepX, y: r.y + j * stepY });
  });

  return { sep: sep === Infinity ? 1 : Math.min(sep, 1), slots, pw, ph };
}

const GRID_OPTIONS = [3, 4, 5, 6];
const SHAPE_OPTIONS = [
  ["classic", "クラシック"],
  ["random", "ランダム"],
  ["wave", "なみなみ"],
  ["square", "しかく"],
];

export default function JigsawKobo() {
  const [img, setImg] = useState(null); // HTMLImageElement
  const [imgSrc, setImgSrc] = useState(null);
  const [grid, setGrid] = useState(4);
  const [shape, setShape] = useState("classic");
  const [boardSize, setBoardSize] = useState("large");
  const [board, setBoard] = useState(null);
  const [pieces, setPieces] = useState([]);
  const [showGhost, setShowGhost] = useState(true);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [barOpen, setBarOpen] = useState(true);
  const [rawImg, setRawImg] = useState(null); // 切り出し前の元画像
  const [origSrc, setOrigSrc] = useState(null); // 最初に選んだ加工前の画像(再クロップ用)
  const [cropOpen, setCropOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [areaTick, setAreaTick] = useState(0); // プレイエリアのサイズ変化の通知用
  const [loadError, setLoadError] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const [sheets, setSheets] = useState(null); // 印刷プレビューの画像
  const areaRef = useRef(null);
  const zRef = useRef(10);
  const startRef = useRef(0); // タイマーの開始時刻(ms)
  const dragRef = useRef(null);
  const edgesRef = useRef(null); // ピースの辺の形(印刷用に切り取り線を描き直すのに使う)
  const celebratedRef = useRef(false); // 完成演出をこのパズルで出したか
  const dragCropRef = useRef(null);
  const touchCropRef = useRef(null);
  const cropBoxRef = useRef(null);
  const fileRef = useRef(null);

  // ===== タイマー(開始時刻との差分で計算。バックグラウンドでも正確) =====
  useEffect(() => {
    if (!running) return;
    const t = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - startRef.current) / 1000))),
      500
    );
    return () => clearInterval(t);
  }, [running]);

  // ===== ドラッグ中はブラウザのスクロール/引っ張って更新を止める =====
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const prevent = (e) => {
      if (dragRef.current || dragCropRef.current || touchCropRef.current) e.preventDefault();
    };
    area.addEventListener("touchstart", prevent, { passive: false });
    area.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      area.removeEventListener("touchstart", prevent);
      area.removeEventListener("touchmove", prevent);
    };
  }, []);

  // ===== 盤面とピースを生成 =====
  // 盤面サイズ・位置を計算する(setupと画面リサイズの両方で使う共通ロジック)
  const computeBoardLayout = (aw, ah, n, imageEl, size = boardSize) => {
    const ar = imageEl.width / imageEl.height;
    const wantSep = SIZE_SEP[size] ?? SIZE_SEP.large;

    // 指定の比率で盤面を置いたときの各寸法。盤面は上寄せにして、
    // 下にピースを置くための広い帯を作る
    const shape = (frac) => {
      let bw = aw * frac;
      let bh = bw / ar;
      const maxH = ah * frac;
      if (bh > maxH) {
        bh = maxH;
        bw = bh * ar;
      }
      bw = Math.round(bw);
      bh = Math.round(bh);
      const bx = Math.round((aw - bw) / 2);
      const by = BOARD_TOP;
      const cellW = bw / n;
      const cellH = bh / n;
      const pad = Math.ceil(Math.max(cellW, cellH) * 0.28);
      return { bw, bh, bx, by, cellW, cellH, pad };
    };

    // ピース同士の間隔が設定値を満たす範囲で、盤面をできるだけ大きくする
    for (let f = BOARD_MAX_FRAC; f >= BOARD_MIN_FRAC; f -= 0.01) {
      const L = shape(f);
      if (planTray(aw, ah, L, n).sep >= wantSep) return L;
    }
    return shape(BOARD_MIN_FRAC);
  };

  const setup = useCallback((imageEl, n, style, size = boardSize) => {
    const area = areaRef.current;
    if (!area || !imageEl) return;
    const aw = area.clientWidth;
    const ah = area.clientHeight;

    // 盤面はできるだけ大きく。ただしピースが細かいほど周囲の置き場が
    // 少なくて済むので、分割数に応じてさらに広げる
    const { bw, bh, bx, by, cellW, cellH, pad } = computeBoardLayout(aw, ah, n, imageEl, size);

    // 辺ごとの形状を決める(外周は直線 = null)
    const H = Array.from({ length: n + 1 }, (_, r) =>
      Array.from({ length: n }, () => (r === 0 || r === n ? null : mkEdge(style)))
    );
    const V = Array.from({ length: n }, () =>
      Array.from({ length: n + 1 }, (_, c) => (c === 0 || c === n ? null : mkEdge(style)))
    );
    edgesRef.current = { H, V, n }; // 印刷用シートで同じ切り取り線を描くため保存

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // ピースの置き場は盤面(完成エリア)の外だけ。枚数ぶんを余白に均等配置する
    const plan = planTray(aw, ah, { bw, bh, bx, by, cellW, cellH, pad }, n);
    const pieceW = plan.pw;
    const pieceH = plan.ph;
    const slots = plan.slots;
    // 並び順をシャッフルして、絵の断片がばらばらに散らばって見えるようにする
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }

    let slotIdx = 0;
    const scatter = () => {
      // 置き場が取れないほど余白が狭い場合だけ、画面の下端に並べる
      if (slots.length === 0) {
        return {
          x: Math.random() * Math.max(0, aw - pieceW),
          y: Math.max(0, ah - pieceH),
        };
      }
      const s = slots[slotIdx++ % slots.length];
      return { x: s.x, y: s.y };
    };

    const list = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const cw = Math.ceil(cellW + pad * 2);
        const ch = Math.ceil(cellH + pad * 2);
        const cv = document.createElement("canvas");
        cv.width = Math.round(cw * dpr);
        cv.height = Math.round(ch * dpr);
        const ctx = cv.getContext("2d");
        ctx.scale(dpr, dpr);
        ctx.translate(pad, pad);
        const edges = [H[r][c], V[r][c + 1], flipEdge(H[r + 1][c]), flipEdge(V[r][c])];
        ctx.save();
        tracePiece(ctx, cellW, cellH, ...edges);
        ctx.clip();
        ctx.drawImage(imageEl, 0, 0, imageEl.width, imageEl.height, -c * cellW, -r * cellH, bw, bh);
        ctx.restore();
        tracePiece(ctx, cellW, cellH, ...edges);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.stroke();

        const pos = scatter();
        list.push({
          id: r * n + c,
          w: cw,
          h: ch,
          src: cv.toDataURL(),
          x: pos.x,
          y: pos.y,
          tx: bx + c * cellW - pad,
          ty: by + r * cellH - pad,
          locked: false,
          z: ++zRef.current,
        });
      }
    }
    setBoard({ x: bx, y: by, w: bw, h: bh, cellW, cellH, n });
    setPieces(list);
    setMoves(0);
    setElapsed(0);
    startRef.current = Date.now();
    setDone(false);
    setRunning(true);
    setShowGhost(true); // 完成時にオフにした下絵を元に戻す
    celebratedRef.current = false;
    dragRef.current = null; // 操作中に作り直された場合の取り残しを防ぐ
    setPrintOpen(false); // 作り直したらプレビューは古くなるので閉じる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardSize]);

  useEffect(() => {
    if (img) setup(img, grid, shape);
  }, [img, grid, shape, setup]);

  // ===== プレイエリアのサイズ変化を監視(画面回転・リサイズ対応) =====
  useEffect(() => {
    const area = areaRef.current;
    if (!area || typeof ResizeObserver === "undefined") return;
    // 回転中は何度も発火するので、落ち着いてから一度だけ反映する
    let timer = null;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => setAreaTick((t) => t + 1), 180);
    });
    ro.observe(area);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  // ===== 設定バーの開閉・画面リサイズで盤面を再サイズする =====
  // ピースの形はそのまま、置き場を計算し直して配置を更新する。
  // (倍率で位置を伸縮すると枠の中や画面外に飛んでしまうため)
  useEffect(() => {
    const area = areaRef.current;
    if (!area || !img || !board) return;
    const aw = area.clientWidth;
    const ah = area.clientHeight;
    const n = board.n;
    const next = computeBoardLayout(aw, ah, n, img);
    const plan = planTray(aw, ah, next, n);
    const nw = plan.pw;
    const nh = plan.ph;

    // 盤面の大きさ・位置が変わっておらず、かつ全ピースが画面内に収まっている
    // ときだけ何もしない。盤面が同じでも画面が縮むとピースが画面外に
    // 取り残されるため、収まりも必ず確かめる
    const boardSame =
      next.bw === board.w && next.bh === board.h && next.bx === board.x && next.by === board.y;
    const allVisible = pieces.every(
      (p) =>
        p.x >= -nw * 0.45 &&
        p.y >= -nh * 0.45 &&
        p.x + nw <= aw + nw * 0.45 &&
        p.y + nh <= ah + nh * 0.45
    );
    if (boardSame && allVisible) return;

    setPieces((ps) => {
      // まだ置けていないピースを、新しい置き場に均等に割り当て直す。
      // 画面上の並び順で対応づけて、見た目の位置関係を保つ
      const free = ps.filter((p) => !p.locked).sort((a, b) => a.y - b.y || a.x - b.x);
      const open = [...plan.slots].sort((a, b) => a.y - b.y || a.x - b.x);
      const at = new Map();
      free.forEach((p, i) => {
        const s =
          open.length === 0
            ? null
            : open[
                free.length > 1
                  ? Math.round((i * (open.length - 1)) / (free.length - 1))
                  : 0
              ];
        if (s) at.set(p.id, s);
      });

      return ps.map((p) => {
        const r = Math.floor(p.id / n);
        const c = p.id % n;
        const tx = next.bx + c * next.cellW - next.pad;
        const ty = next.by + r * next.cellH - next.pad;
        if (p.locked) return { ...p, w: nw, h: nh, tx, ty, x: tx, y: ty };
        const s = at.get(p.id);
        // 置き場が取れない場合だけ、画面内に収まるよう現在位置を丸める
        const x = s ? s.x : Math.min(Math.max(p.x, 0), Math.max(0, aw - nw));
        const y = s ? s.y : Math.min(Math.max(p.y, 0), Math.max(0, ah - nh));
        return { ...p, w: nw, h: nh, tx, ty, x, y };
      });
    });
    setBoard({ x: next.bx, y: next.by, w: next.bw, h: next.bh, cellW: next.cellW, cellH: next.cellH, n });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barOpen, areaTick]);

  // ===== 画像読み込み =====
  const finalizeImage = (src) => {
    const im = new Image();
    im.onload = () => {
      setImgSrc(src);
      setImg(im);
    };
    im.src = src;
  };

  // frameサイズ(切り出し枠)を、元画像の縦横比を保ったまま
  // プレイエリアに収まる大きさで計算する
  const computeFrame = useCallback((imageEl) => {
    const area = areaRef.current;
    if (!area || !imageEl) return { w: 0, h: 0 };
    const aw = area.clientWidth;
    const ah = area.clientHeight;
    const maxW = aw * 0.86;
    const maxH = ah * 0.62;
    let w = maxW;
    let h = (w * imageEl.height) / imageEl.width;
    if (h > maxH) {
      h = maxH;
      w = (h * imageEl.width) / imageEl.height;
    }
    return { w: Math.round(w), h: Math.round(h) };
  }, []);

  const openCrop = (src) => {
    setPrintOpen(false); // 印刷画面と同時に開かないようにする
    const im = new Image();
    im.onload = () => {
      // 巨大な写真はメモリを圧迫するので、扱いやすいサイズまで縮小しておく
      const MAX = 2000;
      if (im.width > MAX || im.height > MAX) {
        const sc = MAX / Math.max(im.width, im.height);
        const cv = document.createElement("canvas");
        cv.width = Math.round(im.width * sc);
        cv.height = Math.round(im.height * sc);
        cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
        const small = new Image();
        small.onload = () => {
          setRawImg(small);
          setZoom(1);
          setPan({ x: 0, y: 0 });
          setFrame(computeFrame(small));
          setCropOpen(true);
          setLoadError("");
        };
        small.src = cv.toDataURL("image/png");
        return;
      }
      setRawImg(im);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setFrame(computeFrame(im));
      setCropOpen(true);
      setLoadError("");
    };
    im.onerror = () => {
      setLoadError(
        "この画像は読み込めませんでした。別の画像を選ぶか、スクリーンショットを撮って試してみてください。"
      );
    };
    im.src = src;
  };

  const onFile = (file) => {
    if (!file) return;
    // Androidの一部端末では file.type が空になることがあるため、
    // 空の場合は拡張子で判定し、それも不明なら読み込みを試みる
    if (file.type && !file.type.startsWith("image/")) {
      setLoadError("画像ファイルを選んでください。");
      return;
    }
    setLoadError("");
    const reader = new FileReader();
    reader.onload = () => {
      setOrigSrc(reader.result);
      openCrop(reader.result);
    };
    reader.onerror = () => {
      setLoadError("画像の読み込みに失敗しました。もう一度試してみてください。");
    };
    reader.readAsDataURL(file);
  };

  const clampPan = (p, z, fr) => {
    const maxX = (fr.w * (z - 1)) / 2;
    const maxY = (fr.h * (z - 1)) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, p.x)),
      y: Math.min(maxY, Math.max(-maxY, p.y)),
    };
  };

  // スライダー操作(枠の中心を基準にズーム)
  const onZoomChange = (z) => {
    const focal = { x: frame.w / 2, y: frame.h / 2 };
    const newPan = computePanForZoom(z, focal, zoom, pan, frame);
    setZoom(z);
    setPan(clampPan(newPan, z, frame));
  };

  // マウス・ペンでのドラッグ(パンのみ。タッチは下のuseEffectで処理)
  const onCropDown = (e) => {
    if (e.pointerType === "touch") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragCropRef.current = { sx: e.clientX, sy: e.clientY, sp: pan };
  };
  const onCropMove = (e) => {
    if (e.pointerType === "touch") return;
    const d = dragCropRef.current;
    if (!d) return;
    e.preventDefault();
    const next = { x: d.sp.x + (e.clientX - d.sx), y: d.sp.y + (e.clientY - d.sy) };
    setPan(clampPan(next, zoom, frame));
  };
  const onCropUp = () => {
    dragCropRef.current = null;
  };

  // タッチ操作(1本指パン・2本指ピンチズーム)
  // preventDefaultを効かせるため、Reactの合成イベントではなく
  // passive:falseのネイティブリスナーとして登録する
  useEffect(() => {
    const box = cropBoxRef.current;
    if (!cropOpen || !box) return;

    const onStart = (e) => {
      e.preventDefault();
      if (e.touches.length >= 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const rect = box.getBoundingClientRect();
        touchCropRef.current = {
          mode: "pinch",
          startDist: touchDist(a, b),
          startZoom: zoom,
          startPan: pan,
          rectLeft: rect.left,
          rectTop: rect.top,
        };
      } else if (e.touches.length === 1) {
        touchCropRef.current = {
          mode: "pan",
          sx: e.touches[0].clientX,
          sy: e.touches[0].clientY,
          sp: pan,
        };
      }
    };

    const onMove = (e) => {
      const st = touchCropRef.current;
      if (!st) return;
      e.preventDefault();
      if (st.mode === "pinch" && e.touches.length >= 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const d = touchDist(a, b);
        const newZoom = Math.min(3, Math.max(1, st.startZoom * (d / st.startDist)));
        const m = touchMid(a, b);
        const focal = { x: m.x - st.rectLeft, y: m.y - st.rectTop };
        const newPan = computePanForZoom(newZoom, focal, st.startZoom, st.startPan, frame);
        setZoom(newZoom);
        setPan(clampPan(newPan, newZoom, frame));
      } else if (st.mode === "pan" && e.touches.length === 1) {
        const t = e.touches[0];
        const next = { x: st.sp.x + (t.clientX - st.sx), y: st.sp.y + (t.clientY - st.sy) };
        setPan((p) => clampPan(next, zoom, frame));
      }
    };

    const onEnd = (e) => {
      if (e.touches.length === 0) {
        touchCropRef.current = null;
      } else if (e.touches.length === 1) {
        // 1本だけ残った場合はパン操作に切り替える
        touchCropRef.current = {
          mode: "pan",
          sx: e.touches[0].clientX,
          sy: e.touches[0].clientY,
          sp: pan,
        };
      }
    };

    box.addEventListener("touchstart", onStart, { passive: false });
    box.addEventListener("touchmove", onMove, { passive: false });
    box.addEventListener("touchend", onEnd, { passive: false });
    box.addEventListener("touchcancel", onEnd, { passive: false });
    return () => {
      box.removeEventListener("touchstart", onStart);
      box.removeEventListener("touchmove", onMove);
      box.removeEventListener("touchend", onEnd);
      box.removeEventListener("touchcancel", onEnd);
      // ここで touchCropRef を解除してはいけない。この effect は zoom/pan が
      // 変わるたびに付け直されるので、解除するとピンチやドラッグが最初の
      // 1回の動きで止まってしまう。解除はモーダルを閉じたときだけ(下の effect)
    };
  }, [cropOpen, zoom, pan, frame]);

  // 指を置いたままモーダルを閉じるとtouchendが来ないため、閉じたら必ず解除する
  useEffect(() => {
    if (!cropOpen) touchCropRef.current = null;
  }, [cropOpen]);

  // 切り出し中に画面が回転・リサイズされたら枠も作り直す
  useEffect(() => {
    if (!cropOpen || !rawImg) return;
    const next = computeFrame(rawImg);
    if (!next.w || (next.w === frame.w && next.h === frame.h)) return;
    setFrame(next);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaTick, cropOpen, rawImg]);

  const confirmCrop = () => {
    if (!rawImg || !frame.w) return;
    const effScale = (frame.w / rawImg.width) * zoom;
    const imgLeft = (frame.w * (1 - zoom)) / 2 + pan.x;
    const imgTop = (frame.h * (1 - zoom)) / 2 + pan.y;
    const sx = -imgLeft / effScale;
    const sy = -imgTop / effScale;
    const sw = frame.w / effScale;
    const sh = frame.h / effScale;

    // 印刷でも十分な解像度を残す。長辺を基準にするので、
    // 横長でも縦長でも同じ細かさになる
    const CROP_MAX = 1800;
    const longer = Math.max(rawImg.width, rawImg.height);
    const k = Math.min(1, CROP_MAX / longer);
    const outW = Math.max(1, Math.round(rawImg.width * k));
    const outH = Math.max(1, Math.round(rawImg.height * k));
    const cv = document.createElement("canvas");
    cv.width = outW;
    cv.height = outH;
    const ctx = cv.getContext("2d");
    ctx.drawImage(rawImg, sx, sy, sw, sh, 0, 0, outW, outH);
    finalizeImage(cv.toDataURL("image/png"));
    setCropOpen(false);
    setRawImg(null); // 元画像の参照を手放してメモリを戻す(origSrcから作り直せる)
  };

  const cancelCrop = () => {
    setCropOpen(false);
    setRawImg(null);
  };

  // ===== ドラッグ操作 =====
  const onDown = (e, p) => {
    if (p.locked || done) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = areaRef.current.getBoundingClientRect();
    dragRef.current = {
      id: p.id,
      ox: e.clientX - rect.left - p.x,
      oy: e.clientY - rect.top - p.y,
      sx: p.x, // つかんだ時点の位置(動かしたかの判定用)
      sy: p.y,
    };
    setPieces((ps) => ps.map((q) => (q.id === p.id ? { ...q, z: ++zRef.current } : q)));
  };
  const onMove = (e, p) => {
    const d = dragRef.current;
    if (!d || d.id !== p.id) return;
    e.preventDefault();
    const area = areaRef.current;
    const rect = area.getBoundingClientRect();
    const nx = Math.min(
      Math.max(e.clientX - rect.left - d.ox, -p.w * 0.4),
      rect.width - p.w * 0.6
    );
    const ny = Math.min(
      Math.max(e.clientY - rect.top - d.oy, -p.h * 0.4),
      rect.height - p.h * 0.6
    );
    setPieces((ps) => ps.map((q) => (q.id === p.id ? { ...q, x: nx, y: ny } : q)));
  };
  const onCancel = () => {
    dragRef.current = null;
  };
  const onUp = (e, p) => {
    const d = dragRef.current;
    if (!d || d.id !== p.id) return;
    dragRef.current = null;
    // ただ触れただけ(ほぼ動いていない)は手数に数えない
    if (Math.hypot(p.x - d.sx, p.y - d.sy) > 3) setMoves((m) => m + 1);
    const th = Math.max(16, Math.min(board.cellW, board.cellH) * 0.35);
    // 直前のドラッグ結果を取りこぼさないよう、必ず最新のstateを基に判定する
    setPieces((ps) =>
      ps.map((q) => {
        if (q.id !== p.id) return q;
        const dist = Math.hypot(q.x - q.tx, q.y - q.ty);
        if (dist < th) return { ...q, x: q.tx, y: q.ty, locked: true, z: 1 };
        return q;
      })
    );
  };

  // ===== 印刷用の画像を作る =====
  // mode: "guide" = 下地(薄い絵と外枠だけ) / "cut" = パズル本体(絵＋切り取り線)
  // longSide: 長辺のピクセル数(保存は高解像度、プレビューは小さめ)
  const buildSheet = (mode, longSide) => {
    const E = edgesRef.current;
    if (!img || !E) return null;
    const n = E.n;
    const scale = longSide / Math.max(img.width, img.height);
    const W = Math.round(img.width * scale);
    const H = Math.round(img.height * scale);
    const m = Math.round(Math.max(W, H) * 0.05); // 白フチ(裁ち代)

    const cv = document.createElement("canvas");
    cv.width = W + m * 2;
    cv.height = H + m * 2;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);

    ctx.save();
    ctx.translate(m, m);

    // 絵。下地は薄く印刷して、ピースを上に置けるようにする
    ctx.globalAlpha = mode === "guide" ? 0.28 : 1;
    ctx.drawImage(img, 0, 0, W, H);
    ctx.globalAlpha = 1;

    // ピースの境界線。ゲーム中とまったく同じ形で描く
    const cw = W / n;
    const ch = H / n;
    const lw = Math.max(1, Math.round(Math.max(W, H) / 1000));
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    // 切り取り線はパズル本体だけに引く。下地はピースの跡を残さず、
    // 薄い絵と外枠だけにする
    if (mode === "cut") {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          ctx.save();
          ctx.translate(c * cw, r * ch);
          tracePiece(
            ctx,
            cw,
            ch,
            E.H[r][c],
            E.V[r][c + 1],
            flipEdge(E.H[r + 1][c]),
            flipEdge(E.V[r][c])
          );
          ctx.restore();
          // 絵の明暗どちらでも見えるよう、白で縁取りしてから黒
          ctx.lineWidth = lw * 5;
          ctx.strokeStyle = "rgba(255,255,255,0.92)";
          ctx.stroke();
          ctx.lineWidth = lw * 2.4;
          ctx.strokeStyle = "rgba(0,0,0,0.88)";
          ctx.stroke();
        }
      }
    }

    // 外枠(下地は、ピースを並べる範囲の目印になる)
    ctx.lineWidth = lw * 2;
    ctx.strokeStyle = mode === "guide" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.85)";
    ctx.strokeRect(0, 0, W, H);
    ctx.restore();

    // 貼り合わせの目安になるよう、四隅にトンボを入れる
    const t = Math.round(m * 0.5);
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = Math.max(1, Math.round(lw * 0.8));
    [
      [m, m, 1, 1],
      [m + W, m, -1, 1],
      [m, m + H, 1, -1],
      [m + W, m + H, -1, -1],
    ].forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x - dx * t, y);
      ctx.lineTo(x - dx * t * 0.25, y);
      ctx.moveTo(x, y - dy * t);
      ctx.lineTo(x, y - dy * t * 0.25);
      ctx.stroke();
    });

    return cv;
  };

  // プレビューを作って印刷画面を開く(表示用なので小さめに描く)
  const openPrint = () => {
    setCropOpen(false); // 切り出し画面と同時に開かないようにする
    const g = buildSheet("guide", 1000);
    const c = buildSheet("cut", 1000);
    if (!g || !c) {
      setLoadError("先に画像を選んでパズルを作ってください。");
      return;
    }
    setSheets({ guide: g.toDataURL("image/png"), cut: c.toDataURL("image/png") });
    setPrintOpen(true);
  };

  // 保存は印刷用の高解像度で描き直す
  const saveSheet = (mode) => {
    const cv = buildSheet(mode, 2400);
    if (!cv) return;
    // 文字化けを避けるため、ファイル名は半角英数にする
    const n = edgesRef.current.n;
    const name = `jigsaw-${n}x${n}-${mode === "guide" ? "guide" : "puzzle"}.png`;
    const finish = (url, revoke) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (revoke) setTimeout(() => URL.revokeObjectURL(url), 10000);
    };
    if (cv.toBlob) {
      cv.toBlob((b) => {
        if (b) finish(URL.createObjectURL(b), true);
        else finish(cv.toDataURL("image/png"), false);
      }, "image/png");
    } else {
      finish(cv.toDataURL("image/png"), false);
    }
  };

  // ===== 完成判定(pieces更新後に一度だけ発火させる) =====
  useEffect(() => {
    if (celebratedRef.current) return;
    if (pieces.length === 0 || !pieces.every((q) => q.locked)) return;
    celebratedRef.current = true;
    setDone(true);
    setRunning(false);
    setShowGhost(false);
  }, [pieces]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const lockedCount = pieces.filter((p) => p.locked).length;

  // ===== スタイル =====
  const S = {
    root: {
      fontFamily: "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif",
      display: "flex",
      flexDirection: "column",
      background: "#233830",
      color: "#f2ead9",
      overflow: "hidden",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      padding: "10px 16px",
      background: "#1a2a24",
      borderBottom: "2px solid #3d5a4c",
    },
    title: { fontWeight: 900, fontSize: 18, letterSpacing: 2, marginRight: "auto" },
    btn: (active) => ({
      border: "1.5px solid " + (active ? "#f0a05a" : "#3d5a4c"),
      background: active ? "#f0a05a" : "transparent",
      color: active ? "#1a2a24" : "#f2ead9",
      borderRadius: 999,
      padding: "5px 13px",
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "inherit",
      touchAction: "manipulation",
      WebkitTapHighlightColor: "transparent",
    }),
    optbar: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      padding: "8px 16px",
      background: "#152420",
      borderBottom: "2px solid #3d5a4c",
    },
    stat: { fontSize: 13, opacity: 0.85, fontVariantNumeric: "tabular-nums" },
    area: {
      position: "relative",
      flex: 1,
      // フェルト台の質感
      background:
        "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.045), transparent 60%)," +
        "repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 4px), #2c463a",
      touchAction: "none",
      overflow: "hidden",
    },
  };

  return (
    <div className="jk-root" style={S.root}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap');
        html, body { margin: 0; overscroll-behavior: none; }
        .jk-root { height: 100vh; height: 100dvh; overscroll-behavior: none; }
        .jk-area { overscroll-behavior: none; -webkit-user-select: none; }
        .jk-piece { -webkit-touch-callout: none; }
        button:hover { filter: brightness(1.1); }
        @keyframes pop { 0%{transform:scale(1.12)} 100%{transform:scale(1)} }
        @keyframes jkGlow {
          0%   { box-shadow: 0 0 0 0 rgba(255,209,102,0); }
          25%  { box-shadow: 0 0 40px 10px rgba(255,209,102,0.85); }
          100% { box-shadow: 0 0 60px 4px rgba(255,209,102,0); }
        }
        @keyframes jkRise {
          0%   { transform: translateX(-50%) translateY(30px); opacity: 0; }
          100% { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>

      <div style={S.header}>
        <div style={S.title}>🧩 ジグソー工房</div>
        {img && (
          <>
            <span style={S.stat}>⏱ {fmt(elapsed)}</span>
            <span style={S.stat}>
              🧩 {lockedCount}/{pieces.length}
            </span>
            <span style={S.stat}>✋ {moves}手</span>
            <button
              style={{ ...S.btn(false), padding: "5px 10px" }}
              onClick={() => setBarOpen((v) => !v)}
              title={barOpen ? "オプションを隠す" : "オプションを表示"}
            >
              {barOpen ? "▲" : "▽"} 設定
            </button>
          </>
        )}
      </div>

      {img && barOpen && (
        <div style={S.optbar}>
          {GRID_OPTIONS.map((n) => (
            <button key={n} style={S.btn(grid === n)} onClick={() => setGrid(n)}>
              {n}×{n}
            </button>
          ))}
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value)}
            style={{ ...S.btn(false), background: "#1a2a24", cursor: "pointer" }}
          >
            {SHAPE_OPTIONS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <span style={{ ...S.stat, marginLeft: 4 }}>絵</span>
          {SIZE_OPTIONS.map(([v, label]) => (
            <button key={v} style={S.btn(boardSize === v)} onClick={() => setBoardSize(v)}>
              {label}
            </button>
          ))}
          <button style={S.btn(showGhost)} onClick={() => setShowGhost((v) => !v)}>
            下絵
          </button>
          <button style={S.btn(false)} onClick={() => setup(img, grid, shape)}>
            シャッフル
          </button>
          <button style={S.btn(false)} onClick={() => (origSrc || imgSrc) && openCrop(origSrc || imgSrc)}>
            切り出し直す
          </button>
          <button style={S.btn(false)} onClick={() => fileRef.current.click()}>
            画像を変える
          </button>
          <button style={S.btn(false)} onClick={openPrint} title="印刷用の画像を見る・保存する">
            🖨 印刷
          </button>
        </div>
      )}

      <div ref={areaRef} className="jk-area" style={S.area}>
        {/* 開始画面 */}
        {!img && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              textAlign: "center",
              padding: 24,
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0]);
            }}
          >
            <div style={{ fontSize: 52 }}>🧩</div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3 }}>ジグソー工房</div>
            <div style={{ opacity: 0.8, fontSize: 14, lineHeight: 1.8 }}>
              好きな画像を選ぶと、その場でジグソーパズルになります。
              <br />
              ここに画像をドロップしてもOK。
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                style={{ ...S.btn(true), fontSize: 15, padding: "10px 22px" }}
                onClick={() => fileRef.current.click()}
              >
                画像を選ぶ
              </button>
              <button
                style={{ ...S.btn(false), fontSize: 15, padding: "10px 22px" }}
                onClick={() => {
                  const s = makeSampleImage();
                  setOrigSrc(s);
                  openCrop(s);
                }}
              >
                サンプルで試す
              </button>
            </div>
          </div>
        )}

        {/* エラー通知(開始画面・プレイ中どちらでも見える) */}
        {loadError && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 16,
              transform: "translateX(-50%)",
              maxWidth: "90%",
              fontSize: 13,
              lineHeight: 1.7,
              color: "#ffd166",
              background: "rgba(21,36,32,0.96)",
              border: "1px solid rgba(255,209,102,0.5)",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              zIndex: 10001,
              boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
            }}
          >
            <span>{loadError}</span>
            <button
              style={{ ...S.btn(false), padding: "2px 9px", flexShrink: 0 }}
              onClick={() => setLoadError("")}
            >
              ✕
            </button>
          </div>
        )}

        {/* 印刷プレビュー */}
        {printOpen && sheets && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(15,24,20,0.95)",
              zIndex: 10000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: 16,
              overflowY: "auto",
              touchAction: "auto",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 2 }}>印刷用の画像</div>
            <div style={{ fontSize: 12, opacity: 0.8, textAlign: "center", lineHeight: 1.7 }}>
              2枚とも同じ用紙・同じ倍率で印刷すると、ピースと下地がぴったり重なります
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
                justifyContent: "center",
                width: "100%",
              }}
            >
              {[
                ["guide", "下地", "ピースを置く台紙"],
                ["cut", "パズル", "切り取ってピースに"],
              ].map(([mode, label, desc]) => (
                <div
                  key={mode}
                  style={{
                    flex: "1 1 0",
                    minWidth: 140,
                    maxWidth: 360,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid #3d5a4c",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
                  <img
                    src={sheets[mode]}
                    alt={label}
                    style={{
                      width: "100%",
                      maxHeight: "32vh",
                      objectFit: "contain",
                      background: "#fff",
                      borderRadius: 6,
                      boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
                    }}
                  />
                  <div style={{ fontSize: 11, opacity: 0.75, textAlign: "center", lineHeight: 1.6 }}>
                    {desc}
                  </div>
                  <button
                    style={{ ...S.btn(true), fontSize: 14, padding: "8px 18px" }}
                    onClick={() => saveSheet(mode)}
                  >
                    ⬇ 保存
                  </button>
                </div>
              ))}
            </div>

            <button
              style={{ ...S.btn(false), fontSize: 14, padding: "8px 20px", marginBottom: 8 }}
              onClick={() => setPrintOpen(false)}
            >
              閉じる
            </button>
          </div>
        )}

        {/* 切り出し(拡大・トリミング)モーダル */}
        {cropOpen && rawImg && frame.w > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(15,24,20,0.92)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              zIndex: 10000,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              ドラッグで位置調整・2本指または下のスライダーで拡大縮小
            </div>
            <div
              ref={cropBoxRef}
              style={{
                position: "relative",
                width: frame.w,
                height: frame.h,
                overflow: "hidden",
                borderRadius: 8,
                border: "2px solid #f0a05a",
                boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                touchAction: "none",
              }}
              onPointerDown={onCropDown}
              onPointerMove={onCropMove}
              onPointerUp={onCropUp}
              onPointerCancel={onCropUp}
            >
              <img
                src={rawImg.src}
                draggable={false}
                style={{
                  position: "absolute",
                  left: (frame.w * (1 - zoom)) / 2 + pan.x,
                  top: (frame.h * (1 - zoom)) / 2 + pan.y,
                  width: frame.w * zoom,
                  height: frame.h * zoom,
                  maxWidth: "none",
                  maxHeight: "none",
                  cursor: "grab",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: frame.w,
                maxWidth: "92%",
              }}
            >
              <span style={{ fontSize: 13, opacity: 0.8 }}>🔍−</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 13, opacity: 0.8 }}>+</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button style={{ ...S.btn(true), fontSize: 15, padding: "9px 22px" }} onClick={confirmCrop}>
                この範囲で作成
              </button>
              <button style={{ ...S.btn(false), fontSize: 15, padding: "9px 22px" }} onClick={cancelCrop}>
                キャンセル
              </button>
            </div>
          </div>
        )}


        {/* 完成位置(下絵) */}
        {img && board && (
          <div
            style={{
              position: "absolute",
              left: board.x,
              top: board.y,
              width: board.w,
              height: board.h,
              border: "2px dashed rgba(242,234,217,0.45)",
              borderRadius: 4,
              backgroundImage: showGhost ? `url(${imgSrc})` : "none",
              backgroundSize: "cover",
              // 絵を枠線の下に描かない。描くと繰り返された絵の反対側の端が、
              // 点線のすき間からはみ出して見えてしまう
              backgroundRepeat: "no-repeat",
              backgroundClip: "padding-box",
              opacity: 1,
              boxShadow: "inset 0 0 30px rgba(0,0,0,0.35)",
            }}
          >
            {showGhost && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(44,70,58,0.82)" }} />
            )}
          </div>
        )}

        {/* ピース */}
        {img &&
          pieces.map((p) => (
            <img
              key={p.id}
              src={p.src}
              className="jk-piece"
              draggable={false}
              onPointerDown={(e) => onDown(e, p)}
              onPointerMove={(e) => onMove(e, p)}
              onPointerUp={(e) => onUp(e, p)}
              onPointerCancel={onCancel}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                width: p.w,
                height: p.h,
                maxWidth: "none",
                maxHeight: "none",
                zIndex: p.z,
                cursor: p.locked ? "default" : "grab",
                pointerEvents: p.locked ? "none" : "auto",
                filter: p.locked ? "none" : "drop-shadow(0 5px 8px rgba(0,0,0,0.45))",
                animation: p.locked ? "pop 0.18s ease-out" : "none",
                touchAction: "none",
                userSelect: "none",
              }}
            />
          ))}

        {/* 完成時: 盤面のきらめき + 紙吹雪 */}
        {done && board && (
          <div
            style={{
              position: "absolute",
              left: board.x - 6,
              top: board.y - 6,
              width: board.w + 12,
              height: board.h + 12,
              borderRadius: 6,
              pointerEvents: "none",
              zIndex: 9997,
              animation: "jkGlow 1.6s ease-out",
            }}
          />
        )}
        {done && <Confetti />}

        {/* 完成画面 */}
        {done && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 18,
              transform: "translateX(-50%)",
              background: "rgba(21,36,32,0.94)",
              border: "1.5px solid #f0a05a",
              borderRadius: 14,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: "92%",
              zIndex: 9999,
              animation: "jkRise 0.5s cubic-bezier(0.2,0.9,0.3,1.2) both",
            }}
          >
            <span style={{ fontSize: 22 }}>🎉</span>
            <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: 2 }}>完成!</span>
            <span style={{ fontSize: 13, opacity: 0.9 }}>
              {fmt(elapsed)} ・ {moves}手 ・ {grid}×{grid}
            </span>
            <button style={{ ...S.btn(true), fontSize: 14, padding: "7px 16px" }} onClick={() => setup(img, grid, shape)}>
              もう一度
            </button>
            <button
              style={{ ...S.btn(false), fontSize: 14, padding: "7px 16px" }}
              onClick={() => fileRef.current.click()}
            >
              別の画像で
            </button>
            <button
              style={{ ...S.btn(false), fontSize: 14, padding: "7px 12px" }}
              onClick={() => setDone(false)}
              title="閉じてパズルを眺める"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Androidの一部ブラウザは display:none の input を開けないため、
          画面外に追いやる方式で非表示にする */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          left: -9999,
          top: -9999,
        }}
        onChange={(e) => {
          // value をクリアする前に File を確保しておく
          const f = e.target.files && e.target.files[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
