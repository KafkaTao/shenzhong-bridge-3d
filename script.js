(() => {
'use strict';

if (!window.THREE) {
  document.getElementById('weather').innerHTML = '<span class="w-detail" style="color:#c43d3d">3D 资源加载失败</span>';
  return;
}

const THREE = window.THREE;

const ENG_DATA = {
  overview: { title:'深中通道 · 工程概况', rows:[
    ['跨海段展示','24 公里'],['总体布局','东隧西桥'],['设计时速','100 km/h'],
    ['车道数','双向八车道'],['通车时间','2024 年 6 月 30 日'],['跨海结构','桥、岛、隧组合'],
    ['公开资料依据','维基百科与公开报道'],['表现目标','工程展示感而非玩具模型']]},
  bridge: { title:'桥梁系统 · 深中大桥 + 中山大桥', rows:[
    ['深中大桥','2,826 米悬索桥'],['主跨','1,666 米'],['主塔高度','约 270 米'],
    ['中山大桥','1,170 米斜拉桥'],['主跨','580 米'],['主塔高度','213.5 米'],
    ['建模策略','按公开比例抽象重建'],['视觉重点','塔、索、桥面关系更接近真实']]},
  island: { title:'西人工岛 · 桥隧转换', rows:[
    ['长度','625 米'],['宽度','361 米'],['作用','桥隧转换与运维支撑'],
    ['位置关系','隧道西端、桥梁东端'],['表现方式','实体体块 + 口门坡道'],
    ['当前改造','加强体量、弱化卡通色块']]},
  tunnel: { title:'海底沉管隧道', rows:[
    ['隧道全长','6,845 米'],['沉管段','5,035 米'],['管节数量','32 节'],
    ['最大埋深','约 39 米'],['结构类型','钢壳混凝土沉管'],['当前表现','分节沉管 + 水面下埋置'],
    ['目标','体现连续性和工程尺度']]},
  interchange: { title:'东侧互通与登陆段', rows:[
    ['连接方向','深圳机场互通 / 中山侧互通'],['视觉表达','多段匝道与落地桥'],['角色','跨海段两端的交通衔接'],
    ['当前处理','保留简化道路，增强层级与曲线'],['限制','不引入高精地图底模，控制复杂度']]},
};

const WMO = {
  0:{i:'☀️',t:'晴'},1:{i:'🌤',t:'少云'},2:{i:'⛅',t:'多云'},3:{i:'☁️',t:'阴'},
  45:{i:'🌫',t:'雾'},48:{i:'🌫',t:'浓雾'},51:{i:'🌦',t:'小毛雨'},53:{i:'🌦',t:'毛毛雨'},
  55:{i:'🌦',t:'密毛雨'},61:{i:'🌧',t:'小雨'},63:{i:'🌧',t:'中雨'},65:{i:'🌧',t:'大雨'},
  71:{i:'❄️',t:'小雪'},73:{i:'❄️',t:'中雪'},75:{i:'❄️',t:'大雪'},80:{i:'🌧',t:'阵雨'},
  95:{i:'⛈',t:'雷暴'},96:{i:'⛈',t:'冰雹'},99:{i:'⛈',t:'强冰雹'},
};

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;

const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.Fog(0xe4eef8, 250, 880);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1200);

function cartesianToOrbit(position, target) {
  const offset = position.clone().sub(target);
  const radius = offset.length();
  const phi = Math.acos(THREE.MathUtils.clamp(offset.y / radius, -1, 1));
  const theta = Math.atan2(offset.x, offset.z);
  return { radius, phi, theta };
}

function orbitToCartesian(target, radius, phi, theta) {
  return new THREE.Vector3(
    target.x + radius * Math.sin(phi) * Math.sin(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * Math.sin(phi) * Math.cos(theta)
  );
}

const root = new THREE.Group();
scene.add(root);

const materials = {
  deck: new THREE.MeshStandardMaterial({ color: 0x415364, metalness: 0.58, roughness: 0.5 }),
  edge: new THREE.MeshStandardMaterial({ color: 0x68829a, metalness: 0.68, roughness: 0.34 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x5f7994, metalness: 0.78, roughness: 0.26 }),
  steelLight: new THREE.MeshStandardMaterial({ color: 0x94afc7, metalness: 0.84, roughness: 0.18 }),
  cable: new THREE.LineBasicMaterial({ color: 0x84a7c9 }),
  cableStayed: new THREE.LineBasicMaterial({ color: 0x88a9c8 }),
  island: new THREE.MeshStandardMaterial({ color: 0x9ec0cd, roughness: 0.78, metalness: 0.06 }),
  islandTop: new THREE.MeshStandardMaterial({ color: 0xd8edf3, roughness: 0.62, metalness: 0.03 }),
  tunnel: new THREE.MeshStandardMaterial({ color: 0x7b92a7, roughness: 0.74, metalness: 0.18 }),
  roadLine: new THREE.MeshStandardMaterial({ color: 0xf2c544, roughness: 0.72, metalness: 0.04 }),
  riverbed: new THREE.MeshStandardMaterial({ color: 0xbfd4e4, roughness: 1, metalness: 0 }),
  bank: new THREE.MeshStandardMaterial({ color: 0xe8eef3, roughness: 0.98, metalness: 0 }),
  shoreline: new THREE.MeshBasicMaterial({ color: 0xf8fcff, transparent: true, opacity: 0.36 }),
  route: new THREE.LineBasicMaterial({ color: 0xff7a2f }),
  car: new THREE.MeshStandardMaterial({ color: 0xd64545, roughness: 0.48, metalness: 0.2 }),
  carGlass: new THREE.MeshStandardMaterial({ color: 0xf4f8fc, roughness: 0.18, metalness: 0.1 }),
};

const toggleMaterials = [materials.deck, materials.edge, materials.steel, materials.steelLight, materials.island, materials.islandTop, materials.tunnel, materials.roadLine, materials.riverbed, materials.bank, materials.car, materials.carGlass];

const ambient = new THREE.HemisphereLight(0xf8fcff, 0xc8dcf0, 1.12);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfffaf2, 1.34);
sun.position.set(120, 145, 48);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -260;
sun.shadow.camera.right = 260;
sun.shadow.camera.top = 220;
sun.shadow.camera.bottom = -120;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 420;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xcde0f6, 0.88);
fill.position.set(-130, 66, -90);
scene.add(fill);

