import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Center, Grid, ContactShadows, Sparkles, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { Device, SimulationStep } from '../types';
import { Custom3DModel } from './Custom3DModel';

interface DigitalTwinProps {
  device: Device;
  latestData: SimulationStep | null;
  dict: any;
  theme?: 'dark' | 'light';
}

// --- Materials & Shared Styles ---
const materials = {
  metalDark: new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7, metalness: 0.6 }),
  metalLight: new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.3, metalness: 0.8 }),
  hazard: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.8 }),
  glowBlue: new THREE.MeshStandardMaterial({ color: '#a855f7', emissive: '#a855f7', emissiveIntensity: 2, toneMapped: false }),
  screen: new THREE.MeshStandardMaterial({ color: '#000000', roughness: 0.2 }),
  copper: new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.3, metalness: 0.8 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#171717', roughness: 0.9 }),
};

// --- Constants for Generator Visualization ---
const GEN_TEMP_MIN = 40;
const GEN_TEMP_MAX = 140;
const GEN_COLOR_COLD = new THREE.Color('#94a3b8'); // Cool Blue/Grey
const GEN_COLOR_HOT = new THREE.Color('#ef4444');  // Hot Red

// --- Generator Model ---
const GeneratorModel: React.FC<{ data: Record<string, number> | undefined }> = ({ data }) => {
  const fanRef = useRef<THREE.Group>(null);
  const engineGroupRef = useRef<THREE.Group>(null);
  
  const rpm = data?.rpm || 0;
  const temp = data?.temp || 20;
  const vibration = data?.vibration || 0;

  // Temperature visualization color
  // Maps 40°C -> Cold Color, 140°C -> Hot Color
  const tempColor = useMemo(() => {
    const t = THREE.MathUtils.clamp((temp - GEN_TEMP_MIN) / (GEN_TEMP_MAX - GEN_TEMP_MIN), 0, 1);
    return new THREE.Color().lerpColors(GEN_COLOR_COLD, GEN_COLOR_HOT, t);
  }, [temp]);

  useFrame((state) => {
    if (fanRef.current) {
      // Rotate fan based on RPM
      fanRef.current.rotation.z -= (rpm * 0.002) + 0.02; 
    }
    if (engineGroupRef.current) {
      // Vibrate engine block based on vibration metric
      const shake = Math.min(vibration, 10) * 0.002;
      engineGroupRef.current.position.x = (Math.random() - 0.5) * shake;
      engineGroupRef.current.position.y = (Math.random() - 0.5) * shake;
    }
  });

  return (
    <group>
      {/* Heavy Base Skid */}
      <mesh position={[0, -1.1, 0]} receiveShadow>
        <boxGeometry args={[4.2, 0.2, 2.2]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Hazard Stripes on sides */}
      <mesh position={[0, -1.1, 1.101]}>
         <planeGeometry args={[4.2, 0.15]} />
         <meshStandardMaterial color="#eab308" />
      </mesh>
      <mesh position={[0, -1.1, -1.101]} rotation={[0, Math.PI, 0]}>
         <planeGeometry args={[4.2, 0.15]} />
         <meshStandardMaterial color="#eab308" />
      </mesh>

      <group ref={engineGroupRef}>
        {/* Main Engine Block - Colors change with Temp */}
        <mesh position={[-0.5, 0, 0]} castShadow>
          <boxGeometry args={[1.8, 1.5, 1.2]} />
          <meshStandardMaterial color={tempColor} metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Top Vents */}
        <mesh position={[-0.5, 0.76, 0]}>
           <boxGeometry args={[1.4, 0.1, 0.8]} />
           <meshStandardMaterial color="#1e293b" />
        </mesh>

        {/* Alternator (Cylindrical part) */}
        <mesh position={[1.2, -0.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 1.6, 32]} />
          <primitive object={materials.metalLight} />
        </mesh>
        
        {/* Connection bands */}
        <mesh position={[0.5, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
           <cylinderGeometry args={[0.6, 0.6, 0.2, 32]} />
           <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Radiator Housing (Front) */}
        <group position={[-1.6, 0, 0]}>
           <mesh castShadow>
              <boxGeometry args={[0.5, 1.6, 1.4]} />
              <meshStandardMaterial color="#475569" />
           </mesh>
           {/* Fan Grill */}
           <mesh position={[-0.26, 0, 0]} rotation={[0, -Math.PI/2, 0]}>
              <circleGeometry args={[0.6, 32]} />
              <meshStandardMaterial color="#1e293b" transparent opacity={0.9} wireframe />
           </mesh>
           {/* Spinning Fan */}
           <group ref={fanRef} position={[-0.1, 0, 0]} rotation={[0, -Math.PI/2, 0]}>
              <mesh>
                 <boxGeometry args={[1.1, 0.15, 0.05]} />
                 <meshStandardMaterial color="#0f172a" />
              </mesh>
              <mesh rotation={[0, 0, Math.PI/2]}>
                 <boxGeometry args={[1.1, 0.15, 0.05]} />
                 <meshStandardMaterial color="#0f172a" />
              </mesh>
           </group>
        </group>
        
        {/* Exhaust Pipe with Smoke */}
        <group position={[-0.8, 0.8, 0.4]} rotation={[0, 0, -0.2]}>
           <mesh>
              <cylinderGeometry args={[0.1, 0.1, 0.8]} />
              <meshStandardMaterial color="#713f12" roughness={0.9} />
           </mesh>
           {/* Simple Smoke Particles Effect (Visual only) */}
           {rpm > 500 && (
               <mesh position={[0, 0.5, 0]}>
                  <sphereGeometry args={[0.15, 8, 8]} />
                  <meshStandardMaterial color="#555555" transparent opacity={0.4} />
               </mesh>
           )}
        </group>
      </group>

      {/* Control Panel (Isolated from vibration) */}
      <group position={[1.6, -0.3, 0.8]} rotation={[0, 0.5, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.6, 0.2]} />
          <primitive object={materials.metalDark} />
        </mesh>
        {/* Status Light */}
        <mesh position={[0, 0.1, 0.11]}>
           <planeGeometry args={[0.3, 0.2]} />
           <meshStandardMaterial 
              color={rpm > 100 ? "#22c55e" : "#ef4444"} 
              emissive={rpm > 100 ? "#22c55e" : "#ef4444"} 
              emissiveIntensity={0.5} 
           />
        </mesh>
      </group>
    </group>
  );
};

