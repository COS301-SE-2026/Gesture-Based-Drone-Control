/* eslint-disable */
// @ts-nocheck
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import gsap from 'gsap'
import { VENTURES, STATUS, CHAP_P } from './content'


export function createMudraExperience(opts){
  const { root, assets, onThemeChange } = opts;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let narrow=false;
const isTouch = window.matchMedia('(hover: none)').matches;
if(isTouch){ const c=root.querySelector('#cue span'); if(c) c.textContent='Scroll to fly'; }
const $ = id => root.querySelector('#'+id);
  const ac = new AbortController(); let running=true;
  const W=(ev,fn,o)=>window.addEventListener(ev,fn,Object.assign({},o||{},{signal:ac.signal}));
  const D=(ev,fn,o)=>document.addEventListener(ev,fn,Object.assign({},o||{},{signal:ac.signal}));

/*  content */
const NCH = VENTURES.length;

/* hand skeleton: forward kinematics ported from landing_page/src/lib/hand.ts (21 MediaPipe-style landmarks) */
const WRIST=[110,218];
const FINGERS=[
  { base:[64,170],  segs:[30,26,20] },
  { base:[78,128],  segs:[34,27,20] },
  { base:[103,122], segs:[38,30,22] },
  { base:[128,126], segs:[34,28,20] },
  { base:[150,134], segs:[26,20,15] },
];
const POSES=[
  [{c:.12,s:-.72},{c:0,s:.16},{c:0,s:-.2},{c:0,s:.12},{c:0,s:.28}],
  [{c:.85,s:-.45},{c:0,s:.05},{c:1,s:0},{c:1,s:.08},{c:1,s:.16}],
  [{c:.9,s:-.4},{c:.03,s:-.26},{c:.03,s:.14},{c:1,s:.1},{c:1,s:.18}],
  [{c:.95,s:-.35},{c:1,s:-.08},{c:1,s:0},{c:1,s:.08},{c:1,s:.16}],
];
function digitJoints(spec,d){
  let dir=-Math.PI/2+d.s, x=spec.base[0], y=spec.base[1]; const pts=[[x,y]];
  for(let i=0;i<spec.segs.length;i++){ dir+=d.c*(i===0?.85:1.05); const len=spec.segs[i]*(1-d.c*.12); x+=Math.cos(dir)*len; y+=Math.sin(dir)*len; pts.push([x,y]); }
  return pts;
}
// returns { pts:[[x,y,z]...21], bones:[[a,b,hot]...], } in normalised units (hand ≈ 1.2 tall, centred)
function handModel(poseIdx){
  const pose=POSES[poseIdx];
  const to3=([px,py],z=0)=>[(px-110)/100, -(py-172)/100, z];
  const pts=[to3(WRIST)], bones=[];
  let hot=pose.map(d=>d.c<.35); if(!hot.some(Boolean)) hot=hot.map(()=>true);
  const baseIdx=[];
  FINGERS.forEach((f,i)=>{
    const j=digitJoints(f,pose[i]); const start=pts.length; baseIdx.push(start);
    j.forEach((p,k)=>pts.push(to3(p, pose[i].c*0.12*k)));  // curled fingers fold slightly toward the viewer
    bones.push([0,start,false]);
    for(let k=0;k<3;k++) bones.push([start+k,start+k+1,hot[i]]);
  });
  for(let i=1;i<4;i++) bones.push([baseIdx[i],baseIdx[i+1],false]);
  return {pts,bones};
}

/*  scramble */
const GLYPHS = '—/\\|_<>#%&@*+=:;0123456789';
function scramble(el, text, dur=0.9){
  if(el._tw) el._tw.kill();
  const len = Math.max(text.length, (el.textContent||'').length);
  const start = performance.now();
  const seeds = Array.from({length:len}, ()=>Math.random());
  const tick = ()=>{
    const t = Math.min(1,(performance.now()-start)/(dur*1000));
    let out='';
    for(let i=0;i<text.length;i++){
      const reveal = (i/text.length)*0.6 + seeds[i]*0.4;
      if(t>=reveal) out+=text[i];
      else out+= text[i]===' ' ? ' ' : GLYPHS[(Math.random()*GLYPHS.length)|0];
    }
    el.textContent = out;
    if(t<1) el._raf=requestAnimationFrame(tick);
  };
  cancelAnimationFrame(el._raf); tick();
}

/*  audio */
let audio=null, audioOn=false;
function buildAudio(){
  const ctx = new (window.AudioContext||window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value=0; master.connect(ctx.destination);
  // a quiet pad: three detuned sines on an A chord, slowly swelling, with a faint shimmer two octaves up
  const padG = ctx.createGain(); padG.gain.value=0.07; padG.connect(master);
  const padLP = ctx.createBiquadFilter(); padLP.type='lowpass'; padLP.frequency.value=900; padLP.Q.value=0.3; padLP.connect(padG);
  [[110,0],[164.8,2.5],[220,-3],[329.6,1.5]].forEach(([f,det],i)=>{
    const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=f; o.detune.value=det;
    const g=ctx.createGain(); g.gain.value=i<3?0.22:0.08;
    const lfo=ctx.createOscillator(); lfo.frequency.value=0.05+i*0.017; const lg=ctx.createGain(); lg.gain.value=i<3?0.08:0.04;
    lfo.connect(lg).connect(g.gain); lfo.start();
    o.connect(g).connect(padLP); o.start();
  });
  const shimmer=ctx.createOscillator(); shimmer.type='sine'; shimmer.frequency.value=880; shimmer.detune.value=4;
  const shG=ctx.createGain(); shG.gain.value=0.012; const shL=ctx.createOscillator(); shL.frequency.value=0.09; const shLG=ctx.createGain(); shLG.gain.value=0.01;
  shL.connect(shLG).connect(shG.gain); shL.start(); shimmer.connect(shG).connect(master); shimmer.start();
  const lp = padLP;
  return { ctx, master, lp,
    blip(f=880){ const o=ctx.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(f,ctx.currentTime); o.frequency.exponentialRampToValueAtTime(f*0.5,ctx.currentTime+0.35);
      const g=ctx.createGain(); g.gain.setValueAtTime(0.0001,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.12,ctx.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.5);
      o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime+0.55); },
    tick(){ const o=ctx.createOscillator(); o.type='square'; o.frequency.value=1800; const g=ctx.createGain(); g.gain.setValueAtTime(0.03,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.06); o.connect(g).connect(master); o.start(); o.stop(ctx.currentTime+0.07); }
  };
}
const soundBtn=$('sound');
soundBtn.addEventListener('click', ()=>{
  if(!audio){ try{ audio=buildAudio(); }catch(e){ return; } }
  audioOn=!audioOn;
  if(audio.ctx.state==='suspended') audio.ctx.resume();
  audio.master.gain.cancelScheduledValues(audio.ctx.currentTime);
  audio.master.gain.linearRampToValueAtTime(audioOn?0.45:0, audio.ctx.currentTime+0.8);
  soundBtn.classList.toggle('on',audioOn); soundBtn.setAttribute('aria-pressed',String(audioOn));
  $('soundLabel').textContent = audioOn?'Sound on':'Sound off';
});

/*  three: setup */
const canvas=$('gl');
let renderer;
try{ renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'}); }
catch(e){ $('nowebgl').style.display='flex'; return; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=0.92;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const C = { void:0x0b090a, steel:0x161a1d, haze:0xb1a7a6, frost:0xd3d3d3, white:0xf5f3f4, red:0xe5383b, redDeep:0xba181b, redShadow:0x660708 };
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.void);
scene.fog = new THREE.FogExp2(C.void, 0.038);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
camera.position.set(0,0.9,4.2);

// lights
scene.add(new THREE.HemisphereLight(0xb1a7a6, 0x0b090a, 0.5));
const key = new THREE.DirectionalLight(0xf5f3f4, 1.2); key.position.set(3,6,4); scene.add(key);
key.castShadow=true; key.shadow.mapSize.set(2048,2048); key.shadow.bias=-0.0004; key.shadow.normalBias=0.03; key.shadow.radius=4;
Object.assign(key.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:0.5,far:40}); key.shadow.camera.updateProjectionMatrix(); scene.add(key.target);
const keyOffset=new THREE.Vector3(2.5,8.5,3.5);
const shadowCatcher=new THREE.Mesh(new THREE.PlaneGeometry(60,60), new THREE.ShadowMaterial({opacity:0.55})); shadowCatcher.rotation.x=-Math.PI/2; shadowCatcher.position.y=-0.61; shadowCatcher.receiveShadow=true; scene.add(shadowCatcher);
const rim = new THREE.DirectionalLight(0xe5383b, 1.5); rim.position.set(-5,2,-6); scene.add(rim);
const fill = new THREE.PointLight(0xba181b, 0.9, 14); fill.position.set(-2,1.2,2); scene.add(fill);
const head = new THREE.PointLight(0xf5f3f4, 1.5, 26, 1.4); camera.add(head); head.position.set(1.5,1.2,0.5); scene.add(camera);

/*  environment: a small studio painted onto a cube map for reflections */
(function(){
  const S=128, faces=[];
  // order: +x, -x, +y, -y, +z, -z
  const paint=(f)=>{
    const c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d');
    const grad=g.createLinearGradient(0,0,0,S);
    if(f===2){ grad.addColorStop(0,'#8e9196'); grad.addColorStop(1,'#6a6d72'); }          // ceiling
    else if(f===3){ grad.addColorStop(0,'#141214'); grad.addColorStop(1,'#09080a'); }     // floor
    else { grad.addColorStop(0,'#7a7d83'); grad.addColorStop(0.55,'#2b2a2c'); grad.addColorStop(1,'#0c0b0c'); }
    g.fillStyle=grad; g.fillRect(0,0,S,S);
    if(f===2){ g.fillStyle='#ffffff'; g.fillRect(S*0.18,S*0.3,S*0.64,S*0.26); }           // overhead softbox
    if(f===1){ g.fillStyle='#e6e8ec'; g.fillRect(S*0.1,S*0.12,S*0.22,S*0.5); }           // tall fill, left
    if(f===0){ g.fillStyle='#e5383b'; g.fillRect(S*0.66,S*0.2,S*0.12,S*0.5); }           // brand red strip, right
    return c;
  };
  for(let f=0;f<6;f++) faces.push(paint(f));
  const cube=new THREE.CubeTexture(faces); cube.colorSpace=THREE.SRGBColorSpace; cube.needsUpdate=true;
  scene.environment=cube;
})();

/*  post (chromatic aberration / glitch) */
const rt = new THREE.WebGLRenderTarget(2,2,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
rt.depthTexture = new THREE.DepthTexture(2,2); rt.depthTexture.type = THREE.UnsignedIntType;
const rtA = new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter}), rtB = rtA.clone(), rtC = rtA.clone();
const quadGeo = new THREE.PlaneGeometry(2,2);
let ANAMORPHIC=2.6;
const brightMat = new THREE.ShaderMaterial({ uniforms:{ tInput:{value:null}, uThresh:{value:0.93} },
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
  fragmentShader:`uniform sampler2D tInput; uniform float uThresh; varying vec2 vUv;
    void main(){ vec3 c=texture2D(tInput,vUv).rgb; float l=dot(c,vec3(0.299,0.587,0.114)); float k=smoothstep(uThresh-0.15,uThresh+0.2,l); gl_FragColor=vec4(c*k,1.0); }` });
const blurMat = new THREE.ShaderMaterial({ uniforms:{ tInput:{value:null}, uDir:{value:new THREE.Vector2(1,0)}, uRes:{value:new THREE.Vector2(1,1)} },
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
  fragmentShader:`uniform sampler2D tInput; uniform vec2 uDir,uRes; varying vec2 vUv;
    void main(){ vec2 px=uDir/uRes; vec3 c=texture2D(tInput,vUv).rgb*0.227;
      c+=(texture2D(tInput,vUv+px*1.385).rgb+texture2D(tInput,vUv-px*1.385).rgb)*0.316;
      c+=(texture2D(tInput,vUv+px*3.231).rgb+texture2D(tInput,vUv-px*3.231).rgb)*0.070;
      gl_FragColor=vec4(c,1.0); }` });
const brightQuad=new THREE.Mesh(quadGeo,brightMat), blurQuad=new THREE.Mesh(quadGeo,blurMat);
const passScene=new THREE.Scene(); const passCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
function runPass(quad, target){ passScene.children.length=0; passScene.add(quad); renderer.setRenderTarget(target); renderer.render(passScene,passCam); }