const backLight = new THREE.DirectionalLight(0xe2eefc, 0.4);
backLight.position.set(0, 40, -180);
scene.add(backLight);

function makeBox(width, height, depth, material, position, castShadow = true, receiveShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.copy(position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

function makeCylinder(radiusTop, radiusBottom, height, material, radialSegments = 18) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeExtruded(points, depth, materialTop, materialSide) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, depth / 2, 0);
  const mesh = new THREE.Mesh(geometry, [materialSide, materialTop]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addDeckMarkings(xStart, xEnd, y, z, group) {
  const centerLine = makeBox(Math.abs(xEnd - xStart), 0.02, 0.28, materials.roadLine, new THREE.Vector3((xStart + xEnd) / 2, y, z), false, true);
  group.add(centerLine);
}

function addLine(points, material, parent) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  parent.add(line);
  return line;
}

function addPiers(parent, xs, topY, height, depth = 3.6, width = 2.8) {
  xs.forEach((x) => {
    parent.add(makeBox(width, height, depth, materials.edge, new THREE.Vector3(x, topY - height / 2, 0)));
  });
}

function towerSuspension(height = 52, topWidth = 6.5, depth = 4.6) {
  const group = new THREE.Group();
  const legOffset = topWidth * 0.28;
  const lowerGeom = new THREE.BoxGeometry(2.05, height * 0.62, depth);
  const upperGeom = new THREE.BoxGeometry(1.65, height * 0.38, depth - 0.25);
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  const leftLower = new THREE.Mesh(lowerGeom, materials.steel);
  const leftUpper = new THREE.Mesh(upperGeom, materials.steelLight);
  const rightLower = new THREE.Mesh(lowerGeom, materials.steel);
  const rightUpper = new THREE.Mesh(upperGeom, materials.steelLight);
  leftLower.position.y = height * 0.31;
  leftUpper.position.y = height * 0.81;
  rightLower.position.y = height * 0.31;
  rightUpper.position.y = height * 0.81;
  leftLeg.add(leftLower, leftUpper);
  rightLeg.add(rightLower, rightUpper);
  leftLeg.position.set(-legOffset, 0, 0);
  rightLeg.position.set(legOffset, 0, 0);
  group.add(leftLeg, rightLeg);
  const topBeam = makeBox(topWidth, 2, depth + 0.6, materials.steelLight, new THREE.Vector3(0, height - 2.1, 0));
  const lowerBeam = makeBox(topWidth - 1.2, 1.3, depth - 0.3, materials.steel, new THREE.Vector3(0, 18, 0));
  const saddle = makeBox(topWidth - 0.8, 0.72, depth + 1.1, materials.edge, new THREE.Vector3(0, height - 0.9, 0));
  const base = makeBox(topWidth + 0.8, 2.2, depth + 1.2, materials.edge, new THREE.Vector3(0, 1.1, 0));
  group.add(topBeam, lowerBeam, saddle, base);
  return group;
}

function towerCableStayed(height = 42, depth = 4.2) {
  const group = new THREE.Group();
  const lower = makeBox(4.2, height * 0.62, depth + 0.2, materials.steel, new THREE.Vector3(0, height * 0.31, 0));
  const upper = makeBox(3.1, height * 0.38, depth - 0.2, materials.steelLight, new THREE.Vector3(0, height * 0.81, 0));
  const head = makeBox(5.4, 3, depth + 0.8, materials.steelLight, new THREE.Vector3(0, height - 2.8, 0));
  const base = makeBox(5.6, 2.4, depth + 1.2, materials.edge, new THREE.Vector3(0, 1.2, 0));
  group.add(lower, upper, head, base);
  return group;
}

const structural = new THREE.Group();
root.add(structural);

const riverbed = new THREE.Mesh(new THREE.PlaneGeometry(760, 220, 1, 1), materials.riverbed);
riverbed.rotation.x = -Math.PI / 2;
riverbed.position.y = -1.6;
riverbed.receiveShadow = true;
scene.add(riverbed);

const waterUniforms = {
  time: { value: 0 },
  colorA: { value: new THREE.Color(0x6f95bb) },
  colorB: { value: new THREE.Color(0xaecde3) },
  colorC: { value: new THREE.Color(0xf3faff) },
  colorDeep: { value: new THREE.Color(0x6488ad) },
};

const water = new THREE.Mesh(
  new THREE.PlaneGeometry(760, 220, 256, 96),
  new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    transparent: true,
    vertexShader: `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vWave;
      void main() {
        vUv = uv;
        vec3 p = position;
        float waveA = sin((p.x * 0.045) + time * 0.95) * 0.45;
        float waveB = cos((p.y * 0.08) - time * 1.15) * 0.24;
        float waveC = sin((p.x + p.y) * 0.035 + time * 1.7) * 0.18;
        p.z += waveA + waveB + waveC;
        vWave = waveA + waveB + waveC;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 colorA;
      uniform vec3 colorB;
      uniform vec3 colorC;
      uniform vec3 colorDeep;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vWave;
      void main() {
        float ripple = sin((vUv.x * 28.0 + time * 2.8)) * 0.04 + cos((vUv.y * 36.0 - time * 2.2)) * 0.03;
        float flow = sin((vUv.x + vUv.y + time * 0.25) * 18.0) * 0.08;
        float shore = smoothstep(0.02, 0.16, vUv.y) * (1.0 - smoothstep(0.84, 0.98, vUv.y));
        float center = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float channel = smoothstep(0.18, 0.92, center);
        float glint = pow(max(0.0, sin(vUv.x * 46.0 + time * 1.4) * 0.5 + 0.5), 14.0) * 0.14 * channel;
        vec3 base = mix(colorA, colorB, vUv.y + ripple);
        base = mix(base, colorDeep, channel * 0.34);
        base = mix(base, colorC, shore * 0.24 + max(vWave, 0.0) * 0.12 + glint);
        float alpha = 0.74 + flow * 0.06 + shore * 0.1 + glint * 0.4;
        gl_FragColor = vec4(base, alpha);
      }
    `,
  })
);
water.rotation.x = -Math.PI / 2;
water.position.y = 0.1;
water.receiveShadow = true;
scene.add(water);