// --- Cutter Model ---
const CutterModel: React.FC<{ data: Record<string, number> | undefined }> = ({ data }) => {
  const gantryRef = useRef<THREE.Group>(null);
  const redLightRef = useRef<THREE.PointLight>(null);
  const plasmaRef = useRef<THREE.Group>(null);
  const plasmaLightRef = useRef<THREE.PointLight>(null);
  
  const current = data?.current || 0;
  const gasPressure = data?.gasPressure || 0;
  const xPos = data?.x_pos || 0; // 0 to 1000mm
  
  // Convert mm to world units. Map 0-1000 to -2 to 2 (width 4)
  const worldX = ((xPos / 1000) * 4) - 2;
  const isActive = current > 1; // Lowered threshold from 5 to 1 for visibility

  useFrame((state) => {
    if (gantryRef.current) {
        // Smoothly move gantry along the table (X-axis in this local space)
        gantryRef.current.position.x = THREE.MathUtils.lerp(gantryRef.current.position.x, worldX, 0.1);
    }
    // Pulsing Red Light Effect
    if (isActive && redLightRef.current) {
        // Pulse intensity between 0.5 and 1.5
        redLightRef.current.intensity = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.5;
    }
    // Plasma Flicker Effect
    if (isActive && plasmaRef.current && plasmaLightRef.current) {
        // Random flicker for unstable plasma
        const flicker = 0.85 + Math.random() * 0.3;
        plasmaRef.current.scale.set(flicker, 1, flicker); 
        // Jitter vertical position slightly
        plasmaRef.current.position.y = -0.6 + (Math.random() * 0.01);
        // Flicker light intensity
        plasmaLightRef.current.intensity = 1.5 + Math.random();
    }
  });

  return (
    <group>
      {/* CNC Bed */}
      <mesh position={[0, -1, 0]} receiveShadow>
        <boxGeometry args={[5, 0.5, 3]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* Grid Pattern on Bed */}
      <gridHelper position={[0, -0.74, 0]} args={[5, 20, 0x334155, 0x334155]} rotation={[0, 0, 0]} scale={[1, 0.6, 1]} />

      {/* Side Rails */}
      <mesh position={[0, -0.6, 1.4]} rotation={[0, 0, Math.PI/2]}>
         <cylinderGeometry args={[0.05, 0.05, 5]} />
         <primitive object={materials.metalLight} />
      </mesh>
      <mesh position={[0, -0.6, -1.4]} rotation={[0, 0, Math.PI/2]}>
         <cylinderGeometry args={[0.05, 0.05, 5]} />
         <primitive object={materials.metalLight} />
      </mesh>

      {/* Moving Gantry */}
      <group ref={gantryRef} position={[-2, 0, 0]}>
         
         {/* Gantry Legs & Motors */}
         {[1.4, -1.4].map((z, i) => (
            <group key={i} position={[0, 0, z]}>
               {/* Leg Upright */}
               <mesh position={[0, 0.6, 0]}>
                  <boxGeometry args={[0.3, 1.4, 0.2]} />
                  <meshStandardMaterial color="#eab308" />
               </mesh>
               {/* Wheel Block Housing */}
               <mesh position={[0, -0.2, 0]}>
                   <boxGeometry args={[0.5, 0.25, 0.3]} />
                   <primitive object={materials.metalDark} />
               </mesh>
               {/* Stepper Motor */}
               <mesh position={[0, -0.2, i === 0 ? 0.2 : -0.2]} rotation={[Math.PI/2, 0, 0]}>
                   <cylinderGeometry args={[0.12, 0.12, 0.2, 16]} />
                   <primitive object={materials.metalDark} />
               </mesh>
            </group>
         ))}

         {/* Crossbeam Group */}
         <group position={[0, 1.2, 0]}>
             {/* Main Beam */}
             <mesh>
                <boxGeometry args={[0.4, 0.3, 3]} />
                <primitive object={materials.metalDark} />
             </mesh>
             {/* Guide Rail Detail */}
             <mesh position={[-0.21, 0, 0]}>
                 <boxGeometry args={[0.02, 0.15, 2.8]} />
                 <primitive object={materials.metalLight} />
             </mesh>
         </group>

         {/* Cutting Head Assembly */}
         <group position={[-0.3, 1.1, 0]}>
             {/* Carriage Plate */}
             <mesh position={[0.1, 0.1, 0]}>
                <boxGeometry args={[0.1, 0.5, 0.4]} />
                <primitive object={materials.metalLight} />
             </mesh>

             {/* Z-Axis Actuator (Cylinder on top) */}
             <mesh position={[-0.1, 0.4, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.5]} />
                <primitive object={materials.metalDark} />
             </mesh>
             <mesh position={[-0.1, 0.7, 0]}>
                 <cylinderGeometry args={[0.04, 0.04, 0.2]} />
                 <primitive object={materials.metalLight} />
             </mesh>

             {/* Main Head Housing */}
             <group position={[-0.1, -0.1, 0]}>
                 <mesh>
                    <boxGeometry args={[0.25, 0.4, 0.3]} />
                    <meshStandardMaterial color="#475569" />
                 </mesh>

                 {/* Status Light Strip */}
                 <mesh position={[-0.13, 0, 0]}>
                    <boxGeometry args={[0.02, 0.2, 0.15]} />
                    <meshStandardMaterial 
                       color={isActive ? "#ef4444" : "#1e293b"} 
                       emissive={isActive ? "#ef4444" : "#000000"}
                    />
                 </mesh>
                 {isActive && (
                    <pointLight 
                       ref={redLightRef}
                       position={[-0.2, 0, 0]} 
                       color="#ef4444" 
                       distance={1.2} 
                       decay={2} 
                    />
                 )}
                 
                 {/* Gas Pressure Gauge */}
                 <group position={[0.13, 0.1, 0]} rotation={[0, 0, -Math.PI / 2]}>
                    {/* Gauge Body */}
                    <mesh receiveShadow>
                        <cylinderGeometry args={[0.06, 0.06, 0.04, 32]} />
                        <meshStandardMaterial color="#334155" />
                    </mesh>
                    {/* Gauge Face */}
                    <mesh position={[0, 0.021, 0]} rotation={[0, 0, 0]}>
                        <cylinderGeometry args={[0.05, 0.05, 0.001, 32]} />
                        <meshStandardMaterial color="#f1f5f9" />
                    </mesh>
                    {/* Needle Pivot Group */}
                    {/* Map 0-120 psi to angle range. Approx -135deg to +135deg */}
                    <group 
                        position={[0, 0.025, 0]} 
                        rotation={[0, THREE.MathUtils.lerp(Math.PI * 0.75, -Math.PI * 0.75, gasPressure / 120), 0]}
                    >
                       <mesh position={[0, 0, 0.02]}>
                          <boxGeometry args={[0.008, 0.002, 0.04]} />
                          <meshStandardMaterial color="#dc2626" />
                       </mesh>
                    </group>
                    {/* Glass Cover */}
                    <mesh position={[0, 0.03, 0]}>
                        <cylinderGeometry args={[0.06, 0.06, 0.01, 32]} />
                        <meshPhysicalMaterial 
                            color="#ffffff" 
                            transmission={0.9} 
                            opacity={0.3} 
                            transparent 
                            roughness={0} 
                        />
                    </mesh>
                 </group>
             </group>

             {/* Nozzle Assembly */}
             <group position={[-0.1, -0.4, 0]}>
                {/* Heat Shield (Ceramic) */}
                <mesh position={[0, 0.05, 0]}>
                   <cylinderGeometry args={[0.08, 0.05, 0.15]} />
                   <primitive object={materials.rubber} />
                </mesh>
                {/* Tip (Copper) */}
                <mesh position={[0, -0.05, 0]}>
                   <cylinderGeometry args={[0.04, 0.01, 0.08]} />
                   <primitive object={materials.copper} />
                </mesh>
             </group>
             
             {/* Plasma Arc Effect */}
             {isActive && (
                <group ref={plasmaRef} position={[-0.1, -0.6, 0]}>
                    <mesh rotation={[Math.PI, 0, 0]}>
                       <coneGeometry args={[0.04, 0.6, 8]} />
                       <primitive object={materials.glowBlue} />
                    </mesh>
                    <pointLight ref={plasmaLightRef} color="#a855f7" intensity={2} distance={3} decay={2} />
                    <Sparkles 
                       count={40} 
                       scale={1.2} 
                       size={3} 
                       speed={2} 
                       opacity={0.8} 
                       color="#e9d5ff"
                       position={[0, -0.4, 0]}
                       noise={0.2}
                    />
                </group>
             )}
         </group>
      </group>
    </group>
  );
};

