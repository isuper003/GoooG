import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlaylistItem, FitMode } from '../../types/playerTypes';

export interface MasterOverlayState {
  playlist: PlaylistItem[]; // Holds at most 1 clip
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isLoop: boolean;
  isVisible: boolean;
  isKeyingEnabled: boolean;
  threshold: number; // 0.05 to 0.45 (default 0.16)
  feather: number;   // 0.01 to 0.10 (default 0.04)
  opacity: number;   // 0.1 to 1.0 (default 1.0)
  clickThrough: boolean; // default true (clicks pass through to video players below)
  fitMode?: FitMode;     // 'contain' (proportional letterbox) | 'cover' (fill mobile screen)
  zoom?: number;         // 0.25 to 3.0 (default 1.0, supports zoom-out and zoom-in)
  panX?: number;         // -1 to 1 NDC offset (default 0)
  panY?: number;         // -1 to 1 NDC offset (default 0)
}

interface MasterOverlayPlayerProps {
  state: MasterOverlayState;
  onUpdateState: (updates: Partial<MasterOverlayState>) => void;
}

function formatTime(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const formattedM = m < 10 ? `0${m}` : `${m}`;
  const formattedS = s < 10 ? `0${s}` : `${s}`;
  return `${formattedM}:${formattedS}`;
}

// WebGL Vertex Shader
const VS_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`;

// WebGL Fragment Shader for 100% True Luma-to-Alpha Transparency
const FS_SOURCE = `
precision mediump float;
uniform sampler2D u_image;
uniform float u_threshold;
uniform float u_feather;
uniform float u_opacity;
uniform int u_isKeying;
varying vec2 v_texCoord;

void main() {
    vec4 tex = texture2D(u_image, v_texCoord);
    
    if (u_isKeying == 0) {
        gl_FragColor = vec4(tex.rgb, tex.a * u_opacity);
        return;
    }
    
    // Perceived luminance using Rec. 709
    float luma = dot(tex.rgb, vec3(0.2126, 0.7152, 0.0722));
    
    // True Alpha Cut: anything below threshold is completely discarded (100% transparent)
    float alpha = smoothstep(u_threshold, u_threshold + u_feather, luma);
    
    if (alpha <= 0.005) {
        discard;
    }
    
    // Output pure solid white text without any dark compression dots or fringing:
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * u_opacity);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Compute WebGL scaling and boundary clamping for Contain vs Cover (Mobile full-bleed crop) and Zoom
export function computeCoverAndPan(
  canvasWidth: number,
  canvasHeight: number,
  videoWidth: number,
  videoHeight: number,
  fitMode: FitMode,
  zoom: number
) {
  const canvasAspect = canvasWidth / (canvasHeight || 1);
  const videoAspect = videoWidth / (videoHeight || 1);
  let scaleX = 1.0;
  let scaleY = 1.0;

  if (fitMode === 'cover') {
    // Fill screen completely (crop overflow, zero black letterbox bars on mobile)
    if (canvasAspect > videoAspect) {
      scaleX = 1.0;
      scaleY = canvasAspect / videoAspect;
    } else {
      scaleX = videoAspect / canvasAspect;
      scaleY = 1.0;
    }
  } else {
    // Proportional letterbox (entire video frame contained)
    if (canvasAspect > videoAspect) {
      scaleX = videoAspect / canvasAspect;
      scaleY = 1.0;
    } else {
      scaleX = 1.0;
      scaleY = canvasAspect / videoAspect;
    }
  }

  // Multiplier for zoom (supports zoom-in > 1.0 and zoom-out < 1.0)
  scaleX *= zoom;
  scaleY *= zoom;

  // Maximum pan allowable:
  // When overflowed (scale > 1.0), edges can be moved until canvas boundary: (scale - 1.0)
  // When zoomed out (zoom < 1.0), the shrunken quad can be moved within canvas: (1.0 - scale)
  const maxPanX = scaleX > 1.0 ? scaleX - 1.0 : (zoom < 1.0 ? Math.max(0, 1.0 - scaleX) : 0);
  const maxPanY = scaleY > 1.0 ? scaleY - 1.0 : (zoom < 1.0 ? Math.max(0, 1.0 - scaleY) : 0);

  return { scaleX, scaleY, maxPanX, maxPanY };
}