const shoreline = new THREE.Mesh(new THREE.PlaneGeometry(760, 220, 1, 1), materials.shoreline);
shoreline.rotation.x = -Math.PI / 2;
shoreline.position.y = 0.16;
scene.add(shoreline);

const channelGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(760, 76, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xf6fbff, transparent: true, opacity: 0.12 })
);
channelGlow.rotation.x = -Math.PI / 2;
channelGlow.position.set(0, 0.22, 0);
scene.add(channelGlow);

const leftLand = new THREE.Mesh(new THREE.BoxGeometry(120, 1.5, 96), materials.bank);
leftLand.position.set(-218, -0.75, 0);
leftLand.receiveShadow = true;
scene.add(leftLand);

const rightLand = new THREE.Mesh(new THREE.BoxGeometry(120, 1.5, 104), materials.bank);
rightLand.position.set(214, -0.75, 0);
rightLand.receiveShadow = true;
scene.add(rightLand);

const farMist = new THREE.Mesh(
  new THREE.PlaneGeometry(820, 240, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 })
);
farMist.position.set(40, 40, -128);
scene.add(farMist);

const farBankNorth = new THREE.Mesh(new THREE.BoxGeometry(860, 10, 34), materials.bank);
farBankNorth.position.set(12, 3.4, -108);
farBankNorth.receiveShadow = true;
scene.add(farBankNorth);

const farBankSouth = new THREE.Mesh(new THREE.BoxGeometry(880, 8, 24), materials.bank);
farBankSouth.position.set(18, 2.2, 106);
farBankSouth.receiveShadow = true;
scene.add(farBankSouth);

const skylineA = new THREE.Mesh(
  new THREE.PlaneGeometry(860, 120, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xd8e7f6, transparent: true, opacity: 0.22 })
);
skylineA.position.set(20, 44, -150);
scene.add(skylineA);

const skylineB = new THREE.Mesh(
  new THREE.PlaneGeometry(760, 90, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xe9f3fb, transparent: true, opacity: 0.3 })
);
skylineB.position.set(30, 28, -132);
scene.add(skylineB);