// --- Generic Rack Model ---
const GenericDevice: React.FC = () => {
    // Simple blinking lights logic
    const [blink, setBlink] = useState(false);
    useEffect(() => {
        const i = setInterval(() => setBlink(b => !b), 500);
        return () => clearInterval(i);
    }, []);

    return (
        <group>
            {/* Cabinet Body */}
            <mesh position={[0, 0, 0]} castShadow>
                <boxGeometry args={[1.5, 3, 1.5]} />
                <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Glass Door */}
            <mesh position={[0, 0, 0.76]}>
                <planeGeometry args={[1.3, 2.8]} />
                <meshPhysicalMaterial 
                    color="#94a3b8" 
                    roughness={0} 
                    transmission={0.5} 
                    thickness={0.1}
                    transparent 
                    opacity={0.3} 
                />
            </mesh>
            {/* Server Units */}
            {[0.8, 0.4, 0, -0.4, -0.8].map((y, i) => (
                <group key={i} position={[0, y, 0.7]}>
                   <mesh>
                      <boxGeometry args={[1.2, 0.2, 0.1]} />
                      <meshStandardMaterial color="#334155" />
                   </mesh>
                   {/* Lights */}
                   <mesh position={[-0.5, 0, 0.06]}>
                      <circleGeometry args={[0.03]} />
                      <meshBasicMaterial color="#22c55e" />
                   </mesh>
                   <mesh position={[-0.4, 0, 0.06]}>
                      <circleGeometry args={[0.03]} />
                      <meshBasicMaterial color={blink && i % 2 === 0 ? "#22c55e" : "#1e293b"} />
                   </mesh>
                </group>
            ))}
        </group>
    );
};

