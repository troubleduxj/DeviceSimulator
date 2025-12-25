import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface VisualComponent {
  type: 'box' | 'cylinder' | 'sphere';
  position?: [number, number, number];
  size?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}

interface Custom3DModelProps {
  config: { components: VisualComponent[] };
}

export const Custom3DModel: React.FC<Custom3DModelProps> = ({ config }) => {
  if (!config || !config.components) return null;

  return (
    <group>
      {config.components.map((comp, index) => {
        const position = comp.position || [0, 0, 0];
        const rotation = comp.rotation || [0, 0, 0];
        // Convert degrees to radians if needed, but standard threejs uses radians. 
        // Assuming AI returns raw numbers, usually unitless. 
        // Let's assume standard Euler.
        
        const size = comp.size || [1, 1, 1];
        const color = comp.color || '#cccccc';

        return (
          <mesh key={index} position={new THREE.Vector3(...position)} rotation={new THREE.Euler(...rotation)} castShadow receiveShadow>
            {comp.type === 'box' && <boxGeometry args={[size[0], size[1], size[2]]} />}
            {comp.type === 'cylinder' && <cylinderGeometry args={[size[0]/2, size[0]/2, size[1], 32]} />}
            {comp.type === 'sphere' && <sphereGeometry args={[size[0]/2, 32, 32]} />}
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
};