const islandFoamWest = new THREE.Mesh(
  new THREE.RingGeometry(20, 28, 48),
  new THREE.MeshBasicMaterial({ color: 0xf8fdff, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
);
islandFoamWest.rotation.x = -Math.PI / 2;
islandFoamWest.position.set(44, 0.18, 0);
scene.add(islandFoamWest);

const islandFoamEast = new THREE.Mesh(
  new THREE.RingGeometry(18, 26, 48),
  new THREE.MeshBasicMaterial({ color: 0xf8fdff, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
);
islandFoamEast.rotation.x = -Math.PI / 2;
islandFoamEast.position.set(156, 0.18, 0);
scene.add(islandFoamEast);

const sceneElements = {};

function buildScene() {
  const bridgeGroup = new THREE.Group();
  structural.add(bridgeGroup);
  sceneElements.bridgeGroup = bridgeGroup;

  const deckY = 11.5;
  const suspensionStart = -90;
  const suspensionEnd = 28;
  const cableStayedStart = -164;
  const cableStayedEnd = -100;
  const suspensionDeck = makeBox(suspensionEnd - suspensionStart, 1.6, 11.4, materials.deck, new THREE.Vector3((suspensionStart + suspensionEnd) / 2, deckY + 0.4, 0));
  const suspensionBelly = makeBox(suspensionEnd - suspensionStart, 1.05, 7.8, materials.edge, new THREE.Vector3((suspensionStart + suspensionEnd) / 2, deckY - 0.72, 0));
  const suspensionEdgeL = makeBox(suspensionEnd - suspensionStart, 0.5, 1.0, materials.edge, new THREE.Vector3((suspensionStart + suspensionEnd) / 2, deckY + 1.18, -5.35));
  const suspensionEdgeR = makeBox(suspensionEnd - suspensionStart, 0.5, 1.0, materials.edge, new THREE.Vector3((suspensionStart + suspensionEnd) / 2, deckY + 1.18, 5.35));
  bridgeGroup.add(suspensionDeck, suspensionBelly, suspensionEdgeL, suspensionEdgeR);
  addDeckMarkings(suspensionStart + 4, suspensionEnd - 4, deckY + 1.12, 0, bridgeGroup);

  const approachDeck = makeBox(18, 1.5, 11, materials.deck, new THREE.Vector3(36, 10.2, 0));
  const approachBelly = makeBox(18, 0.9, 7.4, materials.edge, new THREE.Vector3(36, 9.3, 0));
  bridgeGroup.add(approachDeck, approachBelly);
  addPiers(bridgeGroup, [30, 38], 10.2, 9.0, 3.6, 2.8);

  const anchorWest = makeBox(14, 8, 18, materials.steel, new THREE.Vector3(-98, 4, 0));
  const anchorEast = makeBox(12, 7, 18, materials.steel, new THREE.Vector3(36, 3.5, 0));
  bridgeGroup.add(anchorWest, anchorEast);

  const towerA = towerSuspension(51);
  towerA.position.set(-60, 0, 0);
  const towerB = towerSuspension(54);
  towerB.position.set(-16, 0, 0);
  bridgeGroup.add(towerA, towerB);

  const cablePointsLeft = [];
  const cablePointsRight = [];
  for (let i = 0; i <= 120; i += 1) {
    const t = i / 120;
    const x = THREE.MathUtils.lerp(-98, 36, t);
    const base = Math.sin(t * Math.PI);
    const y = 26 + base * 18 + (t < 0.25 ? t * 18 : 0) + (t > 0.75 ? (1 - t) * 18 : 0);
    cablePointsLeft.push(new THREE.Vector3(x, y, -4.8));
    cablePointsRight.push(new THREE.Vector3(x, y, 4.8));
  }
  const leftCableTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePointsLeft), 120, 0.34, 10, false), materials.steelLight);
  const rightCableTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePointsRight), 120, 0.34, 10, false), materials.steelLight);
  leftCableTube.castShadow = true;
  rightCableTube.castShadow = true;
  bridgeGroup.add(leftCableTube, rightCableTube);
  addLine(cablePointsLeft, materials.cable, bridgeGroup);
  addLine(cablePointsRight, materials.cable, bridgeGroup);

  for (let x = suspensionStart + 4; x <= suspensionEnd - 4; x += 4.8) {
    const ratio = (x - (-98)) / (36 - (-98));
    const y = 26 + Math.sin(ratio * Math.PI) * 18 + (ratio < 0.25 ? ratio * 18 : 0) + (ratio > 0.75 ? (1 - ratio) * 18 : 0);
    addLine([new THREE.Vector3(x, y, -4.8), new THREE.Vector3(x, deckY + 1.2, -4.8)], materials.cable, bridgeGroup);
    addLine([new THREE.Vector3(x, y, 4.8), new THREE.Vector3(x, deckY + 1.2, 4.8)], materials.cable, bridgeGroup);
  }

  const stayedDeck = makeBox(cableStayedEnd - cableStayedStart, 1.5, 10.4, materials.deck, new THREE.Vector3((cableStayedStart + cableStayedEnd) / 2, deckY - 0.2, 0));
  const stayedBelly = makeBox(cableStayedEnd - cableStayedStart, 0.92, 7.0, materials.edge, new THREE.Vector3((cableStayedStart + cableStayedEnd) / 2, deckY - 1.05, 0));
  const stayedEdgeL = makeBox(cableStayedEnd - cableStayedStart, 0.45, 1.0, materials.edge, new THREE.Vector3((cableStayedStart + cableStayedEnd) / 2, deckY + 0.7, -5.1));
  const stayedEdgeR = makeBox(cableStayedEnd - cableStayedStart, 0.45, 1.0, materials.edge, new THREE.Vector3((cableStayedStart + cableStayedEnd) / 2, deckY + 0.7, 5.1));
  bridgeGroup.add(stayedDeck, stayedBelly, stayedEdgeL, stayedEdgeR);
  addDeckMarkings(cableStayedStart + 3, cableStayedEnd - 3, deckY + 0.4, 0, bridgeGroup);
  addPiers(bridgeGroup, [-156, -146, -108], deckY - 0.6, 12.4, 3.2, 2.6);

  const towerC = towerCableStayed(42);
  towerC.position.set(-136, 0, 0);
  const towerD = towerCableStayed(42);
  towerD.position.set(-118, 0, 0);
  bridgeGroup.add(towerC, towerD);

  for (let i = 0; i <= 10; i += 1) {
    const leftX = THREE.MathUtils.lerp(cableStayedStart + 4, -145, i / 10);
    const rightX = THREE.MathUtils.lerp(-109, cableStayedEnd - 4, i / 10);
    addLine([new THREE.Vector3(-136, 39, -4.6), new THREE.Vector3(leftX, deckY + 0.8, -4.6)], materials.cableStayed, bridgeGroup);
    addLine([new THREE.Vector3(-136, 39, 4.6), new THREE.Vector3(leftX, deckY + 0.8, 4.6)], materials.cableStayed, bridgeGroup);
    addLine([new THREE.Vector3(-118, 39, -4.6), new THREE.Vector3(rightX, deckY + 0.8, -4.6)], materials.cableStayed, bridgeGroup);
    addLine([new THREE.Vector3(-118, 39, 4.6), new THREE.Vector3(rightX, deckY + 0.8, 4.6)], materials.cableStayed, bridgeGroup);
  }

  const westIslandShape = [[-26, -14], [-12, -22], [10, -21], [24, -12], [26, 2], [18, 12], [-6, 18], [-24, 10]];
  const westIsland = makeExtruded(westIslandShape, 5.5, materials.islandTop, materials.island);
  westIsland.position.set(44, 0, 0);
  structural.add(westIsland);
  sceneElements.westIsland = westIsland;
  structural.add(makeBox(26, 2.2, 11, materials.deck, new THREE.Vector3(44, 8.8, 0)));
  structural.add(makeBox(18, 3, 8, materials.edge, new THREE.Vector3(48, 6.7, 0)));
  structural.add(makeBox(8, 2.8, 6.4, materials.edge, new THREE.Vector3(56, 5.5, 0)));
  structural.add(new THREE.Mesh(new THREE.BoxGeometry(16, 5, 11), materials.islandTop));
  structural.children[structural.children.length - 1].position.set(32, 1.7, 0);
  structural.children[structural.children.length - 1].rotation.z = -0.24;
  addPiers(structural, [36, 52], 8.8, 7.2, 4.2, 3.2);

  const tunnelGroup = new THREE.Group();
  structural.add(tunnelGroup);
  sceneElements.tunnelGroup = tunnelGroup;
  for (let i = 0; i < 11; i += 1) {
    const segment = makeBox(7.4, 5.4, 11.6, materials.tunnel, new THREE.Vector3(68 + i * 7.6, -4.8, 0));
    tunnelGroup.add(segment);
  }
  const tunnelRoof = makeBox(92, 1.1, 10.4, materials.edge, new THREE.Vector3(106, -1.35, 0));
  tunnelGroup.add(tunnelRoof);
  tunnelGroup.add(makeBox(10, 4.4, 12.4, materials.edge, new THREE.Vector3(62, -3.2, 0)));

  const eastIslandShape = [[-24, -10], [-10, -20], [10, -19], [24, -8], [24, 7], [10, 16], [-8, 16], [-22, 7]];
  const eastIsland = makeExtruded(eastIslandShape, 4.8, materials.islandTop, materials.island);
  eastIsland.position.set(156, 0, 0);
  structural.add(eastIsland);
  sceneElements.eastIsland = eastIsland;

  const interchange = new THREE.Group();
  structural.add(interchange);
  sceneElements.interchangeGroup = interchange;
  interchange.add(makeBox(28, 2.2, 11, materials.deck, new THREE.Vector3(182, 10.6, 0)));
  interchange.add(makeBox(38, 2, 7, materials.deck, new THREE.Vector3(-184, 9.6, 0)));
  addPiers(interchange, [174, 188, -176, -192], 10.2, 8.8, 3.2, 2.4);

  const rampCurveA = new THREE.CatmullRomCurve3([
    new THREE.Vector3(162, 10.4, 0),
    new THREE.Vector3(176, 12, 0),
    new THREE.Vector3(186, 14, 14),
    new THREE.Vector3(196, 12, 24),
  ]);
  const rampCurveB = new THREE.CatmullRomCurve3([
    new THREE.Vector3(162, 10.4, 0),
    new THREE.Vector3(176, 12, 0),
    new THREE.Vector3(186, 14, -14),
    new THREE.Vector3(196, 12, -24),
  ]);
  const tubeGeomA = new THREE.TubeGeometry(rampCurveA, 36, 2.3, 14, false);
  const tubeGeomB = new THREE.TubeGeometry(rampCurveB, 36, 2.3, 14, false);
  interchange.add(new THREE.Mesh(tubeGeomA, materials.deck));
  interchange.add(new THREE.Mesh(tubeGeomB, materials.deck));

  const westInterchangeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-188, 9.6, 0),
    new THREE.Vector3(-200, 10.2, 0),
    new THREE.Vector3(-210, 9.4, -12),
    new THREE.Vector3(-218, 8.4, -22),
  ]);
  interchange.add(new THREE.Mesh(new THREE.TubeGeometry(westInterchangeCurve, 28, 2.1, 12, false), materials.deck));
}