// --- Main Component ---
export const DigitalTwin: React.FC<DigitalTwinProps> = ({ device, latestData, dict, theme = 'dark' }) => {
  const [hovered, setHover] = useState(false);
  const isDark = theme === 'dark';
  useCursor(hovered);

  const renderModel = () => {
    // 1. Check for Custom Visual Config (from AI)
    if (device.visual_config && device.visual_config.components) {
        return <Custom3DModel config={device.visual_config} />;
    }

    // 2. Fallback to Type-based selection
    const type = device.visual_model || device.type;
    const normalizedType = type.toLowerCase();
    
    // Explicit Custom type check
    if (normalizedType === 'custom' && device.visual_config?.components) {
        return <Custom3DModel config={device.visual_config} />;
    }
    
    if (normalizedType.includes('generator')) return <GeneratorModel data={latestData?.metrics} />;
    if (normalizedType.includes('cutter')) return <CutterModel data={latestData?.metrics} />;
    if (normalizedType.includes('welder')) return <GeneratorModel data={latestData?.metrics} />;
    
    return <GenericDevice />;
  };

  return (
    <div 
        className={`w-full h-full ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'} rounded-lg overflow-hidden border relative shadow-inner`}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
    >
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
         <div className="bg-slate-950/80 backdrop-blur text-xs px-3 py-1.5 rounded-full text-slate-200 border border-slate-700 flex items-center gap-2 shadow-lg">
            <div className={`w-2 h-2 rounded-full ${device.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="font-semibold tracking-wide uppercase">{device.type} {dict.twinSuffix}</span>
         </div>
         {latestData && (
             <div className="mt-2 ml-1 flex flex-col items-start gap-1">
                 <span className="text-[10px] text-slate-500 font-mono bg-black/50 px-1.5 py-0.5 rounded">
                     {dict.syncPrefix}: {new Date(latestData.timestamp).toLocaleTimeString()}
                 </span>
             </div>
         )}
      </div>

      <Canvas shadows camera={{ position: [5, 4, 6], fov: 40 }} dpr={[1, 2]}>
        <color attach="background" args={[isDark ? '#020617' : '#f8fafc']} />
        
        {/* Lighting & Environment */}
        <ambientLight intensity={0.5} />
        <spotLight 
            position={[10, 10, 10]} 
            angle={0.15} 
            penumbra={1} 
            intensity={1} 
            castShadow 
            shadow-mapSize={[1024, 1024]} 
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#9333ea" />
        
        <Center>
            {renderModel()}
        </Center>

        {/* Grounding */}
        <ContactShadows position={[0, -1.1, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
        <Grid 
            position={[0, -1.11, 0]} 
            args={[20, 20]} 
            cellColor={isDark ? "#1e293b" : "#cbd5e1"} 
            sectionColor={isDark ? "#334155" : "#94a3b8"} 
            fadeDistance={20} 
        />

        {/* Camera Control */}
        <OrbitControls 
            makeDefault 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2.2} // Don't go below ground
            maxDistance={15}
            minDistance={3}
            autoRotate={device.status === 'running' && !hovered}
            autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};
