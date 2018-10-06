var renderer = null, 
scene = null, 
camera = null,
root = null,
robot_idle = null,
robot_attack = null,
flamingo = null,
stork = null,
group = null,
orbitControls = null,
raycaster = null,
currentSize = null;

var robot_mixer = {};
var deadAnimator;
var morphs = [];

var duration = 20000; // ms
var currentTime = Date.now();

var animation = "idle";

var mouse = new THREE.Vector2(), CLICKED, INTERSECTED;

var canvas = null;

function changeAnimation(animation_text)
{
    animation = animation_text;

    if(animation =="dead")
    {
        createDeadAnimation();
    }
    else
    {
        robot_idle.rotation.x = 0;
        robot_idle.position.y = -4;
    }
}

function createDeadAnimation()
{
     deadAnimator = new KF.KeyFrameAnimator;
        deadAnimator.init({ 
            interps:
                [
                    { 
                        keys:[0, 1], 
                        values:[
                                { x : 0 },
                                { x : - Math.PI / 3 },
                                ],
                        target:robot_idle.rotation
                    },
                ],
            loop: false,
            duration:duration / 10
        });
        deadAnimator.start();
}

function loadFBX()
{
    var loader = new THREE.FBXLoader();
    loader.load( '../models/Robot/robot_idle.fbx', function ( object ) 
    {
        robot_mixer["idle"] = new THREE.AnimationMixer( scene );
        object.scale.set(0.02, 0.02, 0.02);
        object.position.y -= 4;
        object.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        } );
        robot_idle = object;
        scene.add( robot_idle );
        
        createDeadAnimation();

        robot_mixer["idle"].clipAction( object.animations[ 0 ], robot_idle ).play();

        loader.load( '../models/Robot/robot_atk.fbx', function ( object ) 
        {
            robot_mixer["attack"] = new THREE.AnimationMixer( scene );
            robot_mixer["attack"].clipAction( object.animations[ 0 ], robot_idle ).play();
        } );

        loader.load( '../models/Robot/robot_run.fbx', function ( object ) 
        {
            robot_mixer["run"] = new THREE.AnimationMixer( scene );
            robot_mixer["run"].clipAction( object.animations[ 0 ], robot_idle ).play();
        } );

        loader.load( '../models/Robot/robot_walk.fbx', function ( object ) 
        {
            robot_mixer["walk"] = new THREE.AnimationMixer( scene );
            robot_mixer["walk"].clipAction( object.animations[ 0 ], robot_idle ).play();
        } );
    } );
}

function animate() {

    var now = Date.now();
    var deltat = now - currentTime;
    currentTime = now;

    if(robot_idle && robot_mixer[animation])
    {
        robot_mixer[animation].update(deltat * 0.001);
    }

    if(animation =="dead")
    {
        KF.update();
        robot_mixer["walk"].update(deltat * 0.001);
    }
}

function run() {
    requestAnimationFrame(function() { run(); });
    
        // Render the scene
        renderer.render( scene, camera );

        // Spin the cube for next frame
        animate();

        // Update the camera controller
        orbitControls.update();
}

function setLightColor(light, r, g, b)
{
    r /= 255;
    g /= 255;
    b /= 255;
    
    light.color.setRGB(r, g, b);
}

var directionalLight = null;
var spotLight = null;
var ambientLight = null;
var mapUrl = "../images/checker_large.gif";

var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048;

function createScene(canvas) {

    this.canvas = canvas;
    
    // Create the Three.js renderer and attach it to our canvas
    renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );

    // Set the viewport size
    renderer.setSize(canvas.width, canvas.height);

    // Turn on shadows
    renderer.shadowMap.enabled = true;
    // Options are THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create a new Three.js scene
    scene = new THREE.Scene();

    // Add  a camera so we can view the scene
    camera = new THREE.PerspectiveCamera( 45, canvas.width / canvas.height, 1, 4000 );
    camera.position.set(-15, 6, 30);
    scene.add(camera);

    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        
    // Create a group to hold all the objects
    root = new THREE.Object3D;
    
    spotLight = new THREE.SpotLight (0xffffff);
    spotLight.position.set(-30, 8, -10);
    spotLight.target.position.set(-2, 0, -2);
    root.add(spotLight);

    spotLight.castShadow = true;

    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 200;
    spotLight.shadow.camera.fov = 45;
    
    spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

    ambientLight = new THREE.AmbientLight ( 0x888888 );
    root.add(ambientLight);
    
    // Create the objects
    loadFBX();
    /*geometry = new THREE.BoxBufferGeometry( 1, 1, 1 );
    var object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
    scene.add(object);*/

    // Create a group to hold the objects
    group = new THREE.Object3D;
    root.add(group);

    // Create a texture map
    var map = new THREE.TextureLoader().load(mapUrl);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(8, 8);

    var color = 0xffffff;

    // Put in a ground plane to show off the lighting
    geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:color, map:map, side:THREE.DoubleSide}));

    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -4.02;
    
    // Add the mesh to our group
    group.add( mesh );
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    
    // Now add the group to our scene
    scene.add( root );

    raycaster = new THREE.Raycaster();
        

    document.addEventListener('mousedown', onDocumentMouseDown);
    //document.addEventListener( 'mousemove', onDocumentMouseMove );
    window.addEventListener( 'resize', onWindowResize);
}

function onWindowResize() 
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onDocumentMouseDown(event)
{
    currentSize = renderer.getSize();
    event.preventDefault();
    event.preventDefault();
    mouse.x = ( event.clientX / currentSize.width ) * 2 - 1;
    mouse.y = - ( event.clientY / currentSize.height ) * 2 + 1;

    if (event.clientX > canvas.width || event.clientY > canvas.height)
        return false;

    console.log("mouse down");

    // find intersections
    raycaster.setFromCamera( mouse, camera );

    var intersects = raycaster.intersectObjects( scene.children, true );

    console.log(intersects);

    if ( intersects.length > 0 ) 
    {
        console.log("intersects something");
        CLICKED = intersects[ 0 ].object;
        CLICKED.material.emissive.setHex( 0x00ff00 );

        /*if(!animator.running)
        {
            for(var i = 0; i<= animator.interps.length -1; i++)
            {
                animator.interps[i].target = CLICKED.rotation;
            }
            // playAnimations();
        }*/
    } 
    else 
    {
        if ( CLICKED ) 
            CLICKED.material.emissive.setHex( CLICKED.currentHex );

        CLICKED = null;
    }
}

function onDocumentMouseMove( event ) 
{
    currentSize = renderer.getSize();
    event.preventDefault();
    mouse.x = ( event.clientX / currentSize.width ) * 2 - 1;
    mouse.y = - ( event.clientY / currentSize.height ) * 2 + 1;

    // find intersections
    raycaster.setFromCamera( mouse, camera );

    var intersects = raycaster.intersectObjects( scene.children );
    console.log("Moving");

    if ( intersects.length > 0 ) 
    {
        if ( INTERSECTED != intersects[ 0 ].object ) 
        {
            if ( INTERSECTED )
                INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );

            INTERSECTED = intersects[ 0 ].object;
            INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
            INTERSECTED.material.emissive.setHex( 0xff0000 );
        }
    } 
    else 
    {
        if ( INTERSECTED ) 
            INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );

        INTERSECTED = null;
    }
}