buildScene();

const routeCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-218, 9.2, -22),
  new THREE.Vector3(-198, 10.2, -10),
  new THREE.Vector3(-164, 10.8, 0),
  new THREE.Vector3(-136, 11.1, 0),
  new THREE.Vector3(-112, 11.1, 0),
  new THREE.Vector3(-90, 11.6, 0),
  new THREE.Vector3(-60, 12.2, 0),
  new THREE.Vector3(-16, 12.2, 0),
  new THREE.Vector3(26, 11.8, 0),
  new THREE.Vector3(44, 8.8, 0),
  new THREE.Vector3(64, -1.2, 0),
  new THREE.Vector3(106, -1.4, 0),
  new THREE.Vector3(146, -1.2, 0),
  new THREE.Vector3(160, 10.4, 0),
  new THREE.Vector3(182, 10.8, 0),
  new THREE.Vector3(196, 12, 24),
]);

const routeGeometry = new THREE.BufferGeometry().setFromPoints(routeCurve.getPoints(160));
const routeLine = new THREE.Line(routeGeometry, materials.route);
scene.add(routeLine);

const car = new THREE.Group();
car.add(makeBox(5.2, 1.7, 2.5, materials.car, new THREE.Vector3(0, 0.85, 0)));
car.add(makeBox(2.8, 1.1, 2.2, materials.carGlass, new THREE.Vector3(0.2, 1.8, 0), false, true));
scene.add(car);

