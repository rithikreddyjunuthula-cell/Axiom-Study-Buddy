import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AvatarMood } from '../types';

interface StudyAvatarProps {
  mood: AvatarMood;
}

const StudyAvatar: React.FC<StudyAvatarProps> = ({ mood }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Refs for animation parts
  const robotGroupRef = useRef<THREE.Group | null>(null);
  const headRef = useRef<THREE.Mesh | null>(null);
  const eyesMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const antennaRef = useRef<THREE.Group | null>(null);
  const leftHandRef = useRef<THREE.Mesh | null>(null);
  const rightHandRef = useRef<THREE.Mesh | null>(null);
  
  // Mood ref for animation loop to access current state
  const moodRef = useRef<AvatarMood>(mood);

  // Update mood ref whenever prop changes
  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- 1. SETUP SCENE ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // --- 2. BUILD ROBOT (Axiom) ---
    const robotGroup = new THREE.Group();
    robotGroupRef.current = robotGroup;

    // Materials
    const whitePlasticMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const darkVisorMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a });
    const neonEyeMat = new THREE.MeshBasicMaterial({ color: 0x1cb0f6 }); // Default Blue
    eyesMaterialRef.current = neonEyeMat;

    // Head
    const headGeo = new THREE.SphereGeometry(1, 32, 32);
    const head = new THREE.Mesh(headGeo, whitePlasticMat);
    headRef.current = head;
    robotGroup.add(head);

    // Visor
    const visorGeo = new THREE.CapsuleGeometry(0.7, 0.6, 4, 12);
    const visor = new THREE.Mesh(visorGeo, darkVisorMat);
    visor.rotation.z = Math.PI / 2;
    visor.position.set(0, 0, 0.75);
    visor.scale.set(1, 1, 0.5);
    head.add(visor);

    // Eyes
    const eyeGeo = new THREE.CapsuleGeometry(0.15, 0.2, 4, 8);
    const leftEye = new THREE.Mesh(eyeGeo, neonEyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, neonEyeMat);
    
    leftEye.rotation.z = Math.PI / 2;
    leftEye.position.set(-0.35, 0, 1.15);
    
    rightEye.rotation.z = Math.PI / 2;
    rightEye.position.set(0.35, 0, 1.15);

    head.add(leftEye);
    head.add(rightEye);

    // Antenna
    const antennaGroup = new THREE.Group();
    antennaRef.current = antennaGroup;
    
    const stickGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.6);
    const stick = new THREE.Mesh(stickGeo, new THREE.MeshToonMaterial({color: 0xcccccc}));
    stick.position.y = 0.3;
    antennaGroup.add(stick);

    const bulbGeo = new THREE.SphereGeometry(0.15);
    const bulb = new THREE.Mesh(bulbGeo, neonEyeMat);
    bulb.position.y = 0.6;
    antennaGroup.add(bulb);

    antennaGroup.position.set(0, 0.9, 0);
    head.add(antennaGroup);

    // Floating Hands
    const handGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const leftHand = new THREE.Mesh(handGeo, whitePlasticMat);
    leftHand.position.set(-1.4, -0.5, 0);
    leftHandRef.current = leftHand;
    
    const rightHand = new THREE.Mesh(handGeo, whitePlasticMat);
    rightHand.position.set(1.4, -0.5, 0);
    rightHandRef.current = rightHand;

    robotGroup.add(leftHand);
    robotGroup.add(rightHand);

    scene.add(robotGroup);

    // --- 3. LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 7);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x1cb0f6, 0.8);
    rimLight.position.set(-5, 0, -5);
    scene.add(rimLight);

    // --- 4. ANIMATION LOOP ---
    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const currentMood = moodRef.current;
      
      if (robotGroupRef.current && headRef.current) {
        // --- BASE HOVER ---
        let hoverY = Math.sin(time * 2) * 0.1;
        
        // --- MOOD BEHAVIORS ---
        
        if (currentMood === AvatarMood.SUCCESS) {
            // Jump and Spin
            hoverY = Math.abs(Math.sin(time * 8)) * 0.5; // Fast Jump
            robotGroupRef.current.rotation.y += 0.1; // Fast Spin
            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, -0.2, 0.1); // Look up slightly
        } 
        else if (currentMood === AvatarMood.SAD) {
            // Look Down, Stop Spinning
            hoverY = Math.sin(time * 1) * 0.05; // Slow float
            // Smoothly look down
            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0.5, 0.05); 
            // Reset Y rotation
            robotGroupRef.current.rotation.y = THREE.MathUtils.lerp(robotGroupRef.current.rotation.y, 0, 0.1);
            // Droop Antenna
            if (antennaRef.current) antennaRef.current.rotation.z = Math.PI / 4;
        } 
        else if (currentMood === AvatarMood.ALMOST) {
            // Head Tilt (Thinking hard)
            robotGroupRef.current.rotation.y = THREE.MathUtils.lerp(robotGroupRef.current.rotation.y, 0, 0.1);
            // Tilt head Z
            headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, 0.4, 0.05);
            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, 0.1);
            // Wiggle antenna
            if (antennaRef.current) antennaRef.current.rotation.z = Math.sin(time * 15) * 0.2;
        } 
        else {
            // IDLE / DEFAULT
            robotGroupRef.current.rotation.y = THREE.MathUtils.lerp(robotGroupRef.current.rotation.y, 0, 0.05);
            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, 0.05);
            headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, 0, 0.05);
            if (antennaRef.current) antennaRef.current.rotation.z = Math.sin(time * 5) * 0.1;
        }

        robotGroupRef.current.position.y = hoverY;
        
        // Hands float independently
        if (leftHandRef.current && rightHandRef.current) {
            leftHandRef.current.position.y = -0.5 + Math.sin(time * 2 + 1) * 0.1;
            rightHandRef.current.position.y = -0.5 + Math.sin(time * 2 + 1.5) * 0.1;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- 5. ROBUST RESIZING ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
      }
    });

    resizeObserver.observe(mountRef.current);

    // CLEANUP
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Memory Cleanup
      headGeo.dispose();
      visorGeo.dispose();
      eyeGeo.dispose();
      stickGeo.dispose();
      bulbGeo.dispose();
      handGeo.dispose();
      whitePlasticMat.dispose();
      darkVisorMat.dispose();
      neonEyeMat.dispose();
      renderer.dispose();
    };
  }, []);

  // Mood Watcher for Colors
  useEffect(() => {
    if (!eyesMaterialRef.current) return;
    
    const eyeMat = eyesMaterialRef.current;
    
    switch (mood) {
      case AvatarMood.THINKING:
        eyeMat.color.setHex(0xffc800); // Yellow
        break;
      case AvatarMood.ALMOST:
        eyeMat.color.setHex(0xffd700); // Gold/Yellow
        break;
      case AvatarMood.SUCCESS:
        eyeMat.color.setHex(0x58cc02); // Green
        break;
      case AvatarMood.CONFUSED:
      case AvatarMood.SAD:
        eyeMat.color.setHex(0xff4b4b); // Red/Orange
        break;
      case AvatarMood.IDLE:
      default:
        eyeMat.color.setHex(0x1cb0f6); // Blue
        break;
    }
  }, [mood]);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default StudyAvatar;