const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const postU = { tDiffuse:{value:rt.texture}, tDepth:{value:rt.depthTexture}, tBloom:{value:rtA.texture}, tBlur:{value:rtC.texture}, uBloom:{value:0.32}, uAO:{value:0.0}, uDof:{value:0}, uFocus:{value:5}, uNear:{value:0.1}, uFar:{value:200}, uAberr:{value:0.0}, uGlitch:{value:0.0}, uTime:{value:0}, uScan:{value:-1}, uFade:{value:0}, uVig:{value:0.58}, uGrain:{value:0.04}, uMouse:{value:new THREE.Vector2(0.5,0.5)}, uRipple:{value:0}, uAspect:{value:1.6} };
const postMat = new THREE.ShaderMaterial({
  uniforms:postU,
  vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
  fragmentShader:`
    uniform sampler2D tDiffuse, tDepth, tBloom, tBlur; uniform float uAberr, uGlitch, uTime, uScan, uFade, uVig, uGrain, uRipple, uAspect, uBloom, uAO, uDof, uFocus, uNear, uFar; uniform vec2 uMouse; varying vec2 vUv;
    float rnd(vec2 c){ return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453); }
    float viewDist(vec2 uv){ float d=texture2D(tDepth,uv).r; return -(uNear*uFar)/((uFar-uNear)*d - uFar); }
    // cheap screen-space ambient occlusion from depth alone: creases get darker, open surfaces stay clean
    float ssao(vec2 uv){
      float cz=viewDist(uv); if(cz>60.0) return 0.0;
      float r=clamp(0.09/cz, 0.004, 0.03); float a0=rnd(uv*vec2(1920.0,1080.0))*6.2831; float ao=0.0;
      for(int i=0;i<12;i++){ float fi=float(i); float ang=a0+fi*2.4; float rad=r*sqrt((fi+0.5)/12.0);
        vec2 off=vec2(cos(ang),sin(ang)/uAspect)*rad; float sz=viewDist(uv+off); float diff=cz-sz;
        ao+=smoothstep(0.02,0.12,diff)*(1.0-smoothstep(0.5,1.2,diff)); }
      return ao/12.0;
    }
    void main(){
      vec2 uv=vUv;
      // a lens that follows the cursor: the world bends a little around your hand
      if(uRipple>0.001){
        vec2 dm=(uv-uMouse)*vec2(uAspect,1.0); float r=length(dm);
        float lens=exp(-r*r*14.0);
        uv -= dm/vec2(uAspect,1.0)*lens*uRipple*0.35;
        uv += dm/vec2(uAspect,1.0)*sin(r*48.0-uTime*9.0)*exp(-r*r*22.0)*uRipple*0.02;
      }
      if(uGlitch>0.002){
        float line=floor(uv.y*36.0 + uTime*5.0);
        float r=rnd(vec2(line, floor(uTime*14.0)));
        if(r < uGlitch*0.35) uv.x += (rnd(vec2(line,7.0))-0.5)*uGlitch*0.07;
        if(r > 1.0-uGlitch*0.08) uv.y += (rnd(vec2(line,3.0))-0.5)*uGlitch*0.02;
      }
      vec2 d=uv-0.5;
      float a=uAberr*(0.35+dot(d,d)*3.0);
      vec3 c;
      c.r=texture2D(tDiffuse, uv+d*a).r;
      c.g=texture2D(tDiffuse, uv).g;
      c.b=texture2D(tDiffuse, uv-d*a).b;
      // depth of field: blur what is far from the focus distance (used in the chapter view)
      if(uDof>0.001){ float dist=viewDist(uv); float coc=uDof*smoothstep(0.9,3.2,abs(dist-uFocus)); c=mix(c, texture2D(tBlur,uv).rgb, coc); }
      // ambient occlusion
      if(uAO>0.001){ c*=1.0-ssao(uv)*uAO; }
      // bloom on the brightest parts: LEDs, highlights, the red glow
      c+=texture2D(tBloom,uv).rgb*uBloom;
      // scan line (intro reveal)
      if(uScan>-0.5){
        float s=abs(uv.y-uScan);
        c += vec3(0.90,0.22,0.23)*smoothstep(0.012,0.0,s)*0.9;
        c += vec3(0.40,0.03,0.03)*smoothstep(0.08,0.0,s)*0.3;
      }
      c += (rnd(uv*vec2(1920.0,1080.0)+fract(uTime))-0.5)*uGrain;
      float v=smoothstep(0.92,0.28,length(d));
      c*=mix(uVig,1.0,v);
      c*= 1.0-uFade;
      gl_FragColor=vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), postMat));

/*  ground: open empty plane */
const groundU = { uFade:{value:1}, uA:{value:new THREE.Color(C.void)}, uB:{value:new THREE.Color(0x2a2f33)}, uC:{value:new THREE.Color(C.redShadow)} };
const groundMat = new THREE.ShaderMaterial({
  uniforms:groundU, transparent:true, depthWrite:false,
  vertexShader:`varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader:`
    varying vec3 vP; uniform float uFade; uniform vec3 uA,uB,uC;
    float grid(vec2 p,float s){ vec2 q=p/s; vec2 g=abs(fract(q-0.5)-0.5)/fwidth(q); float l=min(g.x,g.y); return 1.0-min(l,1.0); }
    void main(){
      float d=length(vP.xy);
      float g = grid(vP.xy,1.0)*0.45 + grid(vP.xy,6.0)*0.9;
      float fade = exp(-d*0.075);
      vec3 c = mix(uA, uB, g*fade*0.9);
      c += uC*exp(-d*0.45)*0.5;          // red pool of light under the drone
      float alpha = uFade*(0.2+fade*0.8);
      gl_FragColor=vec4(c,alpha);
    }`
});
groundMat.extensions.derivatives = true;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(240,240,1,1), groundMat);
ground.rotation.x=-Math.PI/2; ground.position.y=-0.62; scene.add(ground);

// a faint horizon band so the emptiness has a far edge
const horizon = new THREE.Mesh(new THREE.RingGeometry(40,120,64), new THREE.MeshBasicMaterial({color:0x151314, transparent:true, opacity:0.9, side:THREE.DoubleSide}));
horizon.rotation.x=-Math.PI/2; horizon.position.y=-0.61; scene.add(horizon);

/*  the drone: a small white quad in the Tello class, built in code */
const matShell = new THREE.MeshPhysicalMaterial({color:0xeceef0, metalness:0.0, roughness:0.32, clearcoat:0.55, clearcoatRoughness:0.25});
const matShell2= new THREE.MeshPhysicalMaterial({color:0xd4d7db, metalness:0.0, roughness:0.4, clearcoat:0.3, clearcoatRoughness:0.3});
const matDark  = new THREE.MeshStandardMaterial({color:0x26282c, metalness:0.2, roughness:0.55});
const matGuard = new THREE.MeshStandardMaterial({color:0x303338, metalness:0.15, roughness:0.6});
const matLens  = new THREE.MeshPhysicalMaterial({color:0x08090a, metalness:0.3, roughness:0.08, clearcoat:1});
const matProp  = new THREE.MeshStandardMaterial({color:0xb9bcc0, metalness:0.1, roughness:0.5});
const matLedR  = new THREE.MeshStandardMaterial({color:0xff6b6b, emissive:0xe5383b, emissiveIntensity:2.4});
const matLedG  = new THREE.MeshStandardMaterial({color:0x9ad7a8, emissive:0x3ddc84, emissiveIntensity:1.8});
const matBlur  = new THREE.MeshBasicMaterial({color:0xc9cccf, transparent:true, opacity:0.1, side:THREE.DoubleSide, depthWrite:false});

// the wireframe skeleton (same colours as DroneScene.tsx)
const wireFrame  = new THREE.MeshBasicMaterial({color:0xd3d3d3, wireframe:true, transparent:true, opacity:0});
const wireAccent = new THREE.MeshBasicMaterial({color:0xe5383b, wireframe:true, transparent:true, opacity:0});

function buildDrone(){
  const group=new THREE.Group(), parts=[], props=[];
  const add=(geo, mat, pos, dir, rot, scl, accent)=>{
    const m=new THREE.Mesh(geo, mat.clone()); m.material.transparent=true; m.material.opacity=0;
    m.position.copy(pos); if(rot) m.rotation.copy(rot); if(scl) m.scale.copy(scl);
    const w=new THREE.Mesh(geo, (accent?wireAccent:wireFrame).clone()); w.userData.accent=!!accent; m.add(w);
    group.add(m); parts.push({obj:m, wire:w, base:pos.clone(), dir:dir.clone().normalize()});
    return m;
  };
  const V=(x,y,z)=>new THREE.Vector3(x,y,z), E=(x,y,z)=>new THREE.Euler(x,y,z);
  // fuselage: flattened pill, lighter top deck, dark belly
  add(new THREE.SphereGeometry(1,28,18), matShell,  V(0,0,0),      V(0,0.3,0), null, V(0.74,0.2,0.5));
  add(new THREE.SphereGeometry(1,24,14), matShell2, V(0,0.1,-0.02),V(0,1,0),   null, V(0.6,0.13,0.38), true);
  add(new THREE.BoxGeometry(0.52,0.1,0.42), matDark, V(0,-0.16,0), V(0,-1,0));           // battery bay
  // nose: camera housing, lens, LED
  add(new THREE.BoxGeometry(0.3,0.13,0.14), matDark, V(0,0.0,0.5), V(0,0,1));
  add(new THREE.CylinderGeometry(0.045,0.05,0.07,20), matLens, V(0,0.0,0.58), V(0,0,1), E(Math.PI/2,0,0), null, true);
  add(new THREE.SphereGeometry(0.022,10,8), matLedR, V(0.19,0.02,0.49), V(0.3,0,1), null, null, true);
  // belly sensors
  add(new THREE.CylinderGeometry(0.03,0.03,0.03,14), matLens, V(-0.12,-0.22,0.1), V(0,-1,0));
  add(new THREE.CylinderGeometry(0.03,0.03,0.03,14), matLens, V( 0.12,-0.22,0.1), V(0,-1,0));
  add(new THREE.SphereGeometry(0.018,8,6), matLedG, V(0,-0.22,-0.14), V(0,-1,0), null, null, true);
  // arms, pods, guards, props
  const d=1.0;
  [[d,d],[d,-d],[-d,d],[-d,-d]].forEach(([px,pz],i)=>{
    const out=V(px,0,pz).normalize(), ang=Math.atan2(pz,px);
    const armC=out.clone().multiplyScalar(0.62); armC.y=-0.02;
    add(new THREE.CylinderGeometry(0.045,0.062,1.0,12), matShell, armC, out.clone().multiplyScalar(0.5), E(0,-ang,Math.PI/2));
    const pod=V(px,0.02,pz);
    add(new THREE.CylinderGeometry(0.1,0.12,0.17,20), matShell, pod, out.clone().add(V(0,0.7,0)));
    add(new THREE.CylinderGeometry(0.058,0.058,0.05,16), matDark, V(px,0.125,pz), out.clone().add(V(0,1,0)));
    add(new THREE.CylinderGeometry(0.03,0.035,0.08,10), matDark, V(px,-0.1,pz), out.clone().add(V(0,-1,0)));   // foot
    // prop guard ring with three spokes (child of the pod: keeps it rigid while exploding)
    add(new THREE.TorusGeometry(0.5,0.02,8,48), matGuard, V(px,0.085,pz), out.clone().add(V(0,0.4,0)), E(Math.PI/2,0,0), null, true);
    for(let k=0;k<3;k++){ const a=ang+Math.PI*0.75+k*Math.PI*2/3; const c=V(px+Math.cos(a)*0.3, 0.085, pz+Math.sin(a)*0.3);
      add(new THREE.BoxGeometry(0.42,0.014,0.018), matGuard, c, out.clone().add(V(0,0.4,0)), E(0,-a,0)); }
    // propeller
    const pg=new THREE.Group(); pg.position.set(px,0.17,pz);
    const b1=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.008,0.055), matProp.clone()); b1.material.transparent=true; b1.material.opacity=0; b1.rotation.x=0.18;
    const b2=b1.clone(); b2.material=b1.material.clone(); b2.rotation.set(-0.18,Math.PI/2,0);
    const w1=new THREE.Mesh(b1.geometry, wireFrame.clone()); b1.add(w1); const w2=new THREE.Mesh(b1.geometry, wireFrame.clone()); b2.add(w2);
    const disc=new THREE.Mesh(new THREE.CircleGeometry(0.45,40), matBlur.clone()); disc.rotation.x=-Math.PI/2; disc.material.opacity=0;
    pg.add(b1,b2,disc); group.add(pg);
    props.push({g:pg, base:pg.position.clone(), dir:out.clone().add(V(0,1.3,0)).normalize(), blades:[b1,b2], wires:[w1,w2], disc, dirSign:i%2?1:-1});
  });
  const hit=new THREE.Mesh(new THREE.SphereGeometry(1.6,16,12), new THREE.MeshBasicMaterial({colorWrite:false, depthWrite:false, transparent:true, opacity:0}));
  group.add(hit);
  return {group, parts, props, hit};
}
function setRigState(rig,{explode=0, solid=1, skel=0, scanY=null}){
  rig.parts.forEach(p=>{
    p.obj.position.copy(p.base).addScaledVector(p.dir, explode*0.9);
    let s=solid;
    if(scanY!==null){ s = THREE.MathUtils.smoothstep(scanY - (p.base.y*0.9+0.3), -0.1, 0.06); }
    const sk = scanY!==null ? (1-s) : Math.max(skel, explode*0.4);
    p.obj.material.opacity = s*(1-skel); p.obj.material.depthWrite = p.obj.material.opacity>0.4;
    p.wire.material.opacity = sk * (p.wire.userData.accent ? 1 : 0.92);
  });
  rig.props.forEach(p=>{
    p.g.position.copy(p.base).addScaledVector(p.dir, explode*0.9);
    let s=solid; if(scanY!==null) s=THREE.MathUtils.smoothstep(scanY-(p.base.y*0.9+0.3),-0.1,0.06);
    const sk = scanY!==null ? (1-s) : Math.max(skel, explode*0.4);
    p.blades.forEach(b=>{ b.material.opacity=s*(1-skel); b.material.depthWrite=b.material.opacity>0.4; });
    p.wires.forEach(w=>w.material.opacity=sk*0.92);
    p.disc.material.opacity = s*(1-skel)*0.1*(1-explode*0.7);
  });
}
/*  real models: the drone and the arm (GLB, embedded) */
renderer.localClippingEnabled = true;
const drone=new THREE.Group(); drone.position.set(0,0.28,0); scene.add(drone);
const armPivot=new THREE.Group(); scene.add(armPivot); armPivot.visible=false;
const M={ ok:false, droneScene:null, mixer:null, actHover:null, actExp:null, droneSolid:[], droneWire:[], droneHit:null, dronePalm:new THREE.Vector3(),
          armScene:null, armBones:[], armSolid:[], armWire:[], armHit:null, palmLocal:new THREE.Vector3(), tipLocal:new THREE.Vector3(), mini:null, miniMixer:null, orb:{}, hdr:null };
let rig=null, parts=[], props=[], hit=null;   // procedural fallback, only built if the models fail
const DS=2.3; let AS=4.2;                          // drone scale on the palm, arm scale
const wireDrone = new THREE.MeshBasicMaterial({color:0xd3d3d3, wireframe:true, transparent:true, opacity:0});
const wireArm   = new THREE.MeshBasicMaterial({color:0xe5383b, wireframe:true, transparent:true, opacity:0});
const clipSolid = new THREE.Plane(new THREE.Vector3(0,-1,0), 1e6), clipWire = new THREE.Plane(new THREE.Vector3(0,1,0), -1e6);