const labels = [
  { name: '深中大桥', position: new THREE.Vector3(-38, 58, 0), views: ['overview', 'bridge'] },
  { name: '中山大桥', position: new THREE.Vector3(-128, 46, 0), views: ['overview', 'bridge', 'interchange'] },
  { name: '西人工岛', position: new THREE.Vector3(44, 8.5, 0), views: ['overview', 'island'] },
  { name: '海底沉管隧道', position: new THREE.Vector3(106, -3.6, 0), views: ['overview', 'tunnel'] },
  { name: '东侧互通', position: new THREE.Vector3(184, 15, 0), views: ['overview', 'interchange'] },
];

const labelEls = labels.map((item) => {
  const el = document.createElement('div');
  el.className = 'scene-label';
  el.textContent = item.name;
  document.body.appendChild(el);
  return el;
});

const VIEWS = {
  overview: {
    position: new THREE.Vector3(6, 92, 244),
    target: new THREE.Vector3(-34, 14, 0),
  },
  bridge: {
    position: new THREE.Vector3(-10, 48, 108),
    target: new THREE.Vector3(-40, 18, 0),
  },
  island: {
    position: new THREE.Vector3(74, 34, 76),
    target: new THREE.Vector3(44, 6, 0),
  },
  tunnel: {
    position: new THREE.Vector3(136, 28, 74),
    target: new THREE.Vector3(106, -3, 0),
  },
  interchange: {
    position: new THREE.Vector3(-142, 38, 92),
    target: new THREE.Vector3(-166, 11, 0),
  },
};

