import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import { Terrain } from './Terrain';
// import { CityPopulation } from './CityPopulation';
import { Roads } from './Roads';
import { Regions, generateRegions } from './Regions';
// import { Missile } from './Missile';
import { Planes } from './Planes';
import type { MapConfig } from '../types/MapConfig';
import { MAP_PRESETS, DEFAULT_MAP } from '../types/MapConfig';

// Shared terrain dimensions - all components use this
const TERRAIN_SIZE = 100;

interface SceneProps {
  config: MapConfig;
}

function Scene({ config }: SceneProps) {
  // Generate regions based on config
  const regions = useMemo(() => {
    return generateRegions(config.regionCount, config.seed, TERRAIN_SIZE);
  }, [config.regionCount, config.seed]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 80, 30]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={200}
      />
      <directionalLight
        position={[-30, 40, -20]}
        intensity={0.3}
      />

      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={[50, 30, 30]}
        inclination={0.5}
        azimuth={0.25}
      />

      {/* Game Elements */}
      <Terrain config={config} size={TERRAIN_SIZE} />
      <Regions config={config} size={TERRAIN_SIZE} />
      <Roads config={config} terrainSize={TERRAIN_SIZE} />
      {/* <CityPopulation config={config} /> */}

      {/* Flying planes and jets */}
      <Planes regions={regions} seed={config.seed} />

      {/* Missile Animation - fires after map loads */}
      {/* <Missile
        start={[-40, 2, -35]}
        end={[35, 2, 40]}
        duration={8}
        delay={0.5}
        arcHeight={25}
        scale={0.05}
      /> */}

      {/* Camera Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.45}
        minDistance={20}
        maxDistance={150}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function Game() {
  const [selectedMap, setSelectedMap] = useState<MapConfig>(DEFAULT_MAP);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
      <Canvas
        key={selectedMap.id}
        shadows
        camera={{
          position: [60, 50, 60],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
      >
        <Scene config={selectedMap} />
      </Canvas>

      {/* Map Selector - Top Right */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0,0,0,0.7)',
          padding: '12px 16px',
          borderRadius: 8,
          fontFamily: 'sans-serif',
          color: 'white',
        }}
      >
        <label
          htmlFor="map-select"
          style={{
            display: 'block',
            fontSize: 12,
            marginBottom: 6,
            opacity: 0.8,
          }}
        >
          Map Type
        </label>
        <select
          id="map-select"
          value={selectedMap.id}
          onChange={(e) => {
            const map = MAP_PRESETS.find((m) => m.id === e.target.value);
            if (map) setSelectedMap(map);
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 4,
            color: 'white',
            padding: '6px 10px',
            fontSize: 14,
            cursor: 'pointer',
            minWidth: 160,
          }}
        >
          {MAP_PRESETS.map((map) => (
            <option key={map.id} value={map.id} style={{ color: 'black' }}>
              {map.name} ({map.regionCount} regions)
            </option>
          ))}
        </select>
      </div>

      {/* Simple UI Overlay - Top Left */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: 'white',
          fontFamily: 'sans-serif',
          background: 'rgba(0,0,0,0.6)',
          padding: '12px 16px',
          borderRadius: 8,
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 8 }}>Strategy Game</h3>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.8, marginBottom: 12 }}>
          Drag to rotate • Scroll to zoom • Right-click to pan
        </p>
        <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, background: '#22c55e', borderRadius: 2 }} />
            <span>Friendly Territory</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, background: '#eab308', borderRadius: 2 }} />
            <span>Contested Zone</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 2 }} />
            <span>Hostile Territory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