function prepModel(root, wireMat, solidArr, wireArr){
  const adds=[];
  root.traverse(o=>{
    if(!o.isMesh) return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    mats.forEach(m=>{ m.transparent=true; m.opacity=1; m.clippingPlanes=[clipSolid]; m.side=THREE.FrontSide; if(o.isSkinnedMesh) m.skinning=true; if(!solidArr.includes(m)) solidArr.push(m); });
    o.castShadow=true; o.receiveShadow=true;
    const w=o.clone(); w.material=wireMat; w.material.clippingPlanes=[clipWire]; w.renderOrder=2; w.castShadow=false; w.receiveShadow=false; if(o.isSkinnedMesh) wireMat.skinning=true; adds.push([o,w]);
  });
  adds.forEach(([o,w])=>{ o.parent.add(w); wireArr.push(w); });
  if(!wireArr.includes(wireMat)) wireArr.push(wireMat);
}
function setModelState({solid=1, skel=0, scanY=null}){
  const sOp = scanY!==null ? 1 : solid*(1-skel);
  const wOp = scanY!==null ? 1 : Math.max(skel, 0);
  M.droneSolid.forEach(m=>{ m.opacity=sOp; m.depthWrite=sOp>0.4; });
  M.armSolid.forEach(m=>{ m.opacity=sOp; m.depthWrite=sOp>0.4; });
  wireDrone.opacity=wOp*0.9; wireArm.opacity=wOp;
  if(scanY!==null){ clipSolid.constant=scanY; clipWire.constant=-scanY; }
  else { clipSolid.constant=1e6; clipWire.constant=1e6; }
}
function loadGLB(url){ return new Promise((res,rej)=>{ new GLTFLoader().load(url, res, undefined, rej); }); }
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
// finger posing: curl delta per finger bone, sampled from the clip (t=0 relaxed, t=5 fist)
function prepArm(gltf){
  const o=gltf.scene;
  // accent material → brand red (the file ships it orange)
  o.traverse(m=>{ if(!m.isMesh || !m.material) return; const mt=m.material;
    if(/Mat\.?1/.test(mt.name||'')){ mt.color.setHex(0xc41e22); mt.metalness=0.2; mt.roughness=0.45; }   // accent cables → brand red
    else { mt.metalness=0.35; mt.roughness=0.3; mt.envMapIntensity=0.55; }                       // shell: satin white rather than a mirror
  });
  o.updateMatrixWorld(true);
  const hand=o.getObjectByName('Cylinder'), mano=o.getObjectByName('mano'), brazo=o.getObjectByName('brazo'), shoulderN=o.getObjectByName('Tube_3');
  const worldOf=(obj)=>{ const v=new THREE.Vector3(); obj.getWorldPosition(v); return v; };
  // straighten the elbow: aim the forearm along the upper arm so the raised arm reads as one column
  (function(){
    const up=worldOf(brazo).sub(worldOf(shoulderN)).normalize(), cur=worldOf(mano).sub(worldOf(brazo)).normalize();
    const q=new THREE.Quaternion().setFromUnitVectors(cur, up); const pw=new THREE.Quaternion(); brazo.parent.getWorldQuaternion(pw); const jw=new THREE.Quaternion(); brazo.getWorldQuaternion(jw);
    brazo.quaternion.copy(pw.clone().invert().multiply(q.multiply(jw))); o.updateMatrixWorld(true);
  })();
  // finger chains: each phalanx is a group that pivots about its local Y
  const chains=[]; hand.children.forEach(c=>{ if(/^Cylinder/.test(c.name) && !c.name.endsWith('__0')){ const ch=[c]; let n=c; for(;;){ const nx=n.children.find(k=>/^Cylinder/.test(k.name)&&!k.name.endsWith('__0')); if(!nx) break; ch.push(nx); n=nx; } chains.push(ch); } });
  const bones=[]; chains.forEach(ch=>ch.forEach(j=>{ const q=j.quaternion.clone(); bones.push({b:j, q0:q, axis:new THREE.Vector3(0,1,0), ang:2*Math.atan2(q.y,q.w)}); }));
  M.armBones=bones;
  const tipsNow=()=>chains.map(ch=>worldOf(ch[ch.length-1])).reduce((a,b)=>a.add(b), new THREE.Vector3()).multiplyScalar(1/chains.length);
  poseFingers(-0.9); o.updateMatrixWorld(true); const tipOpen=tipsNow();
  poseFingers(0.8);  o.updateMatrixWorld(true); const tipFist=tipsNow();
  poseFingers(0);    o.updateMatrixWorld(true);
  const wp=worldOf(mano), shoulder=worldOf(shoulderN);
  const fdir=tipOpen.clone().sub(wp).normalize();
  const pn=tipFist.clone().sub(tipOpen); pn.addScaledVector(fdir, -pn.dot(fdir)).normalize();     // palm normal: the way the fingers close
  const axis=tipOpen.clone().sub(shoulder).normalize();                                             // arm axis, shoulder → fingertips
  const e2=pn.clone().addScaledVector(axis, -pn.dot(axis)).normalize(), e3=new THREE.Vector3().crossVectors(axis,e2);
  const Sm=new THREE.Matrix4().makeBasis(axis,e2,e3);
  const target=(f,n)=>{ const F=f.clone().normalize(), N=n.clone().addScaledVector(F,-n.dot(F)).normalize(), E3=new THREE.Vector3().crossVectors(F,N); return new THREE.Matrix4().makeBasis(F,N,E3); };
  const Sinv=Sm.clone().transpose();
  qHero.setFromRotationMatrix(target(V3(0.78,0,0.62), V3(0,1,0)).multiply(Sinv));   // hand to the right-front, palm up
  qVert.setFromRotationMatrix(target(V3(0,1,0), V3(0,0,1)).multiply(Sinv));         // fingers up, palm to the camera
  const armLen=tipOpen.distanceTo(shoulder); AS=10.0/armLen;
  const inner=new THREE.Group(); inner.scale.setScalar(AS); const shift=new THREE.Group(); shift.position.copy(wp).negate(); shift.add(o); inner.add(shift); armPivot.add(inner);
  const handLen=tipOpen.distanceTo(wp);
  M.armScene=o; M.palmLocal.copy(wp).lerp(tipOpen,0.40).addScaledVector(pn, handLen*0.42).sub(wp).multiplyScalar(AS); M.tipLocal.copy(tipOpen).sub(wp).multiplyScalar(AS);
  prepModel(o, wireArm, M.armSolid, M.armWire);
  M.armHit=new THREE.Mesh(new THREE.SphereGeometry(handLen*AS*0.55,16,12), new THREE.MeshBasicMaterial({colorWrite:false, depthWrite:false, transparent:true, opacity:0})); M.armHit.position.copy(M.palmLocal); armPivot.add(M.armHit);
}
const qHero=new THREE.Quaternion(), qVert=new THREE.Quaternion();   // filled in by prepArm from the measured arm axis and palm normal
const _q=new THREE.Quaternion(), _up=new THREE.Vector3(0,1,0);
function poseFingers(k, t=0, amp=0){ M.armBones.forEach((f,i)=>{ const kk = k + amp*(Math.sin(t*1.1 + i*0.9) * 0.6 + Math.sin(t*1.7 + i*1.7) * 0.4); f.b.quaternion.copy(f.q0).multiply(_q.setFromAxisAngle(f.axis, f.ang*kk)); }); }
function prepDrone(gltf){
  const o=gltf.scene; o.scale.setScalar(DS); drone.add(o);
  M.droneScene=o; M.mixer=new THREE.AnimationMixer(o);
  const hover=gltf.animations.find(a=>a.name==='hover'), exp=gltf.animations.find(a=>a.name==='exploded_view');
  M.actHover=M.mixer.clipAction(hover); M.actHover.play(); M.actHover.setEffectiveWeight(0);
  M.actExp=M.mixer.clipAction(exp); M.actExp.play(); M.actExp.setEffectiveWeight(1); M.actExp.paused=true; M.actExp.time=0;
  prepModel(o, wireDrone, M.droneSolid, M.droneWire);
  M.droneHit=new THREE.Mesh(new THREE.SphereGeometry(0.62*DS,16,12), new THREE.MeshBasicMaterial({colorWrite:false, depthWrite:false, transparent:true, opacity:0})); M.droneHit.position.y=0.12*DS; drone.add(M.droneHit);
}
function prepMini(gltf){
  const o=gltf.scene; o.scale.setScalar(0.95); o.position.y=-0.12; const g=new THREE.Group(); g.add(o);
  M.miniMixer=new THREE.AnimationMixer(o); const a=M.miniMixer.clipAction(gltf.animations.find(x=>x.name==='exploded_view')); a.play(); a.paused=true; M.miniAct=a;
  M.mini=g;
}
// brand palette for the objects inside the orbs
const BRAND = {
  dark:  {color:0x22252b, metalness:0.35, roughness:0.5},
  white: {color:0xe6e3e4, metalness:0.15, roughness:0.35},
  steel: {color:0xd3d3d3, metalness:0.9,  roughness:0.22},
  red:   {color:0xc41e22, metalness:0.45, roughness:0.38, emissive:0x3a0608, emissiveIntensity:0.5},
  glow:  {color:0xe5383b, metalness:0.1,  roughness:0.4,  emissive:0xe5383b, emissiveIntensity:1.4},
};
function brandify(root, pick){
  root.traverse(m=>{ if(!m.isMesh || !m.material) return;
    const mats=Array.isArray(m.material)?m.material:[m.material];
    const out=mats.map(mt=>{ const kind=pick(mt.name||'', mt); if(!kind) return mt; const src=mt.color?mt.color.clone():new THREE.Color(0x888888);
      const nm=new THREE.MeshStandardMaterial(Object.assign({}, BRAND[kind])); nm.name=mt.name; nm.userData.brand=kind; if(mt.transparent && mt.opacity<1){ nm.transparent=true; nm.opacity=Math.max(0.6,mt.opacity); } return nm; });
    m.material = Array.isArray(m.material)?out:out[0]; });
}
const hsl={h:0,s:0,l:0};
const byTone=(mt)=>{ if(!mt.color) return 'dark'; mt.color.getHSL(hsl); if(hsl.s>0.35 && hsl.l>0.15) return 'red'; return hsl.l>0.45?'white':'dark'; };
function fitInOrb(obj, size, lift=0){
  obj.updateMatrixWorld(true); const box=new THREE.Box3().setFromObject(obj); const c=box.getCenter(new THREE.Vector3()), d=box.getSize(new THREE.Vector3());
  const sc=size/Math.max(d.x,d.y,d.z,1e-6); const g=new THREE.Group(); obj.position.copy(c).negate().multiplyScalar(sc); obj.position.y+=lift; obj.scale.setScalar(sc); g.add(obj); return g;
}
function loadHDR(url){ return new Promise((res,rej)=>{ new RGBELoader().load(url, t=>{ t.mapping=THREE.EquirectangularReflectionMapping; res(t); }, undefined, rej); }); }
const modelsReady = (async ()=>{
  try{
    const A=assets; if(!A) throw new Error('no assets');
    const [d1,a1,d2,lk,pd,bd,rm,hdr]=await Promise.all([loadGLB(A.drone), loadGLB(A.arm), loadGLB(A.drone),
      A.lock?loadGLB(A.lock):null, A.pad?loadGLB(A.pad):null, A.badge?loadGLB(A.badge):null, A.room?loadGLB(A.room):null, A.hdr?loadHDR(A.hdr).catch(()=>null):null]);
    prepDrone(d1); prepArm(a1); prepMini(d2);
    if(hdr){ scene.environment=hdr; M.hdr=hdr; }
    if(lk){ brandify(lk.scene, n=>/^01/.test(n)?'red':/^07/.test(n)?'steel':'dark'); M.orb[1]=fitInOrb(lk.scene,1.55); }
    if(pd){ brandify(pd.scene, (n,mt)=>/16_/.test(n)?'glow':/11_|steel/.test(n)?'white':/clear/.test(n)?'dark':'dark'); M.orb[2]=fitInOrb(pd.scene,1.7); M.orb[2].rotation.x=0.5; }
    if(bd){ brandify(bd.scene, n=>/\.002$/.test(n)?'red':/\.001$/.test(n)?'steel':'dark'); M.orb[3]=fitInOrb(bd.scene,1.55); }
    if(rm){ brandify(rm.scene, (n,mt)=>/^Walls/.test(n)?'dark':/^Floor/.test(n)?'dark':byTone(mt)); M.orb[4]=fitInOrb(rm.scene,1.35,-0.05); M.orb[4].rotation.y=0.6; }
    M.ok=true;
  }catch(e){
    console.warn('model load failed, using the code-built drone', e);
    rig=buildDrone(); parts=rig.parts; props=rig.props; hit=rig.hit; rig.group.scale.setScalar(0.95); drone.add(rig.group); setRigState(rig,{solid:0});
  }
})();
const setDroneState=(o)=>{ if(M.ok) setModelState(o); else if(rig) setRigState(rig,o); };

