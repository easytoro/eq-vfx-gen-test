import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OrbitControls setup
const controls = new OrbitControls(camera, renderer.domElement);

// Load Particle Texture
const textureLoader = new THREE.TextureLoader();
const particleTexture = textureLoader.load('star.png');

// Particle system parameters
const params = {
    particlesCount: 500,
    particleSize: 40.0,
    particleSpeed: 2.0,
    ovoidScale: 2.0,
    fadeSpeed: 0.01,
    baseShape: 'ovoid',
	particleColor: '#ffffff',
    spriteUrl: '' // Add this line
};

function loadSpriteTexture(url) {
    if (url) {
        textureLoader.load(url, (texture) => {
            particlesMaterial.uniforms.particleTexture.value = texture;
        });
    } else {
        particlesMaterial.uniforms.particleTexture.value = particleTexture;
    }
}

// Function to create particle system
function createParticleSystem() {
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(params.particlesCount * 3);
    const startTime = new Float32Array(params.particlesCount);

    for (let i = 0; i < params.particlesCount; i++) {
        let x, y, z;

        switch (params.baseShape) {
            case 'sphere':
                const phi = Math.acos(-1 + (2 * i) / params.particlesCount);
                const theta = Math.sqrt(params.particlesCount * Math.PI) * phi;
                x = Math.cos(theta) * Math.sin(phi);
                y = Math.sin(theta) * Math.sin(phi);
                z = Math.cos(phi);
                break;
            case 'cube':
                x = (Math.random() - 0.5) * 2;
                y = (Math.random() - 0.5) * 2;
                z = (Math.random() - 0.5) * 2;
                break;
            case 'torus':
                const u = Math.random() * Math.PI * 2;
                const v = Math.random() * Math.PI * 2;
                const R = 1; // Major radius
                const r = 0.3; // Minor radius
                x = (R + r * Math.cos(v)) * Math.cos(u);
                y = (R + r * Math.cos(v)) * Math.sin(u);
                z = r * Math.sin(v);
                break;
            case 'ovoid':
            default:
                const thetaOvoid = Math.random() * 2 * Math.PI;
                const phiOvoid = Math.acos((Math.random() * 2) - 1);
                const rOvoid = 0.5 + Math.random() * 0.5;
                x = rOvoid * Math.sin(phiOvoid) * Math.cos(thetaOvoid);
                y = (rOvoid * Math.cos(phiOvoid) - 0.5) * params.ovoidScale;
                z = rOvoid * Math.sin(phiOvoid) * Math.sin(thetaOvoid);
                break;
        }

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        startTime[i] = Math.random();
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('startTime', new THREE.BufferAttribute(startTime, 1));

    return new THREE.Points(particlesGeometry, particlesMaterial);
}

// Shader material
const particleVertexShader = `
uniform float time;
uniform float particleSize;
uniform float particleSpeed;
uniform vec3 particleColor; // Add this line
attribute float startTime;
varying float vOpacity;
varying vec3 vColor; // Add this line

void main() {
    vec3 pos = position;
    float age = mod((time - startTime), 1.0);
    pos.y += age * particleSpeed;
    vOpacity = 1.0 - age;
    vColor = particleColor; // Add this line
    gl_PointSize = particleSize * (1.0 - age);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const particleFragmentShader = `
uniform sampler2D particleTexture;
varying float vOpacity;
varying vec3 vColor; // Add this line

void main() {
    vec4 texColor = texture2D(particleTexture, gl_PointCoord);
    float glow = smoothstep(0.2, 0.0, length(gl_PointCoord - vec2(0.5, 0.5)));
    gl_FragColor = vec4(vColor, vOpacity * glow) * texColor; // Modify this line
}
`;

const particlesMaterial = new THREE.ShaderMaterial({
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    uniforms: {
        time: { value: 0.0 },
        particleTexture: { value: particleTexture },
        particleSize: { value: params.particleSize },
        particleSpeed: { value: params.particleSpeed },
		particleTexture: { value: particleTexture },
        particleColor: { value: new THREE.Color(params.particleColor) } // Add this line
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false
});

// Create initial particle system
let particleSystem = createParticleSystem();
scene.add(particleSystem);

// GUI setup
const gui = new dat.GUI();
gui.add(params, 'particlesCount', 100, 2000).step(100).onChange(updateParticleSystem);
gui.add(params, 'particleSize', 10, 500).onChange(updateUniforms);
gui.add(params, 'particleSpeed', 0.5, 5).onChange(updateUniforms);
gui.add(params, 'ovoidScale', 1, 5).onChange(updateParticleSystem);
gui.add(params, 'fadeSpeed', 0.001, 0.1).step(0.001);
gui.add(params, 'baseShape', ['ovoid', 'sphere', 'cube', 'torus']).onChange(updateParticleSystem);
gui.addColor(params, 'particleColor').onChange(updateUniforms);
gui.add(params, 'spriteUrl').onChange((value) => {
    loadSpriteTexture(value);
});

function updateParticleSystem() {
    scene.remove(particleSystem);
    particleSystem = createParticleSystem();
    scene.add(particleSystem);
}

function updateUniforms() {
    particlesMaterial.uniforms.particleSize.value = params.particleSize;
    particlesMaterial.uniforms.particleSpeed.value = params.particleSpeed;
    particlesMaterial.uniforms.particleColor.value.set(params.particleColor); // Add this line
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    particlesMaterial.uniforms.time.value += params.fadeSpeed;
    controls.update();
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}