const state = {
  view: 'overview',
  labels: true,
  route: true,
  wire: false,
  orbit: false,
  camTarget: VIEWS.overview.target.clone(),
  desiredTarget: VIEWS.overview.target.clone(),
  ...cartesianToOrbit(VIEWS.overview.position, VIEWS.overview.target),
  desiredRadius: cartesianToOrbit(VIEWS.overview.position, VIEWS.overview.target).radius,
  desiredPhi: cartesianToOrbit(VIEWS.overview.position, VIEWS.overview.target).phi,
  desiredTheta: cartesianToOrbit(VIEWS.overview.position, VIEWS.overview.target).theta,
  dragging: false,
  panning: false,
  lastX: 0,
  lastY: 0,
  routeT: 0.02,
};

function clampTarget(target) {
  target.x = THREE.MathUtils.clamp(target.x, -60, 170);
  target.y = THREE.MathUtils.clamp(target.y, 2, 26);
  target.z = THREE.MathUtils.clamp(target.z, -28, 28);
}

function applyView(name) {
  state.view = name;
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === name);
  });
  const orbit = cartesianToOrbit(VIEWS[name].position, VIEWS[name].target);
  state.desiredTarget.copy(VIEWS[name].target);
  clampTarget(state.desiredTarget);
  state.desiredRadius = orbit.radius;
  state.desiredPhi = orbit.phi;
  state.desiredTheta = orbit.theta;
  if (name === 'overview') hideData();
  else showData(name);
}

const dataPanel = document.getElementById('dataPanel');
const dataTitle = document.getElementById('dataTitle');
const dataBody = document.getElementById('dataBody');
const sidePanel = document.querySelector('.side');
const sideToggle = document.getElementById('sideToggle');

function setSideCollapsed(collapsed) {
  sidePanel.classList.toggle('collapsed', collapsed);
  sideToggle.classList.toggle('collapsed', collapsed);
  sideToggle.textContent = collapsed ? '展开面板' : '收起面板';
  sideToggle.setAttribute('aria-label', collapsed ? '展开左侧面板' : '收起左侧面板');
}

function showData(view) {
  const data = ENG_DATA[view];
  if (!data) return;
  dataTitle.textContent = data.title;
  dataBody.innerHTML = data.rows.map(([key, value]) => `<div class="data-row"><span class="data-key">${key}</span><span class="data-val">${value}</span></div>`).join('');
  dataPanel.classList.add('open');
}

function hideData() {
  dataPanel.classList.remove('open');
}

document.getElementById('dataClose').addEventListener('click', hideData);
document.querySelectorAll('.nav-btn').forEach((button) => {
  button.addEventListener('click', () => applyView(button.dataset.view));
});
sideToggle.addEventListener('click', () => {
  setSideCollapsed(!sidePanel.classList.contains('collapsed'));
});

document.getElementById('labels').addEventListener('change', (event) => {
  state.labels = event.target.checked;
});

document.getElementById('route').addEventListener('change', (event) => {
  state.route = event.target.checked;
  routeLine.visible = state.route;
  car.visible = state.route;
});

document.getElementById('orbit').addEventListener('change', (event) => {
  state.orbit = event.target.checked;
});

document.getElementById('wire').addEventListener('change', (event) => {
  state.wire = event.target.checked;
  toggleMaterials.forEach((material) => { material.wireframe = state.wire; });
  water.visible = !state.wire;
});

renderer.domElement.addEventListener('dblclick', () => applyView('overview'));
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());

renderer.domElement.addEventListener('mousedown', (event) => {
  state.dragging = event.button === 0;
  state.panning = event.button === 2;
  state.lastX = event.clientX;
  state.lastY = event.clientY;
});

window.addEventListener('mouseup', () => {
  state.dragging = false;
  state.panning = false;
});

window.addEventListener('mousemove', (event) => {
  const dx = event.clientX - state.lastX;
  const dy = event.clientY - state.lastY;
  state.lastX = event.clientX;
  state.lastY = event.clientY;

  if (state.dragging) {
    state.desiredTheta -= dx * 0.006;
    state.desiredPhi = THREE.MathUtils.clamp(state.desiredPhi + dy * 0.005, 0.34, 1.42);
  }

  if (state.panning) {
    const panScale = state.radius * 0.0026;
    state.desiredTarget.x -= dx * panScale;
    state.desiredTarget.z += dy * panScale * 0.85;
    clampTarget(state.desiredTarget);
    state.camTarget.copy(state.desiredTarget);
  }
});

renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? 1.07 : 0.93;
  state.desiredRadius = THREE.MathUtils.clamp(state.desiredRadius * delta, 55, 300);
}, { passive: false });