/*  capsules (ventures) */
const capsules=[];
const matGlass = new THREE.MeshPhysicalMaterial({
  color:0xd3d3d3, metalness:0.05, roughness:0.08, transparent:true, opacity:0.16, clearcoat:1, clearcoatRoughness:0.1,
  flatShading:true, side:THREE.FrontSide, depthWrite:false
});
const matCrystal = new THREE.LineBasicMaterial({color:0xb1a7a6, transparent:true, opacity:0.38});
const CAP_BASE = [ [-3.6,-3.3,1.2], [-3.5,-5.24,-1.0], [-3.4,-7.18,1.0], [-3.3,-9.12,-0.9], [-3.2,-11.06,1.0], [-3.1,-13.0,-1.0] ];
const CAP_POS = CAP_BASE.map(a=>a.slice());
function innerObject(i){
  const g=new THREE.Group();
  if(i===0){ // the hand that drives it all: 21 landmarks, open palm
    const hm=handModel(0);
    const jointGeo=new THREE.SphereGeometry(0.032,10,8);
    const jm=new THREE.MeshStandardMaterial({color:0xf5f3f4, emissive:0xe5383b, emissiveIntensity:0.9, metalness:0.2, roughness:0.4});
    hm.pts.forEach(p=>{ const m=new THREE.Mesh(jointGeo, jm); m.position.set(p[0],p[1],p[2]); g.add(m); });
    const arr=[]; hm.bones.forEach(([a,b])=>arr.push(...hm.pts[a], ...hm.pts[b]));
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr,3));
    g.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({color:0xe5383b, transparent:true, opacity:0.9})));
    g.scale.setScalar(0.6);
  } else if(i>=1 && i<=4){ // lock, controller, badge, room: real models once loaded, brand-coloured
    const fallback=()=>{
      const wm=new THREE.MeshStandardMaterial({color:0xb1a7a6, metalness:0.6, roughness:0.3});
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.02,8,64), wm); ring.rotation.x=Math.PI/2; g.add(ring);
      const core=new THREE.Mesh(new THREE.OctahedronGeometry(0.2,0), new THREE.MeshStandardMaterial({color:0xe5383b, emissive:0x660708, emissiveIntensity:0.9})); g.add(core);
    };
    modelsReady.then(()=>{ if(M.orb[i]) g.add(M.orb[i]); else fallback(); });
  } else { // the field: a miniature of the real drone, running its own exploded view
    modelsReady.then(()=>{ if(M.mini) g.add(M.mini); else { const mini=buildDrone(); setRigState(mini,{solid:1}); mini.group.scale.setScalar(0.42); g.add(mini.group); g.userData.mini=mini; } });
  }
  return g;
}
const capGeos = [
  new THREE.IcosahedronGeometry(1.15,0),
  new THREE.DodecahedronGeometry(1.05,0),
  new THREE.OctahedronGeometry(1.3,1),
  new THREE.IcosahedronGeometry(1.2,1),
  new THREE.DodecahedronGeometry(1.1,0),
  new THREE.IcosahedronGeometry(1.15,1),
];
CAP_POS.forEach((p,i)=>{
  const g=new THREE.Group(); g.position.set(p[0],p[1],p[2]);
  const geo=capGeos[i%capGeos.length];
  // jitter vertices slightly for a hewn, non-perfect shell
  const pos=geo.attributes.position; for(let k=0;k<pos.count;k++){ const j=0.06; pos.setXYZ(k, pos.getX(k)*(1+(Math.sin(k*3.1)*j)), pos.getY(k)*(1+(Math.cos(k*1.7)*j)), pos.getZ(k)*(1+(Math.sin(k*5.3)*j))); }
  geo.computeVertexNormals();
  const shell=new THREE.Mesh(geo, matGlass.clone());
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo,10), matCrystal.clone());
  const inner=innerObject(i); g.userData.innerScale = inner.scale.x;
  g.add(shell,edges,inner);
  g.visible=false;
  scene.add(g);
  capsules.push({g, shell, edges, inner, i, spin:0.12+i*0.03, userData:g.userData});
});

