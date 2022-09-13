import * as THREE from './three.js';
import { GLTFLoader } from './gltfloader.js'
import { EffectComposer } from './EffectComposer.js'
import { ShaderPass } from './ShaderPass.js';
import { CopyShader } from './CopyShader.js';
import { RenderPass } from './RenderPass.js';
import { GlitchPass } from './GlitchPass.js';
import { QuantizePass } from './QuantizePass.js';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor( 0xf2f0e9, 1 );
document.body.appendChild( renderer.domElement );

const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
directionalLight.intensity = 3;
directionalLight.castShadow = true;
directionalLight.rotateX(39);
directionalLight.rotateZ(39);
scene.add( directionalLight );
const light = new THREE.AmbientLight( 0x404040 ); // soft white light
// scene.add( light ); 

const STATE_DEFAULT = 0;
const STATE_PLACING = 1;

var controlState = STATE_DEFAULT;
var showingGrid = false;
var beingPlaced = null;
var placingSize = 1;

var tileSize = 0.7;
var tilesRadius = 4;
var tileGlbScale = 0.33;

var gridSize = 100;
var buildingGrid = [];
for(var i = 0; i < gridSize; i++) {
    buildingGrid.push([]);
    for(var j = 0; j < gridSize; j++) {
        buildingGrid[i].push(0);
    }
}

var vertcolMat = new THREE.MeshBasicMaterial({vertexColors: true });
console.log(vertcolMat);
var buildings = {
    "house1" : {
        unlocked : true,
        size : 2,
        modelPath : "./assets/house.glb",
        model : null
    },
    "house2" : {
        unlocked : true,
        size : 1,
        modelPath : "./assets/tree_v2.glb",
        model : null
    }
}
const loader = new GLTFLoader();

var loadedNum = 0;

function loadBuildingModels() {
    var key = Object.keys(buildings)[loadedNum];
    console.log(key)
    loader.load( buildings[key].modelPath, function ( gltf ) {
        gltf.scene.scale.x *= tileGlbScale;
        gltf.scene.scale.y *= tileGlbScale;
        gltf.scene.scale.z *= tileGlbScale;
        console.log(gltf.scene);
        if(gltf.scene.children[0].material) {
            gltf.scene.children[0].material = vertcolMat;
        }
        buildings[key].model = gltf.scene;
        console.log(key)
        loadedNum+= 1;
        if(loadedNum < Object.keys(buildings).length) {
            loadBuildingModels();
        }
    }, undefined, function ( error ) {
        console.error( error );
    } );
}
loadBuildingModels();

function buildingPressed(name) {
    clearGrid();
    console.log("placing: " + name);
    beingPlaced = name;
    placingSize = buildings[name].size;
    placingObjPreview = buildings[name].model.clone();
    placingObjPreview.children[0].material = placingPreviewMat;
    scene.add(placingObjPreview);
    controlState = STATE_PLACING;
}

export { buildings, buildingPressed};

const ground_geo = new THREE.PlaneGeometry( 100, 100);
const ground_mat = new THREE.MeshLambertMaterial( { color: 0x000000, transparent: true, opacity: 0} );
const groundPlane = new THREE.Mesh( ground_geo, ground_mat );
groundPlane.receiveShadow = true;
groundPlane.rotation.x = -3.1415 / 2;
scene.add( groundPlane );

const placingPreviewMat = new THREE.MeshLambertMaterial( { color: 0x999999, transparent: true, opacity: 0.2} );

const composer = new EffectComposer( renderer );
composer.copyPass = new ShaderPass( CopyShader );

const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );
const quant = new QuantizePass();
composer.addPass( quant );

camera.position.z = 5;
camera.position.y = 5;
camera.lookAt(0, 0, 0)

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

var mousePoint = new THREE.Vector3();

var tileObjs = {
    1: [],
    2: []
};
var tileMats = [];

var tile;
var placing1x1;
var placing2x2;
var placingObjPreview;
const tileMat = new THREE.MeshLambertMaterial( { color: 0x000000, transparent: true, opacity: 0.2 } );

loader.load( './assets/tile.glb', function ( gltf ) {
    for(var i = 0; i <= tilesRadius; i++) {
        var op = {x: [0.5, 0.3, 0.1]}.x[i];
        op = 0.5 - i/(2*(tilesRadius+1));
        var matl = new THREE.MeshLambertMaterial( { color: 0x000000, transparent: true, opacity: op } );
        tileMats.push(matl);
    }
    tile = gltf.scene.children[0];
    tile.scale.x *= tileGlbScale;
    tile.scale.z *= tileGlbScale;
    tile.material = tileMat;
    scene.add(tile);
    tile.position.y += 0.5;
    var diam = (2 * tilesRadius + 1);
    for(var i = 0; i < diam*diam; i++) {
        tileObjs[1].push(tile.clone());
        scene.add(tileObjs[1][i]);
    }
    placing1x1 = tile.clone();
}, undefined, function ( error ) {
	console.error( error );
} );
loader.load( './assets/tile2x2.glb', function ( gltf ) {
    var tile2;
    tile2 = gltf.scene.children[0];
    tile2.scale.x *= tileGlbScale;
    tile2.scale.z *= tileGlbScale;
    tile2.material = tileMat;
    scene.add(tile2);
    tile2.position.y += 0.5;
    var diam = (2 * tilesRadius + 1);
    for(var i = 0; i < diam*diam; i++) {
        tileObjs[2].push(tile2.clone());
        scene.add(tileObjs[2][i]);
    }
    placing2x2 = tile.clone();
    scene.remove(tile2);
    clearGrid(); //todo: do after both tile loads are done
}, undefined, function ( error ) {
	console.error( error );
} );