const MIN_OVERLAY_ZOOM = 0.25;
const MAX_OVERLAY_ZOOM = 3.0;

export default function MasterOverlayPlayer({
  state,
  onUpdateState,
}: MasterOverlayPlayerProps) {
  const fitMode: FitMode = state.fitMode ?? 'contain';
  const zoom = Math.max(MIN_OVERLAY_ZOOM, Math.min(MAX_OVERLAY_ZOOM, state.zoom ?? 1.0));
  const rawPanX = state.panX ?? 0;
  const rawPanY = state.panY ?? 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dragging & Panning state refs
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  // WebGL context & GL objects
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const posBufferRef = useRef<WebGLBuffer | null>(null);
  const texBufferRef = useRef<WebGLBuffer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Single clip only
  const currentItem = state.playlist[0] as PlaylistItem | undefined;
  const hasFile = Boolean(currentItem);

  // 1. Lazy URL Management (Zero Memory Leaks):
  useEffect(() => {
    let newUrl: string | null = null;
    if (currentItem?.file) {
      newUrl = URL.createObjectURL(currentItem.file);
    } else if (currentItem?.directUrl) {
      newUrl = currentItem.directUrl;
    }

    setActiveUrl(newUrl);
    setCurrentTime(0);

    return () => {
      if (newUrl && newUrl.startsWith('blob:')) {
        URL.revokeObjectURL(newUrl);
      }
    };
  }, [currentItem]);

  // 2. Initialize WebGL Context and compile shaders once canvas mounts
  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (glRef.current) {
      const oldGl = glRef.current;
      if (textureRef.current) oldGl.deleteTexture(textureRef.current);
      if (programRef.current) oldGl.deleteProgram(programRef.current);
      glRef.current = null;
    }

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      console.warn('[Overlay Player] WebGL not supported on this device');
      return;
    }

    glRef.current = gl;

    const vs = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;

    posBufferRef.current = gl.createBuffer();
    texBufferRef.current = gl.createBuffer();

    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, texBufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;
  }, []);

  useEffect(() => {
    initWebGL();
    return () => {
      const gl = glRef.current;
      if (gl) {
        if (textureRef.current) gl.deleteTexture(textureRef.current);
        if (programRef.current) gl.deleteProgram(programRef.current);
      }
    };
  }, [initWebGL]);

  // 3. WebGL Render Frame: Support Mobile Fill/Cover, Zoom & Clamped Pan
  const drawFrame = useCallback(() => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const program = programRef.current;
    const texture = textureRef.current;

    if (!gl || !canvas || !video || !program || !texture) return;
    if (video.readyState < 2) return;

    const displayWidth = canvas.clientWidth || window.innerWidth;
    const displayHeight = canvas.clientHeight || window.innerHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    const videoWidth = video.videoWidth || 1920;
    const videoHeight = video.videoHeight || 1080;

    const { scaleX, scaleY, maxPanX, maxPanY } = computeCoverAndPan(
      canvas.width,
      canvas.height,
      videoWidth,
      videoHeight,
      fitMode,
      zoom
    );

    // Clamp pan offsets within visible content bounds
    const panX = Math.max(-maxPanX, Math.min(maxPanX, rawPanX));
    const panY = Math.max(-maxPanY, Math.min(maxPanY, rawPanY));

    const positions = new Float32Array([
      -scaleX + panX, -scaleY + panY,
       scaleX + panX, -scaleY + panY,
      -scaleX + panX,  scaleY + panY,
       scaleX + panX,  scaleY + panY,
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    gl.useProgram(program);

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBufferRef.current);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const aTex = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(aTex);
    gl.bindBuffer(gl.ARRAY_BUFFER, texBufferRef.current);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);

    const uThreshold = gl.getUniformLocation(program, 'u_threshold');
    const uFeather = gl.getUniformLocation(program, 'u_feather');
    const uOpacity = gl.getUniformLocation(program, 'u_opacity');
    const uIsKeying = gl.getUniformLocation(program, 'u_isKeying');

    gl.uniform1f(uThreshold, state.threshold);
    gl.uniform1f(uFeather, state.feather);
    gl.uniform1f(uOpacity, state.opacity);
    gl.uniform1i(uIsKeying, state.isKeyingEnabled ? 1 : 0);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [
    state.threshold,
    state.feather,
    state.opacity,
    state.isKeyingEnabled,
    fitMode,
    zoom,
    rawPanX,
    rawPanY,
  ]);

  // Pointer dragging handlers for interactive canvas panning
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (state.clickThrough) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: rawPanX,
      startPanY: rawPanY,
    };
    resetHideTimer();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStartRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;

    const { maxPanX, maxPanY } = computeCoverAndPan(
      w,
      h,
      video.videoWidth || 1920,
      video.videoHeight || 1080,
      fitMode,
      zoom
    );

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.hypot(dx, dy) > 4) {
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current && (maxPanX > 0 || maxPanY > 0)) {
      const deltaPanX = (dx / w) * 2.0;
      const deltaPanY = -(dy / h) * 2.0;

      const targetX = dragStartRef.current.startPanX + deltaPanX;
      const targetY = dragStartRef.current.startPanY + deltaPanY;

      const clampedX = Math.max(-maxPanX, Math.min(maxPanX, targetX));
      const clampedY = Math.max(-maxPanY, Math.min(maxPanY, targetY));

      onUpdateState({ panX: clampedX, panY: clampedY });
      resetHideTimer();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStartRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      const wasDragging = isDraggingRef.current;
      dragStartRef.current = null;
      isDraggingRef.current = false;

      // Single click on interactive canvas toggles play/pause
      if (!wasDragging && !state.clickThrough) {
        onUpdateState({ isPlaying: !state.isPlaying });
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (state.clickThrough) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const nextZoom = Math.min(MAX_OVERLAY_ZOOM, Math.max(MIN_OVERLAY_ZOOM, zoom + delta));
    const roundedZoom = Math.round(nextZoom * 100) / 100;
    onUpdateState({
      zoom: roundedZoom,
      ...(Math.abs(roundedZoom - 1.0) < 0.01 ? { panX: 0, panY: 0 } : {}),
    });
    resetHideTimer();
  };

  // Continuous animation frame loop
  useEffect(() => {
    let isRunning = true;

    function renderLoop() {
      if (!isRunning) return;
      if (state.isVisible && activeUrl) {
        drawFrame();
      }
      animFrameRef.current = requestAnimationFrame(renderLoop);
    }

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state.isVisible, activeUrl, drawFrame]);

  // 4. Sync play/pause with external state & visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeUrl) return;

    if (state.isVisible && state.isPlaying) {
      video.play().catch((err) => {
        console.warn('[Overlay Player] Autoplay prevented:', err);
        onUpdateState({ isPlaying: false });
      });
    } else {
      video.pause();
    }
  }, [state.isVisible, state.isPlaying, activeUrl, onUpdateState]);

  // Sync volume, mute & loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = state.volume;
    video.muted = state.isMuted;
    video.loop = state.isLoop;
  }, [state.volume, state.isMuted, state.isLoop]);

  // 5. Controls Auto-Hide Timer
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (state.isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [state.isPlaying]);

  useEffect(() => {
    if (!state.isPlaying) {
      setControlsVisible(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    } else {
      resetHideTimer();
    }
  }, [state.isPlaying, resetHideTimer]);

  // 6. Global Window Mousemove & Touchstart to ensure controls reappear seamlessly on mobile & desktop
  useEffect(() => {
    if (!state.isVisible || !hasFile) return;

    const handleInteraction = () => {
      resetHideTimer();
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('pointerdown', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
    };
  }, [state.isVisible, hasFile, resetHideTimer]);

  // Video event handlers
  const handleEnded = () => {
    if (state.isLoop) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        void videoRef.current.play();
      }
    } else {
      onUpdateState({ isPlaying: false });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      drawFrame();
      if (state.isVisible && state.isPlaying) {
        void videoRef.current.play().catch(() => onUpdateState({ isPlaying: false }));
      }
    }
  };

  // Drag and drop: single clip replacement
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const f = e.dataTransfer.files[0];
      const newItem: PlaylistItem = {
        id: `overlay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: f.name,
        size: f.size,
        file: f,
      };
      onUpdateState({
        playlist: [newItem],
        isVisible: true,
        isPlaying: true,
      });
    }
  };

  // Seek handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      drawFrame();
    }
  };

  // Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <>
      {/* 1. Worker Video Tag (Always kept mounted for smooth WebGL hardware texture sampling) */}
      <video
        ref={videoRef}
        src={activeUrl || undefined}
        preload="metadata"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="absolute w-px h-px opacity-0 pointer-events-none"
      />

      {/* 2. Fullscreen Overlay Layer (Shows only when isVisible and a file is loaded) */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`fixed inset-0 z-40 select-none transition-opacity duration-300 pointer-events-none ${
          state.isVisible && hasFile ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          display: state.isVisible && hasFile ? 'block' : 'none',
        }}
      >
        {/* WebGL 100% True Transparent Canvas Layer */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={handleToggleFullscreen}
          className={`w-full h-full block ${
            state.clickThrough
              ? 'pointer-events-none'
              : (Math.abs(zoom - 1.0) > 0.02 || fitMode === 'cover')
              ? 'pointer-events-auto cursor-grab active:cursor-grabbing touch-none'
              : 'pointer-events-auto cursor-pointer'
          }`}
        />

        {/* 3. Top Floating Header Bar */}
        <div
          className={`absolute top-0 inset-x-0 p-3 pt-18 sm:pt-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between gap-3 transition-opacity duration-200 pointer-events-auto ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Left: Player Label & Current Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/40 font-mono text-[10px] font-bold shrink-0">
              OVERLAY
            </span>
            <span
              className="text-xs font-medium text-white/90 truncate max-w-[140px] sm:max-w-[320px]"
              title={currentItem?.name}
            >
              {currentItem?.name || 'Subtitle Video'}
            </span>
          </div>

          {/* Right: Crop/Fit, Pass-Through, Transparency & Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Fit / Mobile Crop Toggle */}
            <button
              type="button"
              onClick={() =>
                onUpdateState({
                  fitMode: fitMode === 'cover' ? 'contain' : 'cover',
                  panX: 0,
                  panY: 0,
                })
              }
              className={`px-2 py-1 rounded-lg font-mono text-[10px] transition-colors border flex items-center gap-1 ${
                fitMode === 'cover'
                  ? 'bg-purple-500/30 text-purple-200 border-purple-400/50'
                  : 'bg-white/10 text-white/60 border-white/15 hover:text-white'
              }`}
              title={
                fitMode === 'cover'
                  ? 'Crop: Cover (Fills mobile screen without black bars)'
                  : 'Fit: Contain (Proportional letterbox - shows full frame)'
              }
            >
              <span>{fitMode === 'cover' ? '📱' : '📐'}</span>
              <span className="hidden sm:inline">
                {fitMode === 'cover' ? 'Crop (Fill)' : 'Fit (Contain)'}
              </span>
              <span className="sm:hidden">
                {fitMode === 'cover' ? 'Cover' : 'Fit'}
              </span>
            </button>

            {/* Click-Through Toggle */}
            <button
              type="button"
              onClick={() => onUpdateState({ clickThrough: !state.clickThrough })}
              className={`px-2 py-1 rounded-lg font-mono text-[10px] transition-colors border flex items-center gap-1 ${
                state.clickThrough
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
              title={
                state.clickThrough
                  ? 'Pass-Through ON: Clicks pass to players below'
                  : 'Interactive: Drag on screen to pan, click to pause'
              }
            >
              <span>{state.clickThrough ? '🎯' : '👆'}</span>
              <span className="hidden sm:inline">
                {state.clickThrough ? 'Pass-Through' : 'Interactive'}
              </span>
            </button>

            {/* Transparency Toggle */}
            <button
              type="button"
              onClick={() => onUpdateState({ isKeyingEnabled: !state.isKeyingEnabled })}
              className={`px-2 py-1 rounded-lg font-mono text-[10px] transition-colors border flex items-center gap-1 ${
                state.isKeyingEnabled
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-white/10 text-white/50 border-white/15'
              }`}
              title="Toggle Transparency (Black to Alpha)"
            >
              <span>✨</span>
              <span className="hidden sm:inline">
                {state.isKeyingEnabled ? 'Transparent' : 'Normal'}
              </span>
            </button>

            {/* Hide / Close Overlay Button */}
            <button
              type="button"
              onClick={() => onUpdateState({ isVisible: false })}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-xs transition-colors"
              title="Hide Overlay (Key T)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 4. Bottom Controls Bar (Single Clip: Seek, Play/Pause, Loop, Settings, Volume, Fullscreen) */}
        <div
          className={`absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-200 pointer-events-auto ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Seekbar */}
          <div className="flex items-center gap-2 w-full">
            <span className="font-mono text-[10px] text-white/70 shrink-0 w-9 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
            <span className="font-mono text-[10px] text-white/50 shrink-0 w-9">
              {formatTime(duration)}
            </span>
          </div>

          {/* Zoom Scroll Bar & Mobile Crop Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-2.5 py-1.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10">
            {/* Left: Mobile Crop / Fit Mode Toggle */}
            <button
              type="button"
              onClick={() =>
                onUpdateState({
                  fitMode: fitMode === 'cover' ? 'contain' : 'cover',
                  panX: 0,
                  panY: 0,
                })
              }
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all shrink-0 border shadow-sm ${
                fitMode === 'cover'
                  ? 'bg-purple-600/40 text-purple-200 border-purple-400/60 shadow-purple-500/20'
                  : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'
              }`}
              title={
                fitMode === 'cover'
                  ? 'Mode: Crop / Cover (Fills mobile screen without black bars)'
                  : 'Mode: Proportional Fit (Letterbox / Contain full frame)'
              }
            >
              <span>{fitMode === 'cover' ? '📱' : '📐'}</span>
              <span>{fitMode === 'cover' ? 'Crop: Cover' : 'Fit: Contain'}</span>
            </button>

            {/* Center: Zoom Scroll Bar with - / + buttons and live multiplier */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[140px] max-w-full sm:max-w-[420px]">
              {/* Zoom Out Step Button */}
              <button
                type="button"
                onClick={() => {
                  const newZoom = Math.max(MIN_OVERLAY_ZOOM, Math.round((zoom - 0.1) * 10) / 10);
                  onUpdateState({
                    zoom: newZoom,
                    ...(Math.abs(newZoom - 1.0) < 0.01 ? { panX: 0, panY: 0 } : {}),
                  });
                }}
                disabled={zoom <= MIN_OVERLAY_ZOOM}
                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white flex items-center justify-center text-xs font-bold transition-all shrink-0"
                title="Zoom Out (-10%)"
              >
                −
              </button>

              {/* The Zoom Scroll Bar Slider */}
              <input
                type="range"
                min={MIN_OVERLAY_ZOOM}
                max={MAX_OVERLAY_ZOOM}
                step={0.05}
                value={zoom}
                onPointerDown={() => {
                  if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                }}
                onPointerUp={resetHideTimer}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateState({
                    zoom: val,
                    ...(Math.abs(val - 1.0) < 0.01 ? { panX: 0, panY: 0 } : {}),
                  });
                  resetHideTimer();
                }}
                className="flex-1 h-1.5 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-purple-400"
                title="Zoom overlay video (0.25x to 3.0x)"
              />

              {/* Zoom In Step Button */}
              <button
                type="button"
                onClick={() => {
                  const newZoom = Math.min(MAX_OVERLAY_ZOOM, Math.round((zoom + 0.1) * 10) / 10);
                  onUpdateState({
                    zoom: newZoom,
                    ...(Math.abs(newZoom - 1.0) < 0.01 ? { panX: 0, panY: 0 } : {}),
                  });
                }}
                disabled={zoom >= MAX_OVERLAY_ZOOM}
                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white flex items-center justify-center text-xs font-bold transition-all shrink-0"
                title="Zoom In (+10%)"
              >
                +
              </button>

              {/* Numeric indicator */}
              <span className="font-mono text-[11px] text-purple-300 font-bold shrink-0 w-11 text-center">
                {zoom < 1.0 ? zoom.toFixed(2) : zoom.toFixed(1)}x
              </span>

              {/* Reset to 1.0x (shown when zoomed in or zoomed out) */}
              {Math.abs(zoom - 1.0) > 0.02 && (
                <button
                  type="button"
                  onClick={() => onUpdateState({ zoom: 1.0, panX: 0, panY: 0 })}
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 border border-purple-400/40 transition-colors shrink-0"
                  title="Reset Zoom to 1.0x and center"
                >
                  1x
                </button>
              )}
            </div>

            {/* Right: Directional Pan Nudge Buttons (When zoomed in, zoomed out, or in cover mode) */}
            {(Math.abs(zoom - 1.0) > 0.02 || fitMode === 'cover') && (
              <div className="flex items-center gap-1 shrink-0 bg-white/5 px-1.5 py-0.5 rounded-lg border border-white/10">
                <span className="text-[9px] font-mono text-white/50 hidden xs:inline">PAN:</span>
                <button
                  type="button"
                  onClick={() => onUpdateState({ panX: rawPanX + 0.08 })}
                  className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[9px] flex items-center justify-center transition-colors"
                  title="Pan Left"
                >
                  ◀
                </button>
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => onUpdateState({ panY: rawPanY - 0.08 })}
                    className="w-5 h-2.5 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[7px] flex items-center justify-center transition-colors"
                    title="Pan Up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateState({ panY: rawPanY + 0.08 })}
                    className="w-5 h-2.5 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[7px] flex items-center justify-center transition-colors"
                    title="Pan Down"
                  >
                    ▼
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateState({ panX: rawPanX - 0.08 })}
                  className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[9px] flex items-center justify-center transition-colors"
                  title="Pan Right"
                >
                  ▶
                </button>
                {(rawPanX !== 0 || rawPanY !== 0) && (
                  <button
                    type="button"
                    onClick={() => onUpdateState({ panX: 0, panY: 0 })}
                    className="px-1 h-5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[9px] font-mono flex items-center justify-center transition-colors"
                    title="Reset Pan"
                  >
                    ⌖
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Play/Pause & Loop Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateState({ isPlaying: !state.isPlaying })}
                className="w-9 h-9 rounded-xl bg-purple-500 hover:bg-purple-400 text-white flex items-center justify-center text-base font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all"
                title={state.isPlaying ? 'Pause' : 'Play'}
              >
                {state.isPlaying ? '⏸' : '▶'}
              </button>

              {/* Loop Toggle */}
              <button
                type="button"
                onClick={() => onUpdateState({ isLoop: !state.isLoop })}
                className={`px-2.5 h-8 rounded-lg flex items-center gap-1 text-[11px] font-mono transition-colors border ${
                  state.isLoop
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                }`}
                title={state.isLoop ? 'Loop is ON' : 'Loop is OFF'}
              >
                <span>🔁</span>
                <span className="text-[10px] font-bold">{state.isLoop ? 'LOOP' : 'OFF'}</span>
              </button>
            </div>

            {/* Transparency Tuning, Volume & Fullscreen */}
            <div className="flex items-center gap-2">
              {/* Transparency Settings Toggle */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`px-2 h-8 rounded-lg flex items-center gap-1 text-[11px] font-mono transition-colors border ${
                  isSettingsOpen
                    ? 'bg-purple-500/30 text-purple-200 border-purple-400'
                    : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                }`}
                title="Adjust Transparency Sensitivity"
              >
                <span>⚙️</span>
                <span className="hidden sm:inline">Settings</span>
              </button>

              {/* Volume Slider & Mute */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateState({ isMuted: !state.isMuted })}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center text-sm transition-colors"
                  title={state.isMuted ? 'Unmute' : 'Mute'}
                >
                  {state.isMuted || state.volume === 0
                    ? '🔇'
                    : state.volume < 0.5
                    ? '🔉'
                    : '🔊'}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={state.isMuted ? 0 : state.volume}
                  onChange={(e) => {
                    const newVol = parseFloat(e.target.value);
                    onUpdateState({ volume: newVol, isMuted: newVol === 0 });
                  }}
                  className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-400 hidden sm:inline-block"
                  title="Volume"
                />
              </div>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center text-xs transition-colors"
                title="Fullscreen (F)"
              >
                ⛶
              </button>
            </div>
          </div>

          {/* Subtitle Sensitivity Settings Sub-panel */}
          {isSettingsOpen && (
            <div className="mt-1 pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs px-2 bg-black/75 rounded-xl p-2.5">
              {/* Screen Fit (Mobile Crop) */}
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-white/70 text-[11px] shrink-0">Screen:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateState({ fitMode: 'contain', panX: 0, panY: 0 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      fitMode === 'contain'
                        ? 'bg-purple-500 text-white font-bold'
                        : 'bg-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateState({ fitMode: 'cover', panX: 0, panY: 0 })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      fitMode === 'cover'
                        ? 'bg-purple-500 text-white font-bold'
                        : 'bg-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    Cover
                  </button>
                </div>
              </div>

              {/* Threshold (Black Crush) */}
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-white/70 text-[11px] shrink-0">Threshold:</span>
                <input
                  type="range"
                  min={0.05}
                  max={0.45}
                  step={0.01}
                  value={state.threshold}
                  onChange={(e) =>
                    onUpdateState({ threshold: parseFloat(e.target.value) })
                  }
                  className="flex-1 sm:w-28 h-1.5 bg-white/20 rounded appearance-none cursor-pointer accent-purple-400"
                  title="Cut dark background noise"
                />
                <span className="font-mono text-[10px] text-purple-300 w-8 text-right">
                  {Math.round(state.threshold * 100)}%
                </span>
              </div>

              {/* Feather (Edge Smoothness) */}
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-white/70 text-[11px] shrink-0">Smooth:</span>
                <input
                  type="range"
                  min={0.01}
                  max={0.12}
                  step={0.005}
                  value={state.feather}
                  onChange={(e) =>
                    onUpdateState({ feather: parseFloat(e.target.value) })
                  }
                  className="flex-1 sm:w-28 h-1.5 bg-white/20 rounded appearance-none cursor-pointer accent-cyan-400"
                  title="Letter antialiasing smoothness"
                />
                <span className="font-mono text-[10px] text-cyan-300 w-8 text-right">
                  {Math.round(state.feather * 100)}%
                </span>
              </div>

              {/* Opacity */}
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-white/70 text-[11px] shrink-0">Opacity:</span>
                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={state.opacity}
                  onChange={(e) =>
                    onUpdateState({ opacity: parseFloat(e.target.value) })
                  }
                  className="flex-1 sm:w-24 h-1.5 bg-white/20 rounded appearance-none cursor-pointer accent-purple-400"
                  title="Overall subtitle transparency"
                />
                <span className="font-mono text-[10px] text-purple-300 w-8 text-right">
                  {Math.round(state.opacity * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