/*  particles (footer) */
const N = isTouch ? 3200 : 7200;
const pPos = new Float32Array(N*3), pVel = new Float32Array(N*3), pSpd = new Float32Array(N);
const shapes = {};
function fibSphere(r){ const a=new Float32Array(N*3); const ga=Math.PI*(3-Math.sqrt(5)); for(let i=0;i<N;i++){ const y=1-(i/(N-1))*2, rad=Math.sqrt(1-y*y), th=ga*i; const w=r*(0.86+0.14*Math.sin(i*0.37)); a[i*3]=Math.cos(th)*rad*w; a[i*3+1]=y*w; a[i*3+2]=Math.sin(th)*rad*w; } return a; }
shapes.sphere = fibSphere(1.9);
shapes.ring = (()=>{ const a=new Float32Array(N*3); for(let i=0;i<N;i++){ const t=Math.random()*Math.PI*2, u=Math.random()*Math.PI*2, R=2.1, r=0.22*Math.sqrt(Math.random()); a[i*3]=(R+r*Math.cos(u))*Math.cos(t); a[i*3+1]=r*Math.sin(u); a[i*3+2]=(R+r*Math.cos(u))*Math.sin(t); } return a; })();
shapes.cross = (()=>{ const a=new Float32Array(N*3); for(let i=0;i<N;i++){ const bar=i%2; const L=(Math.random()-0.5)*4.6, w=(Math.random()-0.5)*0.42, d=(Math.random()-0.5)*0.3; const s=bar?1:-1; a[i*3]=(L*0.7071)+(w*0.7071*s); a[i*3+1]=(L*0.7071*s)-(w*0.7071); a[i*3+2]=d; } return a; })();
shapes.grid = (()=>{ const a=new Float32Array(N*3); const n=Math.floor(Math.sqrt(N)); for(let i=0;i<N;i++){ const gx=i%n, gy=Math.floor(i/n); const x=(gx/(n-1)-0.5)*4.2, z=(gy/(n-1)-0.5)*4.2; a[i*3]=x; a[i*3+1]=Math.sin(x*1.6)*Math.cos(z*1.6)*0.35-0.4; a[i*3+2]=z; } return a; })();
shapes.arrow = (()=>{ const a=new Float32Array(N*3); for(let i=0;i<N;i++){ let x,y; if(i<N*0.45){ x=(Math.random()-0.5)*0.5; y=(Math.random()-0.6)*3.4-0.2; } else { const t=Math.random(), s=i%2?1:-1; x=s*t*1.6; y=1.6-t*1.5+(Math.random()-0.5)*0.4; } a[i*3]=x; a[i*3+1]=y; a[i*3+2]=(Math.random()-0.5)*0.35; } return a; })();
// icon shapes drawn as line segments (unit coords, roughly -1..1)
function fromSegs(segs, S, thick){
  const a=new Float32Array(N*3); let total=0; const cum=[];
  segs.forEach(g=>{ total+=Math.hypot(g[2]-g[0],g[3]-g[1]); cum.push(total); });
  for(let i=0;i<N;i++){
    const r=Math.random()*total; let lo=0,hi=cum.length-1; while(lo<hi){ const m=(lo+hi)>>1; if(cum[m]<r) lo=m+1; else hi=m; }
    const g=segs[lo], t=Math.random();
    a[i*3]=(g[0]+(g[2]-g[0])*t+(Math.random()-0.5)*thick)*S;
    a[i*3+1]=(g[1]+(g[3]-g[1])*t+(Math.random()-0.5)*thick)*S;
    a[i*3+2]=(Math.random()-0.5)*thick*S*1.5;
  }
  return a;
}
function circleSegs(cx,cy,r,n=56){ const s=[]; for(let i=0;i<n;i++){ const a0=i/n*Math.PI*2, a1=(i+1)/n*Math.PI*2; s.push([cx+Math.cos(a0)*r, cy+Math.sin(a0)*r, cx+Math.cos(a1)*r, cy+Math.sin(a1)*r]); } return s; }
function poly(pts, close){ const s=[]; for(let i=0;i<pts.length-1;i++) s.push([pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]]); if(close) s.push([pts[pts.length-1][0],pts[pts.length-1][1],pts[0][0],pts[0][1]]); return s; }
const IS=2.0, TH=0.07;
shapes.doc = fromSegs([
  ...poly([[-0.62,-0.9],[-0.62,0.9],[0.3,0.9],[0.62,0.58],[0.62,-0.9]],true),
  ...poly([[0.3,0.9],[0.3,0.58],[0.62,0.58]]),
  [-0.4,0.3,0.4,0.3],[-0.4,0.05,0.4,0.05],[-0.4,-0.2,0.4,-0.2],[-0.4,-0.45,0.1,-0.45],
], IS, TH);
shapes.download = fromSegs([
  [0,0.95,0,-0.15],[-0.5,0.3,0,-0.2],[0.5,0.3,0,-0.2],
  ...poly([[-0.85,-0.45],[-0.85,-0.9],[0.85,-0.9],[0.85,-0.45]]),
], IS, TH);
shapes.play = fromSegs([ ...circleSegs(0,0,0.95), ...poly([[-0.32,0.52],[-0.32,-0.52],[0.58,0]],true) ], IS, TH);
shapes.mail = fromSegs([ ...poly([[-1,-0.62],[-1,0.62],[1,0.62],[1,-0.62]],true), ...poly([[-1,0.62],[0,-0.08],[1,0.62]]) ], IS*0.95, TH);
shapes.git = fromSegs([
  ...circleSegs(-0.45,0.72,0.16), ...circleSegs(-0.45,-0.72,0.16), ...circleSegs(0.5,0.42,0.16),
  [-0.45,0.56,-0.45,-0.56],
  ...poly([[0.5,0.26],[0.5,-0.02],[0.3,-0.32],[-0.1,-0.5],[-0.45,-0.56]]),
], IS, TH);
// resting state: a loose, quiet cloud
shapes.cloud = (()=>{ const a=fibSphere(3.4); for(let i=0;i<N*3;i++) a[i]+=(Math.random()-0.5)*1.6; return a; })();
// open-palm hand, built from the 21 landmarks
shapes.hand = (()=>{
  const hm=handModel(0), a=new Float32Array(N*3), S=2.2;
  const nb=hm.bones.length;
  for(let i=0;i<N;i++){
    let x,y,z;
    if(i%5===0){ const p=hm.pts[(Math.random()*hm.pts.length)|0]; x=p[0]+(Math.random()-0.5)*0.05; y=p[1]+(Math.random()-0.5)*0.05; z=p[2]+(Math.random()-0.5)*0.05; }
    else { const [ia,ib]=hm.bones[(Math.random()*nb)|0]; const A=hm.pts[ia],B=hm.pts[ib], t=Math.random(); x=A[0]+(B[0]-A[0])*t+(Math.random()-0.5)*0.02; y=A[1]+(B[1]-A[1])*t+(Math.random()-0.5)*0.02; z=A[2]+(B[2]-A[2])*t+(Math.random()-0.5)*0.02; }
    a[i*3]=x*S; a[i*3+1]=y*S; a[i*3+2]=z*S;
  }
  return a;
})();
let pTarget = shapes.cloud;
for(let i=0;i<N;i++){ pPos[i*3]=(Math.random()-0.5)*9; pPos[i*3+1]=(Math.random()-0.5)*6; pPos[i*3+2]=(Math.random()-0.5)*8; }
const pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3));
pGeo.setAttribute('aSpeed', new THREE.BufferAttribute(pSpd,1));
const pMat=new THREE.ShaderMaterial({
  uniforms:{ uSize:{value: isTouch?1.7:1.35}, uBoost:{value:1}, uPR:{value:Math.min(window.devicePixelRatio,2)}, uOpacity:{value:0}, uFrost:{value:new THREE.Color(C.red)}, uWhite:{value:new THREE.Color(C.white)}, uHaze:{value:new THREE.Color(0x8a2426)} },
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  vertexShader:`attribute float aSpeed; varying float vS; uniform float uSize, uPR, uBoost;
    void main(){ vS=aSpeed; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=uSize*uPR*uBoost*(0.6+vS*1.4)*(30.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
  fragmentShader:`varying float vS; uniform float uOpacity; uniform vec3 uFrost,uWhite,uHaze;
    void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); if(r>0.5) discard; float a=exp(-r*r*12.0);
      vec3 c=mix(uHaze, uFrost, smoothstep(0.0,0.35,vS)); c=mix(c,uWhite,smoothstep(0.55,1.0,vS));
      gl_FragColor=vec4(c, a*uOpacity*(0.42+vS*0.4)); }`
});
const particles=new THREE.Points(pGeo,pMat); particles.position.set(0,-32.9,0); particles.visible=false; scene.add(particles);
let swirl=0;
function simParticles(dt){
  const f=Math.min(2.5, dt*60), damp=Math.pow(0.9, f), k=0.009*f, sw=0.0035*f*swirl, nz0=(0.00025+0.0025*swirl)*f; const t=clock.elapsedTime;
  for(let i=0;i<N;i++){
    const ix=i*3, iy=ix+1, iz=ix+2;
    const dx=pTarget[ix]-pPos[ix], dy=pTarget[iy]-pPos[iy], dz=pTarget[iz]-pPos[iz];
    const sx=-pPos[iz]*sw, sz=pPos[ix]*sw;   // swirl around the y axis while reshaping
    const nx=Math.sin(t*1.3+i*0.013)*nz0, ny=Math.cos(t*0.9+i*0.021)*nz0, nzv=Math.sin(t*1.1+i*0.017)*nz0;
    pVel[ix]=pVel[ix]*damp + dx*k + sx + nx;
    pVel[iy]=pVel[iy]*damp + dy*k + ny;
    pVel[iz]=pVel[iz]*damp + dz*k + sz + nzv;
    pPos[ix]+=pVel[ix]*f; pPos[iy]+=pVel[iy]*f; pPos[iz]+=pVel[iz]*f;
    const sp=Math.sqrt(pVel[ix]*pVel[ix]+pVel[iy]*pVel[iy]+pVel[iz]*pVel[iz]);
    pSpd[i]=Math.min(1, sp*7.0);
  }
  pGeo.attributes.position.needsUpdate=true; pGeo.attributes.aSpeed.needsUpdate=true;
}
function setShape(name){
  if(!shapes[name] || pTarget===shapes[name]) return;
  pTarget=shapes[name]; swirl=1.0; gsap.to({v:swirl},{v:0,duration:1.6,ease:'power2.out',onUpdate:function(){ swirl=this.targets()[0].v; }});
  if(audioOn&&audio) audio.blip(660+Math.random()*300);
}
let selectedLink=null;
const linkEls=[...$('links').querySelectorAll('a')];
function restShape(){ return selectedLink ? selectedLink.dataset.shape : 'cloud'; }
function selectLink(a){
  selectedLink=a; linkEls.forEach(x=>x.classList.toggle('sel',x===a));
  const info=$('linkInfo');
  if(a){ $('linkDesc').textContent=a.dataset.desc; $('linkOpen').href=a.href; $('linkOpen').textContent='Open '+a.textContent; info.classList.add('on'); }
  else info.classList.remove('on');
  setShape(restShape());
}
linkEls.forEach(a=>{
  a.addEventListener('mouseenter',()=>setShape(a.dataset.shape));
  a.addEventListener('focus',()=>setShape(a.dataset.shape));
  a.addEventListener('click',e=>{
    if(selectedLink!==a){ e.preventDefault(); selectLink(a); }   // first click selects, second opens
  });
});
$('links').addEventListener('mouseleave',()=>setShape(restShape()));

/*  shards: thin plates drifting in a helix around the arm */
const spine=new THREE.Group(); scene.add(spine); spine.visible=false;
const vertebrae=[];
(function(){
  const shardGeo=new THREE.BoxGeometry(0.52,0.3,0.02), shardEdges=new THREE.EdgesGeometry(shardGeo);
  const shardMat=new THREE.MeshPhysicalMaterial({color:0x161a1d, metalness:0.2, roughness:0.3, clearcoat:0.6, transparent:true, opacity:0.75});
  const shardLine=new THREE.LineBasicMaterial({color:0xe5383b, transparent:true, opacity:0.5});
  for(let i=0;i<44;i++){
    const a=i*0.9, r=2.4+((i*37)%100)/100*2.6, y=-1.5-((i*53)%360)/360*15;
    const m=new THREE.Mesh(shardGeo, shardMat); m.position.set(Math.cos(a)*r, y, Math.sin(a)*r); m.rotation.set(((i*11)%100)/100*0.8-0.4, a+Math.PI/2, ((i*7)%100)/100*0.6-0.3);
    m.add(new THREE.LineSegments(shardEdges, shardLine)); m.userData={y, ph:i*0.7};
    spine.add(m); vertebrae.push({shard:m});
  }
})();
function updateSpine(t, on, open){
  spine.visible = on>0.001;
  if(!spine.visible) return;
  spine.userData.extra = (spine.userData.extra||0) + open*0.004;
  spine.rotation.y = -state.spiral*0.55 + t*0.02 + spine.userData.extra;
  vertebrae.forEach(v=>{ const m=v.shard; m.position.y = m.userData.y + Math.sin(t*0.5+m.userData.ph)*0.18; m.rotation.x += 0.0015; });
}

/*  living background: slow nebula grain in the brand colours */
const bgU={ uTime:{value:0}, uBase:{value:new THREE.Color(0x0b090a)}, uTint:{value:new THREE.Color(0x3a0c0e)}, uTint2:{value:new THREE.Color(0x1b1b22)}, uDark:{value:1}, uBurst:{value:0}, uMouse:{value:new THREE.Vector2(0,0)}, uStir:{value:0}, uLift:{value:0} };
const bgMat=new THREE.ShaderMaterial({ uniforms:bgU, side:THREE.BackSide, depthWrite:false, depthTest:false, fog:false,
  vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:`varying vec3 vP; uniform float uTime,uDark,uBurst,uStir,uLift; uniform vec3 uBase,uTint,uTint2; uniform vec2 uMouse;
    float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float a=0.5,s=0.0; for(int k=0;k<5;k++){ s+=a*n2(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
    void main(){
      vec3 d=normalize(vP);
      vec2 uv=vec2(atan(d.z,d.x)*0.9, d.y*1.6);
      vec3 c=uBase; bool dk=uDark>0.5;
      vec2 st=uv+uMouse*vec2(0.12,-0.08)*uStir;
      vec2 q=vec2(fbm(st*1.8+uTime*0.015), fbm(st*1.8+vec2(5.2,1.3)-uTime*0.01));
      vec2 r=vec2(fbm(st*1.8+4.0*q+vec2(1.7,9.2)+uTime*(0.02+uStir*0.08)), fbm(st*1.8+4.0*q+vec2(8.3,2.8)-uTime*(0.015+uStir*0.06)));
      float f=fbm(st*1.8+4.0*r);
      float ink=smoothstep(0.4,0.8,f);
      float tendril=pow(fbm(st*6.5+7.0*r+vec2(uTime*0.025,-uTime*0.015)),2.6)*0.55;
      float drop=uBurst*exp(-length(vec2(d.x,d.y*1.6)+vec2(-uMouse.x*0.3,uMouse.y*0.3))*1.4)*smoothstep(0.2,0.7,f);
      float sheen=pow(max(0.0,1.0-abs(d.y-0.15)*3.0),3.0)*0.08;   // a faint light on the surface of the water, far away
      if(dk){ c += uTint*(ink*1.45+tendril*0.9+drop*1.2) + vec3(0.05)*pow(length(r),2.0) + vec3(0.25,0.08,0.09)*sheen; }
      else { c -= vec3(0.012,0.07,0.075)*(ink*1.0+tendril*0.5+drop*0.6); c -= vec3(0.025)*pow(length(r),2.0); }
      gl_FragColor=vec4(c,1.0);
    }`});
const bgDome=new THREE.Mesh(new THREE.SphereGeometry(180,48,24), bgMat); bgDome.renderOrder=-10; bgDome.frustumCulled=false; scene.add(bgDome);
scene.background=null;
function glossFloor({y=-0.62, base=0x0a0809, blur=1.2, ripple=1.0, strength=0.9, fade=0.045}={}){
  
  const r=new Reflector(new THREE.PlaneGeometry(160,160),{clipBias:0.003,textureWidth:1024,textureHeight:1024,color:0xffffff});
  const u={ tDiffuse:{value:r.material.uniforms.tDiffuse.value}, textureMatrix:{value:r.material.uniforms.textureMatrix.value}, uBase:{value:new THREE.Color(base)}, uDeep:{value:new THREE.Color(base).multiplyScalar(0.55)}, uTime:{value:0}, uBlur:{value:blur}, uRipple:{value:ripple}, uStrength:{value:strength}, uFade:{value:fade}, uRes:{value:new THREE.Vector2(1024,1024)}, uLight:{value:new THREE.Vector3(2.5,8.5,3.5).normalize()}, uSpec:{value:1.0} };
  r.material=new THREE.ShaderMaterial({ uniforms:u, transparent:false,
    vertexShader:`uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vUv=textureMatrix*vec4(position,1.0); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform sampler2D tDiffuse; uniform vec3 uBase,uDeep,uLight; uniform float uTime,uBlur,uRipple,uStrength,uFade,uSpec; uniform vec2 uRes; varying vec4 vUv; varying vec3 vW;
      float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
      // a slow water surface: two gentle swells plus fine wind texture, as a height field → normal
      float hgt(vec2 p){ return sin(p.x*0.9+p.y*0.4+uTime*0.09)*0.5 + sin(p.y*1.3-p.x*0.3-uTime*0.07)*0.35 + (n2(p*2.2+uTime*0.04)-0.5)*0.5; }
      void main(){
        vec2 uv=vUv.xy/vUv.w;
        float d=length(vW.xz);
        vec2 p=vW.xz; float e=0.08;
        vec3 N=normalize(vec3(hgt(p-vec2(e,0.0))-hgt(p+vec2(e,0.0)), 2.2, hgt(p-vec2(0.0,e))-hgt(p+vec2(0.0,e))));
        vec2 rip=N.xz*0.012*uRipple;
        vec2 px=uBlur/uRes; vec3 r=vec3(0.0); float wsum=0.0;
        for(int i=-2;i<=2;i++){ for(int j=-2;j<=2;j++){ float w=1.0/(1.0+float(i*i+j*j)); r+=texture2D(tDiffuse, uv+rip+vec2(float(i),float(j))*px*(1.0+d*0.1)).rgb*w; wsum+=w; } }
        r/=wsum;
        vec3 V=normalize(cameraPosition-vW);
        float fres=pow(1.0-max(dot(V,N),0.0),2.2);
        float k=mix(0.14,0.95,fres)*uStrength*exp(-d*uFade);
        // looking down into clear water: the bed darkens with distance; a little of the sky scatters in it
        vec3 bed=mix(uBase, uDeep, smoothstep(0.0,18.0,d));
        vec3 c=mix(bed, r, k);
        // sun glints riding the swells
        vec3 Hh=normalize(uLight+V); float spec=pow(max(dot(N,Hh),0.0),140.0)*uSpec*(0.35+0.65*fres);
        c += vec3(1.0,0.92,0.9)*spec*0.6;
        // faint caustic shimmer on the bed, only where it is shallow and visible
        float caus=pow(n2(p*3.0+uTime*0.05)*n2(p*2.3-uTime*0.04),2.0)*(1.0-k)*0.18*uSpec;
        c += uBase*caus*2.5;
        gl_FragColor=vec4(c,1.0);
      }` });
  r.rotation.x=-Math.PI/2; r.position.y=y; r.userData.u=u; scene.add(r); return r;
}

const bgFloor=glossFloor({y:-0.62, base:0x0d0a0b, blur:1.3, ripple:0.8, strength:0.9, fade:0.04});
ANAMORPHIC=2.2;
let floorDark=true;
function bgExtraTheme(dark){ floorDark=dark; if(bgFloor){ const u=bgFloor.userData.u; u.uBase.value.setHex(dark?0x0d0a0b:0xf1eaea); u.uDeep.value.setHex(dark?0x050304:0xe4d9d9); u.uBlur.value=dark?1.3:0.5; u.uStrength.value=dark?0.9:1.0; u.uSpec.value=dark?1.0:0.0; u.uFade.value=dark?0.04:0.02; } scene.fog.color.setHex(dark?0x0b090a:0xf6f2f2); }   // light mode: a still mirror, not water
function bgExtraUpdate(p,t){ if(bgFloor){ bgFloor.visible = p<0.23; bgFloor.userData.u.uTime.value=t; bgFloor.userData.u.uRipple.value = floorDark ? 0.7+Math.min(0.3,state.mspeed*0.3)+bgU.uBurst.value*0.4 : 0.0; } }


/*  nano swarm: a field of tiny bots that reverberates when a chapter opens */
const N2 = isTouch ? 1800 : 3600;
const sPos=new Float32Array(N2*3), sSeed=new Float32Array(N2);
for(let i=0;i<N2;i++){
  let x,y,z; do{ x=(Math.random()-0.5)*22; y=1-Math.random()*38; z=(Math.random()-0.5)*16-3; } while(Math.hypot(x,z)<2.3 || z>5.5);
  sPos[i*3]=x; sPos[i*3+1]=y; sPos[i*3+2]=z; sSeed[i]=Math.random();
}
const sGeo=new THREE.BufferGeometry(); sGeo.setAttribute('position',new THREE.BufferAttribute(sPos,3)); sGeo.setAttribute('aSeed',new THREE.BufferAttribute(sSeed,1));
const swarmMat=new THREE.ShaderMaterial({
  uniforms:{ uTime:{value:0}, uAmp:{value:0}, uOrigin:{value:new THREE.Vector3(0,0,-12)}, uPR:{value:Math.min(window.devicePixelRatio,2)}, uOpacity:{value:0},
    uDim:{value:new THREE.Color(0xb1a7a6)}, uHot:{value:new THREE.Color(0xe5383b)}, uWhite:{value:new THREE.Color(0xf5f3f4)} },
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  vertexShader:`attribute float aSeed; uniform float uTime,uAmp,uPR; uniform vec3 uOrigin; varying float vB; varying float vSeed;
    void main(){
      vSeed=aSeed;
      vec3 p=position;
      vec3 rel=p-uOrigin; float d=length(rel); vec3 dir=rel/max(d,0.001);
      // two concentric wave trains leaving the origin, sharpened into crests
      float w1=sin(d*1.7-uTime*5.5), w2=sin(d*0.9-uTime*2.6+1.3);
      float crest=pow(max(w1,0.0),4.0)*0.8+pow(max(w2,0.0),3.0)*0.5;
      float reach=exp(-d*0.045);
      float env=uAmp*reach;
      p+=dir*crest*env*0.5;
      // idle: bots twitch in place
      p+=vec3(sin(uTime*0.35+aSeed*40.0),cos(uTime*0.3+aSeed*31.0),sin(uTime*0.32+aSeed*23.0))*0.22;   // ink: motes drift in slow eddies
      vB=0.2+crest*env*1.2;
      vec4 mv=modelViewMatrix*vec4(p,1.0);
      gl_PointSize=(1.5+aSeed*1.8+crest*env*4.0)*uPR*(26.0/-mv.z);
      gl_Position=projectionMatrix*mv;
    }`,
  fragmentShader:`varying float vB; varying float vSeed; uniform float uOpacity,uTime; uniform vec3 uDim,uHot,uWhite;
    void main(){
      vec2 q=gl_PointCoord-0.5; float r2=dot(q,q); if(r2>0.25) discard;
      // a soft dust mote: gaussian falloff, no hard edge
      float a=exp(-r2*14.0);
      float glint=0.5+0.5*sin(uTime*(0.6+vSeed*0.8)+vSeed*40.0);                 // slow, individual shimmer
      vec3 c=mix(uDim,uHot,smoothstep(0.4,1.2,vB)); c=mix(c,uWhite,smoothstep(1.3,2.2,vB));
      gl_FragColor=vec4(c, a*uOpacity*(0.18+0.22*glint)*min(1.0,0.45+vB*0.45));
    }`
});
const swarm=new THREE.Points(sGeo,swarmMat); swarm.visible=false; swarm.frustumCulled=false; scene.add(swarm);
const swarmOrigin=new THREE.Vector3(0,0,-12);
// shockwave rings: dashed circles that face the camera and race outward from the orb
const rings=[]; (function(){
  const pts=[]; for(let i=0;i<=96;i++){ const a=i/96*Math.PI*2; pts.push(new THREE.Vector3(Math.cos(a),Math.sin(a),0)); }
  const geo=new THREE.BufferGeometry().setFromPoints(pts);
  for(let k=0;k<7;k++){ const m=new THREE.Line(geo, new THREE.LineDashedMaterial({color:0xe5383b, dashSize:0.09, gapSize:0.05, transparent:true, opacity:0})); m.computeLineDistances(); m.visible=false; scene.add(m); rings.push({m, life:-1}); }
})();
function spawnRing(origin, strength=1){
  const r=rings.find(r=>r.life<0) || rings[0];
  r.life=0; r.strength=strength; r.m.position.copy(origin); r.m.visible=true; r.m.scale.setScalar(0.3);
}
function updateRings(dt){
  rings.forEach(r=>{
    if(r.life<0) return;
    r.life+=dt; const L=1.7;
    if(r.life>L){ r.life=-1; r.m.visible=false; return; }
    const k=r.life/L; const sc=0.3+Math.pow(k,0.55)*8.5*r.strength;
    r.m.scale.setScalar(sc); r.m.material.opacity=(1-k)*(1-k)*0.9*r.strength; r.m.material.dashSize=0.09*sc*0.35; r.m.material.gapSize=0.05*sc*0.35;
    r.m.lookAt(camera.position);
  });
}
let heartbeat=0;

/*  drag to orbit (hero) and drag to spin (open chapter) */
let dragX=0, dragY=0, dragT=0;
W('pointerdown',e=>{
  if(isTouch || (e.target.closest && e.target.closest('.ui, .pill, .nav'))) return;
  state.drag=true; state.dragDist=0; dragX=e.clientX; dragY=e.clientY; dragT=performance.now(); canvas.classList.add('grabbing');
});
W('pointermove',e=>{
  if(!state.drag) return;
  const dx=e.clientX-dragX, dy=e.clientY-dragY; dragX=e.clientX; dragY=e.clientY; state.dragDist+=Math.abs(dx)+Math.abs(dy);
  if(openIdx>=0){ state.spin+=dx*0.012; }
  else { state.yawT+=dx*0.0065; state.pitchT=THREE.MathUtils.clamp(state.pitchT+dy*0.004,-0.25,0.55); }
});
const endDrag=()=>{ if(state.drag){ state.drag=false; canvas.classList.remove('grabbing'); } };
W('pointerup',endDrag); W('pointercancel',endDrag); W('blur',endDrag);

/*  kinetic type: letters that answer scroll and cursor */
function splitLetters(el){
  const walk=(node)=>{ [...node.childNodes].forEach(n=>{ if(n.nodeType===3){ const frag=document.createDocumentFragment(); [...n.textContent].forEach(ch=>{ const sp=document.createElement('span'); sp.className='k'; sp.textContent=ch===' '?'\u00a0':ch; frag.appendChild(sp); }); n.replaceWith(frag); } else if(n.nodeType===1 && n.tagName!=='BR') walk(n); }); };
  walk(el); return [...el.querySelectorAll('.k')];
}
const heroLetters=splitLetters(root.querySelector('#hero h1'));
const footLetters=splitLetters(root.querySelector('.footer .fhead'));
function kinetic(letters, t, vS, mx, my, active){
  if(!active){ letters.forEach(l=>l.style.transform=''); return; }
  const sk=THREE.MathUtils.clamp(vS*2600, -22, 22);
  letters.forEach((l,i)=>{
    const r=l.getBoundingClientRect(); const cx=(r.left+r.width/2)/window.innerWidth*2-1, cy=(r.top+r.height/2)/window.innerHeight*2-1;
    const d=Math.hypot(cx-mx, cy-my); const lift=Math.max(0,1-d*2.2)*-10;
    const wave=Math.sin(t*1.6+i*0.55)*1.2;
    l.style.transform=`translateY(${(lift+wave).toFixed(1)}px) skewX(${sk.toFixed(1)}deg) scaleY(${(1+Math.abs(sk)*0.006).toFixed(3)})`;
  });
}

/*  pill nav: squashes and stretches with scroll velocity */
const pillEl=$('pill');
function pillReact(vS){
  const v=THREE.MathUtils.clamp(vS*60, -1, 1), a=Math.abs(v);
  pillEl.style.transform=`translateX(-50%) translateY(${(v*10).toFixed(1)}px) scale(${(1+a*0.22).toFixed(3)}, ${(1-a*0.18).toFixed(3)})`;
  pillEl.style.filter = a>0.05 ? `blur(${(a*1.6).toFixed(2)}px)` : '';
}

/*  scroll + interaction state */
const state = { p:0, pTarget:0, mx:0, my:0, mxs:0, mys:0, glitch:0, aberr:0, explode:0, skel:0, hover:false, ready:false, venture:-1, flat:1, orbHover:-1, armK:0, lift:0, scanning:false, spiral:0, loading:true, intro:1, yaw:0, yawT:0, pitch:0, pitchT:0, drag:false, dragDist:0, mspeed:0, prevP:0, vS:0, spin:0 };
const raycaster = new THREE.Raycaster(); const ndc = new THREE.Vector2();
const track=$('track');
function readScroll(){ const max=document.documentElement.scrollHeight-window.innerHeight; state.pTarget = max>0 ? Math.min(1,Math.max(0,window.scrollY/max)) : 0; }
W('scroll', readScroll, {passive:true});
W('mousemove', e=>{ const nx=(e.clientX/window.innerWidth-0.5)*2, ny=(e.clientY/window.innerHeight-0.5)*2; state.mspeed=Math.min(1, state.mspeed+Math.hypot(nx-state.mx, ny-state.my)*3.5); state.mx=nx; state.my=ny; }, {passive:true});
W('touchmove', e=>{ const t=e.touches[0]; if(!t) return; const nx=(t.clientX/window.innerWidth-0.5)*2, ny=(t.clientY/window.innerHeight-0.5)*2; state.mspeed=Math.min(1, state.mspeed+Math.hypot(nx-state.mx, ny-state.my)*2); state.mx=nx; state.my=ny; }, {passive:true});
function scrollToP(p){ const max=document.documentElement.scrollHeight-window.innerHeight; window.scrollTo({top:p*max, behavior:'smooth'}); }
root.querySelectorAll('#pill button').forEach(b=>b.addEventListener('click',()=>scrollToP(parseFloat(b.dataset.p))));
$('home').addEventListener('click',e=>{e.preventDefault();scrollToP(0);});
$('toGestures').addEventListener('click',()=>scrollToP(0.23));
$('toTop').addEventListener('click',e=>{e.preventDefault();scrollToP(0);});

function resize(){
  const w=window.innerWidth, h=window.innerHeight;
  narrow = w<760;
  CAP_BASE.forEach((b,i)=>{ CAP_POS[i][0]= narrow? 0 : b[0]; CAP_POS[i][1]= narrow? b[1]+2.0 : b[1]; CAP_POS[i][2]= narrow? 3.2 : b[2]; capsules[i].g.position.set(CAP_POS[i][0],CAP_POS[i][1],CAP_POS[i][2]); });
  particles.scale.setScalar(narrow?0.5:1);
  renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
  const pr=renderer.getPixelRatio(); rt.setSize(w*pr,h*pr); postU.uAspect.value=w/h;
  const hw=Math.max(1,Math.floor(w*pr/2)), hh=Math.max(1,Math.floor(h*pr/2)); rtA.setSize(hw,hh); rtB.setSize(hw,hh); rtC.setSize(hw,hh); blurMat.uniforms.uRes.value.set(hw,hh);
}
W('resize', resize); resize();

/*  UI stage helpers */
const heroEl=$('hero'), cueEl=$('cue'), ventureEl=$('venture'), footerEl=$('footer'), indexBtns=[...root.querySelectorAll('#pill button')];
let heroOn=false, footOn=false, usesOn=false; const usesEl=$('uses');
function showVenture(i){
  if(i===state.venture) return;
  state.venture=i;
  if(i<0){ ventureEl.classList.remove('on'); return; }
  const v=VENTURES[i];
  ventureEl.classList.add('on');
  $('vNum').textContent = String(i+1).padStart(2,'0')+' / 0'+NCH;
  $('vTag').textContent = v.tag;
  scramble($('vName'), v.name, 0.8);
  scramble($('vDesc'), v.pitch, 1.0);

  state.glitch=Math.max(state.glitch,0.9); state.aberr=Math.max(state.aberr,0.9);
  if(audioOn&&audio){ audio.tick(); setTimeout(()=>audio.blip(520),90); }
}

/*  camera choreography */
const camPos=new THREE.Vector3(), camLook=new THREE.Vector3(), lookS=new THREE.Vector3(0,0.3,0), tmpV=new THREE.Vector3();
const ease=(a,b,t)=>THREE.MathUtils.lerp(a,b,THREE.MathUtils.smoothstep(t,0,1));
const palmW=new THREE.Vector3(), tipW=new THREE.Vector3(), droneTarget=new THREE.Vector3(), takeoffFrom=new THREE.Vector3();
const openDir=new THREE.Vector3(0,0,1), openRight=new THREE.Vector3(1,0,0);
let lastFrameT=0;
function choreo(p, t){
  const S1=0.14, S2=0.23, S3=0.7, S4=0.77, U2=0.9;
  const dt=Math.min(0.05, t-lastFrameT); lastFrameT=t;
  let groundFade=1, fog=0.038, capOn=0, partOn=0;
  let armK=0, lift=0, spiral=0;             // armK: 0 = cradling on the palm, 1 = raised open palm; lift: drone take-off progress; spiral: turn of the arm during the descent
  const heroPivot=V3(0.4,1.25,0.3), vertPivot=V3(narrow?0:-0.7,-5.2,0);
  if(p<S1){ // hero: the drone rests on the hand
    const k=p/S1;
    const ang=THREE.MathUtils.lerp(-0.25,0.35,k)+state.yaw, r=THREE.MathUtils.lerp(narrow?13.5:10.2,narrow?12:9.2,k), h=THREE.MathUtils.lerp(narrow?2.8:2.8,narrow?3.6:3.6,k)+state.pitch*3;
    camPos.set(Math.sin(ang)*r, h, Math.cos(ang)*r+0.5); camLook.set(narrow?0.4:-0.4, narrow?-0.6:1.0, 0.2);
  } else if(p<S2){ // take-off: the hand rises into an open palm, the drone lifts away
    const k=(p-S1)/(S2-S1), e=THREE.MathUtils.smoothstep(k,0,1);
    armK=THREE.MathUtils.smoothstep(k,0.05,0.75); lift=THREE.MathUtils.smoothstep(k,0.15,1);
    const ang=0.35+e*0.3, r=THREE.MathUtils.lerp(9.2,10.5,e), h=THREE.MathUtils.lerp(3.6,1.5,e);
    camPos.set(Math.sin(ang)*r, h, Math.cos(ang)*r); camLook.set(-0.9, THREE.MathUtils.lerp(1.0,-1.6,e), 0);
    tmpV.set(0,-1.9,10.6); camPos.lerp(tmpV, THREE.MathUtils.smoothstep(k,0.5,1));
    camLook.lerp(V3(0,-3.0,0), THREE.MathUtils.smoothstep(k,0.5,1));
    groundFade = 1-THREE.MathUtils.smoothstep(k,0.3,0.8);
    fog = THREE.MathUtils.lerp(0.038,0.06,e);
    capOn = THREE.MathUtils.smoothstep(k,0.7,1);
    const bell=Math.sin(k*Math.PI); state.glitch=Math.max(state.glitch,bell*0.7); state.aberr=Math.max(state.aberr,bell*1.0);
  } else if(p<S3){ // descending the arm, chapters beside it, the drone holding station behind
    const k=(p-S2)/(S3-S2); armK=1; lift=1;
    const seg=Math.min(4,Math.floor(k*5)), f=k*5-seg, ke=(seg+f*f*(3-2*f))/5;
    const y=THREE.MathUtils.lerp(-1.9,-10.9,ke);
    spiral = ke*Math.PI*2.4 + k*0.3;
    camPos.set(Math.sin(k*Math.PI*2.5)*0.4, y, 10.6+Math.cos(k*Math.PI*1.7)*0.3);
    camLook.set(0, y-(narrow?0.6:1.2), 0);
    groundFade=0; fog=0.06; capOn=1;
  } else if(p<S4){ // past the shoulder, into the swarm
    const k=(p-S3)/(S4-S3), e=THREE.MathUtils.smoothstep(k,0,1); armK=1; lift=1; spiral=Math.PI*2.4+0.3+e*1.2;
    camPos.set(0, THREE.MathUtils.lerp(-10.9,-22.2,e), THREE.MathUtils.lerp(10.6,7.5,e)); camLook.set(0, THREE.MathUtils.lerp(-12.1,-25.0,e), 0);
    groundFade=0; fog=THREE.MathUtils.lerp(0.06,0.025,e); capOn=1-e; partOn=e;
  } else if(p<U2){ // use cases: a slow drift through the swarm while the cards read
    const k=(p-S4)/(U2-S4); armK=1; lift=1; spiral=Math.PI*2.4+1.5+k*0.9;
    camPos.set(Math.sin(k*Math.PI)*0.5, THREE.MathUtils.lerp(-22.2,-30.5,k), 7.5); camLook.set(0, THREE.MathUtils.lerp(-25.0,-33.3,k), 0);
    groundFade=0; fog=0.025; capOn=0; partOn=1;
  } else {
    camPos.set(Math.sin(t*0.15)*0.3,-30.5,7.5); camLook.set(0,-33.3,0);
    groundFade=0; fog=0.025; capOn=0; partOn=1; armK=1; lift=1; spiral=Math.PI*2.4+2.4+t*0.05;
  }
  updateSpine(t, p>=S1 ? 1 : 0, openIdx>=0 ? THREE.MathUtils.smoothstep(openO.v,0,1) : 0);
  bgU.uTime.value=t; bgU.uBurst.value*=0.965; bgU.uMouse.value.set(state.mxs,state.mys); bgU.uStir.value += (Math.min(1,state.mspeed*1.5)-bgU.uStir.value)*0.08; bgU.uLift.value=state.lift;
  if(typeof bgExtraUpdate==='function') bgExtraUpdate(p,t);
  // orbit inertia: the drag eases out, and the view slowly drifts back toward the path
  state.yawT*=0.985; state.pitchT*=0.985; state.yaw+=(state.yawT-state.yaw)*0.08; state.pitch+=(state.pitchT-state.pitch)*0.08;
  // parallax
  state.mxs+=(state.mx-state.mxs)*0.05; state.mys+=(state.my-state.mys)*0.05;
  if(!isTouch){ camPos.x += state.mxs*0.6; camPos.y -= state.mys*0.35; }
  if(p<S1 && !reduced){ camPos.x += Math.sin(t*0.37)*0.05+Math.sin(t*0.91)*0.02; camPos.y += Math.sin(t*0.53)*0.035; camPos.z += Math.sin(t*0.29)*0.04; }   // handheld drift
  // loading: the drone alone in the dark, parts drifting home; then the camera eases out to the hero framing
  const intro = THREE.MathUtils.smoothstep(state.intro,0,1);
  if(intro>0.001){
    tmpV.set(Math.sin(t*0.25)*1.2, 0.9+Math.sin(t*0.4)*0.1, 4.8+Math.cos(t*0.25)*0.4); camPos.lerp(tmpV, intro);
    tmpV.set(0,0.75,0); camLook.lerp(tmpV, intro);
  }
  camera.position.lerp(camPos, state.loading?0.06:0.12); lookS.lerp(camLook, state.loading?0.06:0.12); camera.lookAt(lookS);

  // ---- the arm: pose, orientation, fingers
  state.armK += (armK-state.armK)*0.08;
  const ak=state.armK;
  state.spiral += (spiral-state.spiral)*0.08;
  if(M.ok){
    armPivot.visible = intro<0.995;
    M.armSolid.forEach(m=>{ m.opacity=Math.min(m.opacity, 1-intro); });   // the hand fades in under the drone as the intro ends
    armPivot.quaternion.copy(qHero).slerp(qVert, ak);
    armPivot.quaternion.premultiply(_q.setFromAxisAngle(_up, state.spiral*ak));
    armPivot.position.copy(heroPivot).lerp(vertPivot, ak);
    armPivot.rotation.x += (ak<0.5 ? state.mys*0.03 : 0); 
    armPivot.position.y += Math.sin(t*0.9)*0.05*(1-ak);
    // fingers: cradling the drone (slight curl) → flat open palm (slight extension)
    poseFingers(THREE.MathUtils.lerp(-0.35, -0.9, ak), t, 0.09 + (1-ak)*0.05);   // idle flex: a little more while it holds the drone
    armPivot.updateMatrixWorld(true);
    palmW.copy(M.palmLocal); armPivot.localToWorld(palmW);
  } else { armPivot.visible=false; palmW.set(0,0.28,0); }

  // ---- the drone: on the palm, then airborne behind the arm
  if(lift>0.05 && state.lift<=0.05) bgU.uBurst.value=Math.max(bgU.uBurst.value,0.8);
  state.lift += (lift-state.lift)*0.08;
  const lk=state.lift;
  if(lk<0.001) takeoffFrom.copy(palmW);
  const camY=camera.position.y;
  droneTarget.set(-4.6+Math.sin(t*0.3)*1.0, Math.min(-1.0, camY+1.3)+Math.sin(t*0.9)*0.25, -6.5-Math.cos(t*0.3)*1.5);
  if(lk<=0.001){ drone.position.copy(palmW); drone.position.y += Math.sin(t*1.4)*0.12 + Math.sin(t*2.3)*0.04; tmpV.set(0,0.75,0); drone.position.lerp(tmpV, intro); drone.rotation.set(Math.sin(t*0.9)*0.03, 0.55+state.mxs*0.08+Math.sin(t*0.5)*0.05, Math.sin(t*0.7)*0.03); }
  else { drone.position.copy(takeoffFrom).lerp(droneTarget, lk); drone.position.y += Math.sin(lk*Math.PI)*2.2; drone.rotation.set(-0.08*Math.sin(lk*Math.PI)+Math.sin(t*0.7)*0.03, 0.55+lk*1.2+t*0.05, Math.sin(t*0.5)*0.04); }
  const dsc = DS*(1+lk*0.5); drone.scale.setScalar(dsc/DS);
  drone.visible = M.ok || !!rig;
  ground.visible = false; horizon.visible=false; shadowCatcher.visible=false;   // no floor: the hand floats in the space
  key.target.position.copy(armPivot.position); key.target.position.y += ak*-4; key.position.copy(key.target.position).add(keyOffset); key.position.x += state.mxs*2.5; key.position.y -= state.mys*1.2; key.target.updateMatrixWorld();
  groundU.uFade.value=groundFade; scene.fog.density=fog;

  // animation mix: still on the palm, props spinning once it lifts; a slow idle lift-apart while it rests
  let ex=0;
  if(p<S1){ const cyc=(t%30)/30; ex = THREE.MathUtils.smoothstep(cyc,0.15,0.42)*(1-THREE.MathUtils.smoothstep(cyc,0.55,0.82)); ex*=0.3; }
  state.explode += (ex-state.explode)*0.06;
  if(M.ok){
    const expDur=M.actExp.getClip().duration;
    if(state.loading){
      M.actHover.setEffectiveWeight(0); M.actExp.setEffectiveWeight(1);
      const target=(1-THREE.MathUtils.smoothstep(loaderProgress,0,1))*expDur*0.92;
      M.actExp.time += (target-M.actExp.time)*0.08;                    // parts drift home as the page loads
      drone.rotation.set(0.12+Math.sin(t*0.5)*0.05, t*0.22, Math.sin(t*0.4)*0.03);
      M.mixer.update(0);
    } else {
      const spinW=(0.6+0.4*THREE.MathUtils.smoothstep(lk,0,0.35))*(1-intro);   // props spin up as the intro ends
      M.actHover.setEffectiveWeight(spinW); M.actExp.setEffectiveWeight(1-spinW);
      M.actExp.time += ((state.explode*expDur*0.55)-M.actExp.time)*0.1;
      M.mixer.update(dt*(0.7+spinW*0.3));
    }
    if(M.miniMixer && M.miniAct){ const P=26, c=(t%P); const ph = c<7?0 : c<14?THREE.MathUtils.smoothstep(c,7,14) : c<19?1 : 1-THREE.MathUtils.smoothstep(c,19,26); M.miniAct.time = ph*M.miniAct.getClip().duration*0.9; M.miniMixer.update(0); }
  }
  // hover → skeleton: the drone's wireframe, or the hand's
  let hov=false;
  if(state.ready && !isTouch && p<S2 && M.ok){
    ndc.set(state.mx, -state.my); raycaster.setFromCamera(ndc, camera);
    hov = raycaster.intersectObjects([M.droneHit, M.armHit], false).length>0;
  } else if(state.ready && !isTouch && p<S2 && hit){ ndc.set(state.mx,-state.my); raycaster.setFromCamera(ndc,camera); hov=raycaster.intersectObject(hit,false).length>0; }
  state.spin*=0.9;
  if(hov!==state.hover){ state.hover=hov; $('hudMode').textContent = hov ? 'SKELETON\u00a0\u00a0VIEW' : 'GESTURE\u00a0\u00a0TRACKING'; if(hov && audioOn && audio) audio.tick(); }
  state.skel += ((hov?1:0)-state.skel)*0.12;
  if(state.ready && !state.scanning) setDroneState({solid:1, skel:state.skel});
  if(!M.ok && rig){ rig.props.forEach((pr,i)=>{ pr.g.rotation.y += (0.55+i*0.03)*pr.dirSign; }); }
  // HUD telemetry
  if((t*10|0)%2===0 && heroOn){ $('hudAlt').textContent=(0.42+lk*3.4+Math.sin(t*1.4)*0.05).toFixed(2); $('hudVel').textContent=(Math.abs(state.mx-state.mxs)*8+lk*1.2).toFixed(2); $('hudMode').textContent = hov ? 'SKELETON\u00a0\u00a0VIEW' : (lk>0.2 ? 'HOLD_POSITION' : 'GESTURE\u00a0\u00a0TRACKING'); }

  // capsules
  let nearest=-1, nd=1e9;
  // orb detail view: dolly into the chosen orb and let its shell burst outward
  const ov = openIdx>=0 ? THREE.MathUtils.smoothstep(openO.v,0,1) : 0;
  if(ov>0){
    const c=capsules[openIdx], cp=c.g.position;
    tmpV.copy(cp).addScaledVector(openRight, narrow?0:1.0); tmpV.y += narrow?0.5:0;        // look a little to the right of the orb so it sits left of the panel
    camLook.lerp(tmpV, ov);
    tmpV.addScaledVector(openDir, 4.4); tmpV.y += narrow?0.5:0.05; camPos.lerp(tmpV, ov);
    camera.position.lerp(camPos, 0.12); lookS.lerp(camLook, 0.12); camera.lookAt(lookS);
  }
  // orbit the orbs around the arm with the spiral; orb i sits at its home angle exactly when the descent dwells on it
  (function(){ const R = narrow?2.9:3.7, home = narrow?Math.PI/2:Math.PI; const n=capsules.length-1;
    capsules.forEach(c=>{ const i=c.i, ki=i/n, atDwell = ki*Math.PI*2.4 + ki*0.3; const a = home - atDwell + state.spiral;
      c.g.position.x = Math.cos(a)*R; c.g.position.z = Math.sin(a)*R; }); })();
  capsules.forEach(c=>{
    c.g.visible = capOn>0.001;
    const rel = c.g.position.y - camera.position.y;  // negative when the orb is below the camera
    const d = Math.abs(rel+1.4) + (rel>2.5?50:0);
    if(d<nd){ nd=d; nearest=c.i; }
    const focus = 1-THREE.MathUtils.smoothstep(d,2.0,7);
    let pass = 1-THREE.MathUtils.smoothstep(rel,2.0,4.5);
    c.g.rotation.y += 0.004*c.spin*10 + 0.003; c.g.rotation.x = Math.sin(t*0.4+c.i)*0.18 + state.mys*0.1;
    c.g.rotation.z = state.mxs*0.08;
    const mine = c.i===openIdx ? ov : 0, others = openIdx>=0 && c.i!==openIdx ? ov : 0;
    if(c.i===openIdx) pass = Math.max(pass, 1);   // the open orb stays fully present even when the camera starts behind it
    const breath = 0.5+0.5*Math.sin(t*1.5+c.i*1.3), pz = 1 + breath*(0.02+focus*0.035) + (state.orbHover===c.i?0.06:0);   // a slow breath, a swell under the cursor
    c.shell.material.opacity = capOn*pass*(0.1+focus*0.16)*(1-mine)*(1-others);
    c.edges.material.opacity = capOn*pass*(0.16+focus*0.42)*(1+breath*0.35*focus+(state.orbHover===c.i?0.4:0))*(1-mine*0.92)*(1-others);
    c.shell.scale.setScalar(pz*(1+mine*0.8)); c.edges.scale.setScalar(pz*(1+mine*2.6));
    c.edges.rotation.y += mine*0.01;
    c.inner.visible = pass>0.05 && others<0.98;
    c.inner.scale.setScalar(c.userData.innerScale*(1+mine*0.45));
    c.inner.rotation.y += mine*0.01 + (c.i===openIdx ? state.spin*0.08 : 0);
    if(c.inner.userData.mini) c.inner.userData.mini.props.forEach((pr,k)=>pr.g.rotation.y += 0.5*(k%2?1:-1));
    c.inner.rotation.y = (c.i>=1&&c.i<=4 ? t*0.35 : Math.sin(t*0.6+c.i)*0.5) + state.mxs*0.3; c.inner.rotation.x = Math.sin(t*0.45+c.i)*0.12;
    const sc=(narrow?0.55:0.92)+focus*0.1; c.g.scale.setScalar(sc);
    c.g.position.y = CAP_POS[c.i][1] + Math.sin(t*0.9+c.i*1.7)*0.08;   // x/z come from the spiral above
  });
  const inVentures = p>=S2-0.02 && p<S3+0.02 && nd<5;
  if(openIdx<0) showVenture(inVentures?nearest:-1);
  // nano swarm: alive at a murmur while you fly past the orbs, reverberating hard when a chapter is open
  swarm.visible = capOn>0.001 || ov>0.001 || (p>=S4 && p<U2+0.02);
  if(swarm.visible){
    const src = openIdx>=0 ? capsules[openIdx].g.position : (nearest>=0 ? capsules[nearest].g.position : swarmOrigin);
    swarmOrigin.lerp(src, 0.08); swarmMat.uniforms.uOrigin.value.copy(swarmOrigin);
    const ampT = openIdx>=0 ? 1.0 : 0.16;
    swarmMat.uniforms.uAmp.value += (ampT-swarmMat.uniforms.uAmp.value)*(openIdx>=0?0.06:0.03);
    swarmMat.uniforms.uOpacity.value += (((capOn>0.001||(p>=S4&&p<U2+0.02))?1:ov)-swarmMat.uniforms.uOpacity.value)*0.08;
    swarmMat.uniforms.uTime.value = t;
    heartbeat += (t-(choreo.lastT||t)); choreo.lastT=t;
    if(openIdx>=0 && heartbeat>0.85){ heartbeat=0; spawnRing(capsules[openIdx].g.position, 0.6); if(audioOn&&audio) audio.tick(); }
  }
  updateRings(Math.min(0.05, t-(choreo.prevT||t))); choreo.prevT=t;
  // hover cursor on an orb
  if(openIdx<0 && inVentures && !isTouch && state.ready){ ndc.set(state.mx,-state.my); raycaster.setFromCamera(ndc,camera); const h=raycaster.intersectObjects(capsules.filter(c=>c.g.visible).map(c=>c.shell),false); state.orbHover = h.length? capsules.find(c=>c.shell===h[0].object).i : -1; } else state.orbHover=-1;
  canvas.classList.toggle('hand', state.hover || state.orbHover>=0);
  canvas.classList.toggle('grab', !state.drag && !isTouch && (p<S1 || openIdx>=0) && !state.hover && state.orbHover<0);

  // particles
  particles.visible = partOn>0.001;
  pMat.uniforms.uOpacity.value = partOn*(1-state.flat*0.6);
  if(particles.visible){ const flat = pTarget===shapes.cloud ? 1 : 0; state.flat += (flat-state.flat)*0.06; pMat.uniforms.uBoost.value = 1-state.flat*0.25; particles.rotation.y = (0.55 + Math.sin(t*0.12)*0.3)*(1-state.flat) + state.mxs*0.18; particles.rotation.x = 0.1 + 0.25*(1-state.flat) + state.mys*0.12; }

  // UI
  const wantHero = p<0.10, wantFoot = p>U2-0.02, wantUses = p>S4-0.02 && p<U2;
  if(wantUses!==usesOn){ usesOn=wantUses; usesEl.classList.toggle('on',usesOn); }
  if(wantHero!==heroOn){ heroOn=wantHero; heroEl.classList.toggle('on',heroOn&&state.ready); cueEl.classList.toggle('on',heroOn&&state.ready); $('hud').classList.toggle('on',heroOn&&state.ready); }
  if(wantFoot!==footOn){ footOn=wantFoot; footerEl.classList.toggle('on',footOn); if(footOn) setShape(restShape()); }
  const sec = p<S1 ? 0 : p<S4-0.02 ? 1 : p<U2-0.02 ? 2 : 3;
  indexBtns.forEach((b,i)=>b.classList.toggle('active',i===sec));
}

/*  orb detail: open / close */
let openIdx=-1; const openO={v:0}; const detailEl=$('detail');
function fillDetail(i){
  const v=VENTURES[i];
  $('dNum').textContent=String(i+1).padStart(2,'0')+' / 0'+NCH; $('dTag').textContent=v.tag; $('dName').textContent=v.name; $('dLead').textContent=v.lead;
  $('dList').innerHTML=''; v.bullets.forEach(b=>{ const li=document.createElement('li'); li.textContent=b; $('dList').appendChild(li); });
  $('dStatN').textContent=v.stat[0]; $('dStatL').textContent=v.stat[1]; $('dLink').href=v.link;
  $('dNext').textContent = i<NCH-1 ? 'Next chapter' : 'Back to the first';
}
function openOrb(i){
  if(openIdx>=0 || i<0) return;
  openIdx=i; fillDetail(i); showVenture(-1); cueEl.classList.remove('on'); bgU.uBurst.value=1;
  openDir.copy(camera.position).sub(capsules[i].g.position); openDir.y=0; openDir.normalize(); openRight.set(-openDir.z,0,openDir.x).negate();
  detailEl.classList.add('on'); requestAnimationFrame(()=>requestAnimationFrame(()=>detailEl.classList.add('in')));
  document.documentElement.classList.add('noscroll');
  state.glitch=Math.max(state.glitch,0.9); state.aberr=Math.max(state.aberr,1.1);
  gsap.killTweensOf(openO); gsap.to(openO,{v:1,duration:1.15,ease:'power3.inOut'});
  const org=capsules[i].g.position; spawnRing(org,1); setTimeout(()=>spawnRing(org,0.9),140); setTimeout(()=>spawnRing(org,0.8),300); heartbeat=0;
  if(audioOn&&audio){ audio.tick(); audio.blip(880); }
  $('dClose').focus({preventScroll:true});
}
function closeOrb(cb){
  if(openIdx<0) return;
  detailEl.classList.remove('in');
  state.glitch=Math.max(state.glitch,0.7); state.aberr=Math.max(state.aberr,0.9);
  if(audioOn&&audio) audio.blip(440);
  spawnRing(capsules[openIdx].g.position, 0.7); bgU.uBurst.value=Math.max(bgU.uBurst.value,0.45);
  gsap.killTweensOf(openO);
  gsap.to(openO,{v:0,duration:0.95,ease:'power3.inOut',onComplete(){ detailEl.classList.remove('on'); openIdx=-1; document.documentElement.classList.remove('noscroll'); readScroll(); if(cb) cb(); }});
}
$('vOpen').addEventListener('click',()=>openOrb(state.venture));
$('dClose').addEventListener('click',()=>closeOrb());

$('dNext').addEventListener('click',()=>{ const n=(openIdx+1)%NCH; closeOrb(()=>{ scrollToP(CHAP_P[n]); setTimeout(()=>openOrb(n),700); }); });
W('keydown',e=>{ if(e.key==='Escape') closeOrb(); });
W('click',e=>{
  if(state.dragDist>8){ state.dragDist=0; return; }            // that was a drag, not a click
  if(e.target.closest && e.target.closest('.ui, .pill, .nav')) return;      // real UI handles itself
  if(openIdx>=0){ closeOrb(); return; }
  if(state.orbHover>=0) openOrb(state.orbHover);
});
// tap-to-open on touch: raycast at the touch point
W('touchend',e=>{
  if(!isTouch || openIdx>=0 || !state.ready) return; const t=e.changedTouches[0]; if(!t || (e.target.closest && e.target.closest('.ui'))) return;
  ndc.set((t.clientX/window.innerWidth)*2-1, -((t.clientY/window.innerHeight)*2-1)); raycaster.setFromCamera(ndc,camera);
  const h=raycaster.intersectObjects(capsules.filter(c=>c.g.visible).map(c=>c.shell),false); if(h.length) openOrb(capsules.find(c=>c.shell===h[0].object).i);
},{passive:true});
root.querySelectorAll('#pill button').forEach(b=>b.addEventListener('click',()=>{ if(openIdx>=0) closeOrb(); }));

/*  menu overlay with parallax */
let menuOpen=false; const menuEl=$('menu');
function openMenu(){ if(menuOpen) return; menuOpen=true; menuEl.classList.add('on'); menuEl.setAttribute('aria-hidden','false'); requestAnimationFrame(()=>requestAnimationFrame(()=>menuEl.classList.add('in'))); document.documentElement.classList.add('noscroll'); state.glitch=Math.max(state.glitch,0.8); state.aberr=Math.max(state.aberr,0.8); if(audioOn&&audio) audio.tick(); }
function closeMenu(){ if(!menuOpen) return; menuOpen=false; menuEl.classList.remove('in'); state.glitch=Math.max(state.glitch,0.5); setTimeout(()=>{ if(!menuOpen){ menuEl.classList.remove('on'); menuEl.setAttribute('aria-hidden','true'); if(openIdx<0) document.documentElement.classList.remove('noscroll'); } },650); }
$('burger').addEventListener('click',openMenu); $('mclose').addEventListener('click',closeMenu);
menuEl.querySelector('.veil').addEventListener('click',closeMenu);
W('keydown',e=>{ if(e.key==='Escape') closeMenu(); });
root.querySelectorAll('#mbig button').forEach(b=>b.addEventListener('click',()=>{
  const target=parseFloat(b.dataset.p), open=b.dataset.open;
  closeMenu(); if(openIdx>=0) closeOrb();
  setTimeout(()=>{ scrollToP(target); if(open!==undefined) setTimeout(()=>openOrb(parseInt(open,10)), 900); }, 300);
}));
root.querySelectorAll('#mbig button').forEach(b=>{ const tn=b.lastChild; const sp=document.createElement('span'); sp.textContent=tn.textContent; tn.replaceWith(sp); const txt=sp.textContent; b.addEventListener('mouseenter',()=>scramble(sp, txt, 0.5)); });
function menuParallax(){ if(!menuOpen) return; $('mbig').style.transform=`translate(${(state.mxs*-18).toFixed(1)}px, ${(state.mys*-12).toFixed(1)}px)`; $('mside').style.transform=`translate(${(state.mxs*-8).toFixed(1)}px, ${(state.mys*-6).toFixed(1)}px)`; }

/*  theme (mirrors DroneScene.tsx colour swaps) */
const themeBtn=$('theme');
function applyTheme(dark){
  root.dataset.theme = dark?'dark':'light';
  themeBtn.setAttribute('aria-label','Switch to '+(dark?'light':'dark')+' mode');
  const bg = dark?0x0b090a:0xf6f0f0;
  scene.fog.color.setHex(bg); bgU.uBase.value.setHex(dark?0x0b090a:0xf6f0f0); bgU.uDark.value=dark?1:0;
  wireDrone.color.setHex(dark?0xd3d3d3:0x161a1d); wireArm.color.setHex(dark?0xe5383b:0xba181b);
  spine.traverse(o=>{ if(o.isLineSegments) o.material.color.setHex(o.material.color.getHex()===0xe5383b||o.material.color.getHex()===0xba181b ? (dark?0xe5383b:0xba181b) : (dark?0xb1a7a6:0x3a3738)); });
  groundU.uA.value.setHex(bg); groundU.uB.value.setHex(dark?0x2a2f33:0xd8a9ab); groundU.uC.value.setHex(dark?0x660708:0xe5383b);
  horizon.material.color.setHex(dark?0x151314:0xebe7e8);
  parts.forEach(p=>{ const accent=p.wire.userData.accent; p.wire.material.color.setHex(accent ? (dark?0xe5383b:0xba181b) : (dark?0xd3d3d3:0x161a1d)); });
  props.forEach(p=>p.wires.forEach(w=>w.material.color.setHex(dark?0xd3d3d3:0x161a1d)));
  capsules.forEach(c=>{ c.shell.material.color.setHex(dark?0xd3d3d3:0x3b2a2b); c.edges.material.color.setHex(dark?0xb1a7a6:0x9a6e6f); });
  pMat.uniforms.uHaze.value.setHex(dark?0xe0585b:0xb28385); pMat.uniforms.uFrost.value.setHex(dark?0xe5383b:0xba181b); pMat.uniforms.uWhite.value.setHex(dark?0xf5f3f4:0x0b090a);
  pMat.blending = dark?THREE.AdditiveBlending:THREE.NormalBlending; pMat.needsUpdate=true;
  swarmMat.uniforms.uDim.value.setHex(dark?0xc47d80:0xb99394);   // ink: motes carry the ink tint swarmMat.uniforms.uHot.value.setHex(dark?0xe5383b:0xba181b); swarmMat.uniforms.uWhite.value.setHex(dark?0xf5f3f4:0x0b090a);
  swarmMat.blending = dark?THREE.AdditiveBlending:THREE.NormalBlending; swarmMat.needsUpdate=true;
  rings.forEach(r=>r.m.material.color.setHex(dark?0xe5383b:0xba181b));
  if(typeof bgExtraTheme==='function') bgExtraTheme(dark);

  postU.uVig.value = dark?0.58:0.88; postU.uGrain.value = 0.0;
  scene.children.forEach(o=>{ if(o.isHemisphereLight){ o.color.setHex(dark?0xb1a7a6:0xffffff); o.groundColor.setHex(dark?0x0b090a:0xd8d4d5); o.intensity=dark?0.5:0.9; } });

}
let darkMode = opts.initialTheme ? opts.initialTheme!=='light' : true;
themeBtn.addEventListener('click',()=>{ darkMode=!darkMode; applyTheme(darkMode); state.aberr=Math.max(state.aberr,0.6); if(onThemeChange) onThemeChange(darkMode?'dark':'light'); });

/*  loop */
const clock=new THREE.Clock();
let last=0;
applyTheme(darkMode);
function frame(){
  if(!running) return;
  requestAnimationFrame(frame);
  const t=clock.getElapsedTime(), dt=Math.min(0.05, t-last); last=t;
  state.p += (state.pTarget-state.p)*(reduced?0.3:0.075);
  const v=state.p-state.prevP; state.prevP=state.p; state.vS+=(v-state.vS)*0.15;
  choreo(state.p, t);
  state.mspeed*=0.9;
  postU.uMouse.value.set(state.mx*0.5+0.5, 0.5-state.my*0.5); postU.uRipple.value = 0;   // lens ripple disabled
  menuParallax();
  if(!reduced){ kinetic(heroLetters, t, state.vS, state.mxs, state.mys, heroOn && state.ready); kinetic(footLetters, t, state.vS, state.mxs, state.mys, footOn); pillReact(state.vS); }
  state.glitch *= Math.pow(0.08, dt); state.aberr *= Math.pow(0.1, dt);
  postU.uGlitch.value = 0;   // slice glitch retired; transitions use a soft chromatic swell instead
  postU.uAberr.value = reduced ? 0.0 : 0.0022 + state.aberr*0.007;
  postU.uTime.value = t;
  postU.uAO.value = reduced?0:0.85;
  const dofT = openIdx>=0 ? THREE.MathUtils.smoothstep(openO.v,0.3,1) : 0; postU.uDof.value += (dofT-postU.uDof.value)*0.08;
  if(openIdx>=0){ postU.uFocus.value = camera.position.distanceTo(capsules[openIdx].g.position); }
  if(particles.visible) simParticles(dt);

  renderer.setRenderTarget(rt); renderer.render(scene,camera);
  // bloom chain (half res): bright → blur H → blur V
  brightMat.uniforms.tInput.value=rt.texture; runPass(brightQuad, rtB);
  blurMat.uniforms.tInput.value=rtB.texture; blurMat.uniforms.uDir.value.set(1,0); runPass(blurQuad, rtA);
  blurMat.uniforms.tInput.value=rtA.texture; blurMat.uniforms.uDir.value.set(0,1); runPass(blurQuad, rtB);
  blurMat.uniforms.tInput.value=rtB.texture; blurMat.uniforms.uDir.value.set(ANAMORPHIC,0); runPass(blurQuad, rtA);   // wide horizontal pass: a soft anamorphic streak
  // depth-of-field blur (half res, unthresholded)
  if(postU.uDof.value>0.001){ blurMat.uniforms.tInput.value=rt.texture; blurMat.uniforms.uDir.value.set(1.3,0); runPass(blurQuad, rtB); blurMat.uniforms.tInput.value=rtB.texture; blurMat.uniforms.uDir.value.set(0,1.3); runPass(blurQuad, rtC); }
  renderer.setRenderTarget(null); renderer.render(postScene,postCam);
}
frame();

/*  boot sequence */

let loaderProgress=0;
(function boot(){
  const pct=$('pct'), spans=[...root.querySelectorAll('#status span')];
  const o={v:0};
  const dur = reduced?0.9:3.4;
  STATUS.forEach((m,i)=>setTimeout(()=>{ spans.forEach(sp=>sp.style.display='none'); const sp=spans[Math.min(i,spans.length-1)]; sp.style.display='inline'; scramble(sp, m, 0.6); }, 300+i*700));
  let loaded=false; modelsReady.then(()=>{ loaded=true; $('loader').classList.add('live'); });
  const finish=()=>{
    gsap.to(o,{v:100,duration:0.6,ease:'power2.out',onUpdate(){ pct.textContent=String(Math.round(o.v)).padStart(2,'0'); loaderProgress=o.v/100; },
      onComplete(){
        state.aberr=0.9;
        setTimeout(()=>{
          state.loading=false; $('loader').classList.add('off');
          gsap.to(state,{intro:0,duration:2.2,ease:'power3.inOut',onComplete(){
            state.ready=true; setDroneState({solid:1}); document.body.classList.remove('locked');
            $('nav').classList.add('on'); $('pill').classList.add('on'); heroEl.classList.add('on'); cueEl.classList.add('on'); $('hud').classList.add('on'); heroOn=true; readScroll();
          }});
        }, 500);
      }});
  };
  gsap.to(o,{v:92,duration:dur,ease:'power2.inOut',onUpdate(){ pct.textContent=String(Math.round(o.v)).padStart(2,'0'); loaderProgress=o.v/100; },
    onComplete(){ const wait=()=>{ if(loaded) finish(); else setTimeout(wait,100); }; wait(); }});
})();

  /*  lifecycle */
  function setTheme(dark){ darkMode=!!dark; applyTheme(darkMode); }
  function destroy(){
    running=false; ac.abort();
    try{ renderer.dispose(); rt.dispose(); }catch(e){}
    document.body.classList.remove('locked'); document.documentElement.classList.remove('noscroll');
  }
  return { setTheme, scrollTo:scrollToP, destroy };
}