let pinchDistance = 0;
renderer.domElement.addEventListener('touchstart', (event) => {
  if (event.touches.length === 1) {
    state.dragging = true;
    state.lastX = event.touches[0].clientX;
    state.lastY = event.touches[0].clientY;
  }
  if (event.touches.length === 2) {
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    pinchDistance = Math.hypot(dx, dy);
  }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (event) => {
  if (event.touches.length === 1 && state.dragging) {
    event.preventDefault();
    const dx = event.touches[0].clientX - state.lastX;
    const dy = event.touches[0].clientY - state.lastY;
    state.lastX = event.touches[0].clientX;
    state.lastY = event.touches[0].clientY;
    state.desiredTheta -= dx * 0.006;
    state.desiredPhi = THREE.MathUtils.clamp(state.desiredPhi + dy * 0.005, 0.34, 1.42);
  }
  if (event.touches.length === 2) {
    event.preventDefault();
    const dx = event.touches[0].clientX - event.touches[1].clientX;
    const dy = event.touches[0].clientY - event.touches[1].clientY;
    const nextDistance = Math.hypot(dx, dy);
    if (pinchDistance > 0) {
      state.desiredRadius = THREE.MathUtils.clamp(state.desiredRadius * (pinchDistance / nextDistance), 55, 300);
    }
    pinchDistance = nextDistance;
  }
}, { passive: false });

renderer.domElement.addEventListener('touchend', () => {
  state.dragging = false;
  pinchDistance = 0;
});

function animateCounters() {
  document.querySelectorAll('.st b[data-to]').forEach((el) => {
    const target = parseFloat(el.dataset.to);
    const decimals = el.dataset.dec ? parseInt(el.dataset.dec, 10) : 0;
    const comma = el.hasAttribute('data-comma');
    const start = performance.now();
    const duration = 1400;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      if (decimals > 0) el.textContent = value.toFixed(decimals);
      else if (comma) el.textContent = Math.round(value).toLocaleString();
      else el.textContent = Math.round(value);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function fetchWeather() {
  const el = document.getElementById('weather');
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=22.42&longitude=113.58&current=temperature_2m,wind_speed_10m,weather_code&timezone=Asia/Shanghai';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network');
    const data = await res.json();
    const cur = data.current;
    const info = WMO[cur.weather_code] || { i: '🌡️', t: '天气' };
    el.innerHTML =
      `<span class="w-icon">${info.i}</span>` +
      `<span class="w-temp">${Math.round(cur.temperature_2m)}°C</span>` +
      `<span class="w-detail">${info.t} · 风速 ${Math.round(cur.wind_speed_10m)}km/h</span>` +
      '<span class="w-live">● LIVE</span>';
  } catch (error) {
    el.innerHTML = '<span class="w-detail" style="color:#c43d3d">天气数据暂不可用</span>';
  }
}

function updateLabels() {
  labels.forEach((item, index) => {
    const el = labelEls[index];
    const visible = state.labels && item.views.includes(state.view);
    if (!visible) {
      el.style.display = 'none';
      return;
    }
    const projected = item.position.clone().project(camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    const inView = projected.z < 1 && projected.z > -1 && x > 210 && x < window.innerWidth - 24 && y > 20 && y < window.innerHeight - 24;
    el.style.display = inView ? 'block' : 'none';
    if (inView) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
  });
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', resize);

function animate() {
  requestAnimationFrame(animate);
  if (state.orbit && !state.dragging && !state.panning) {
    state.desiredTheta += 0.0022;
  }
  state.radius = THREE.MathUtils.lerp(state.radius, state.desiredRadius, 0.08);
  state.phi = THREE.MathUtils.lerp(state.phi, state.desiredPhi, 0.08);
  state.theta = THREE.MathUtils.lerp(state.theta, state.desiredTheta, 0.08);
  state.camTarget.lerp(state.desiredTarget, 0.08);
  clampTarget(state.camTarget);
  camera.position.copy(orbitToCartesian(state.camTarget, state.radius, state.phi, state.theta));
  camera.lookAt(state.camTarget);

  state.routeT += 0.00065;
  if (state.routeT > 1) state.routeT = 0;
  if (state.route) {
    const point = routeCurve.getPointAt(state.routeT);
    const tangent = routeCurve.getTangentAt(state.routeT).normalize();
    car.position.copy(point);
    car.position.y += 0.2;
    car.lookAt(point.clone().add(tangent));
  }

  waterUniforms.time.value = performance.now() * 0.001;
  shoreline.material.opacity = 0.18 + Math.sin(performance.now() * 0.00035) * 0.03;
  channelGlow.material.opacity = 0.1 + Math.sin(performance.now() * 0.00028) * 0.02;
  farMist.material.opacity = 0.15 + Math.sin(performance.now() * 0.0002) * 0.03;
  skylineA.material.opacity = 0.18 + Math.sin(performance.now() * 0.00015) * 0.02;
  skylineB.material.opacity = 0.24 + Math.sin(performance.now() * 0.00018) * 0.02;
  updateLabels();
  renderer.render(scene, camera);
}

applyView('overview');
fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000);
setTimeout(animateCounters, 700);
animate();

})();