function onPointerMove( event ){

	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	
	raycaster.setFromCamera( mouse, camera );

    const intersects = raycaster.intersectObjects( scene.children );

	for ( let i = 0; i < intersects.length; i ++ ) {
        if(intersects[i].object.uuid == groundPlane.uuid) {
            mousePoint = intersects[i].point;
        }
	}
}

function locationToGridPoint(point) {
    return new THREE.Vector3(
        Math.round(mousePoint.x/tileSize)*tileSize,
        0,
        Math.round(mousePoint.z/tileSize)*tileSize
    );
}

function tryPlaceBuilding() {
    console.log(buildings[beingPlaced]);
    var newBuilding = buildings[beingPlaced].model.clone()
    var point = locationToGridPoint(mousePoint);
    newBuilding.position.set(point.x, point.y, point.z);
    newBuilding.castShadow = true;
    scene.add(newBuilding);
    console.log(point);
    newBuilding.visible = true;
    scene.remove(placingObjPreview);
    placingObjPreview = null;
    return true;
}

function onClick() {
    console.log(buildings);
    var mousePixelY = (mouse.y - 1)/2 * -window.innerHeight;
   if(controlState == STATE_PLACING && mousePixelY < window.innerHeight-130) {
    if(tryPlaceBuilding()) {
        controlState = STATE_DEFAULT;
    }
   }
}
window.addEventListener('click', onClick, { passive: false } );


window.addEventListener('pointermove', onPointerMove, { passive: false } );

function drawGrid() {
    tile.visible = false;
    var mouseGridPoint = new THREE.Vector3(
        Math.round(mousePoint.x/tileSize)*tileSize,
        0,
        Math.round(mousePoint.z/tileSize)*tileSize
        );
    if(tile && mousePoint) {
        for(var x = -tilesRadius; x <= tilesRadius; x++) {
            for(var z = -tilesRadius; z <= tilesRadius; z++) {
                var i = (z + tilesRadius)*(tilesRadius*2 + 1) + x + tilesRadius;
                if(Math.abs(x + z) == 2*tilesRadius || (x + z == 0 && (x == tilesRadius || z == tilesRadius))) {
                    continue
                }
                tileObjs[1][i].visible = true;
                tileObjs[1][i].position.set(
                    mouseGridPoint.x + x*tileSize,
                    mouseGridPoint.y,
                    mouseGridPoint.z + z*tileSize
                    );

                var matI = Math.floor(Math.max(Math.abs(x), Math.abs(z)));
                var dist = Math.max(0, mousePoint.distanceTo(tileObjs[1][i].position) - 0.4);
                tileObjs[1][i].material = tileMats[matI];
                var scale = Math.max(1 - dist/3., 0) * tileGlbScale ;
                tileObjs[1][i].scale.set(scale, scale, scale);
            }   
        }
    }
    showingGrid = true;
 }
function drawPointer() {
    if(!tile) {
        return;
    }

    if(controlState != STATE_PLACING) {
        var x = Math.round(mousePoint.x/tileSize)*tileSize;
        var z = Math.round(mousePoint.z/tileSize)*tileSize;
        tile.visible = true;
        tile.position.set( x, 0, z);
    } else {
        tile.visible = false;
        placing1x1.visible = false;
        placing2x2.visible = false;
        var x = Math.round(mousePoint.x/tileSize)*tileSize;
        var z = Math.round(mousePoint.z/tileSize)*tileSize;
        if(placingSize == 2) {
            x = Math.floor(mousePoint.x/tileSize)*tileSize + tileSize/2.;
            z = Math.floor(mousePoint.z/tileSize)*tileSize + tileSize/2.;
        }
        var cursor;
        if(placingSize == 1) {
            cursor = placing1x1;
        } else if(placingSize == 2) {
            cursor = placing2x2;
        }
        cursor.position.set( x, 0, z);
        cursor.visible = true;
        if(placingObjPreview) {
            placingObjPreview.position.set(x, 0, z);
        }
    }
}

 function clearGrid() {
    var diam = (2 * tilesRadius + 1);
    for(var i = 0; i < diam*diam; i++) {
        tileObjs[1][i].visible = false;
        tileObjs[2][i].visible = false;
    }
    showingGrid = false;
}
function animate() {

    drawPointer();
    if(controlState == STATE_PLACING) {
        drawGrid();
    } else if(controlState == STATE_DEFAULT) {
        if(showingGrid) {
            clearGrid();
        }
    }
	requestAnimationFrame( animate );
	// renderer.render( scene, camera );
    composer.render();
}
animate();