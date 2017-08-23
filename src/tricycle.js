/*global THREE*/
/*global Physijs*/

Physijs.scripts.worker = 'lib/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

var sceneWidth;
var sceneHeight;
var camera;
var scene;
var renderer;
var dom;
var scoreText;
var car = {};
var score=0;
	
function init() {
    createScene();
    render();
}
function createScene(){
    sceneWidth=window.innerWidth;
    sceneHeight=window.innerHeight;
    var ground_material, car_material, wheel_material, wheel_geometry,big_wheel_geometry, ground_geometry,sun, ground;
	camera = new THREE.PerspectiveCamera( 30, sceneWidth / sceneHeight, 0.1, 1000 );//perspective camera
    renderer = new THREE.WebGLRenderer({alpha:true});//renderer with transparent backdrop
    renderer.shadowMap.enabled = true;//enable shadow
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize( sceneWidth, sceneHeight );
    dom = document.getElementById('TutContainer');
	dom.appendChild( renderer.domElement );
	
	scene = new Physijs.Scene;
	scene.setGravity(new THREE.Vector3( 0, -30, 0 ));
	scene.addEventListener('update', physicsUpdate);
	
	camera.position.set( -120, 50, -120 );
	camera.lookAt( scene.position );
	scene.add( camera );
	
	// Light
	sun = new THREE.DirectionalLight( 0xFFFFFF );
	sun.position.set( 20, 50, -15 );
	sun.castShadow = true;
	sun.shadowCameraLeft = -120;
	sun.shadowCameraTop = -120;
	sun.shadowCameraRight = 100;
	sun.shadowCameraBottom = 100;
	sun.shadowCameraNear = 1;
	sun.shadowCameraFar = 300;
	sun.shadowMapWidth = sun.shadowMapHeight = 512;
	scene.add( sun );
	//var helper = new THREE.CameraHelper( sun.shadow.camera );
	//scene.add( helper );// enable to see the light cone
	
	var damping=0.7;
	// Materials
	ground_material = Physijs.createMaterial(
		new THREE.MeshStandardMaterial( { color: 0x00ff00 } ),
		.9, // high friction
		.4 // low restitution
	);
	// Ground
	ground = new Physijs.BoxMesh(
		new THREE.BoxGeometry(150, 1, 150),
		ground_material,
		0 // mass
	);
	ground.receiveShadow = true;
	scene.add( ground );
	
	// Car
	car_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xff6666 }),
		.9, // high friction
		.2 // low restitution
	);
	wheel_material = Physijs.createMaterial(
		new THREE.MeshLambertMaterial({ color: 0xcccc00 }),
		.9, // high friction
		.5 // medium restitution
	);
	wheel_geometry = new THREE.CylinderGeometry( 2, 2, 1, 10 );
		
	car.body = new Physijs.BoxMesh(
		new THREE.BoxGeometry( 10, 2, 7 ),
		car_material,
		1000
	);
	car.body.position.y = 8;
	car.body.castShadow = true;
	scene.add( car.body );
	
	car.wheel_fm = new Physijs.CylinderMesh(
		wheel_geometry,
		wheel_material,
		500
	);
	car.wheel_fm.rotation.x = Math.PI / 2;
	car.wheel_fm.position.set( -7.5, 6.5, 0 );
	car.wheel_fm.castShadow = true;
	scene.add( car.wheel_fm );
	car.wheel_fm.setDamping(0,damping);
	car.wheel_fm_constraint = new Physijs.DOFConstraint(
		car.wheel_fm, car.body, new THREE.Vector3( -7.5, 6.5, 0 )
	);
	scene.addConstraint( car.wheel_fm_constraint );
	car.wheel_fm_constraint.setAngularLowerLimit({ x: 0, y: -Math.PI / 8, z: 1 });
	car.wheel_fm_constraint.setAngularUpperLimit({ x: 0, y: Math.PI / 8, z: 0 });
	car.wheel_bl = new Physijs.CylinderMesh(
		wheel_geometry,
		wheel_material,
		500
	);
	car.wheel_bl.rotation.x = Math.PI / 2;
	car.wheel_bl.position.set( 3.5, 6.5, 5 );
	//car.wheel_bl.receiveShadow = 
	car.wheel_bl.castShadow = true;
	scene.add( car.wheel_bl );
	car.wheel_bl.setDamping(0,damping);
	car.wheel_bl_constraint = new Physijs.DOFConstraint(
		car.wheel_bl, car.body, new THREE.Vector3( 3.5, 6.5, 5 )
	);
	scene.addConstraint( car.wheel_bl_constraint );
	car.wheel_bl_constraint.setAngularLowerLimit({ x: 0, y: 0, z: 0 });
	car.wheel_bl_constraint.setAngularUpperLimit({ x: 0, y: 0, z: 0 });
		
	car.wheel_br = new Physijs.CylinderMesh(
		wheel_geometry,
		wheel_material,
		500
	);
	car.wheel_br.rotation.x = Math.PI / 2;
	car.wheel_br.position.set( 3.5, 6.5, -5 );
	car.wheel_br.castShadow = true;
	scene.add( car.wheel_br );
	car.wheel_br.setDamping(0,damping);
	car.wheel_br_constraint = new Physijs.DOFConstraint(
		car.wheel_br, car.body, new THREE.Vector3( 3.5, 6.5, -5 )
	);
	scene.addConstraint( car.wheel_br_constraint );
	car.wheel_br_constraint.setAngularLowerLimit({ x: 0, y: 0, z: 0 });
	car.wheel_br_constraint.setAngularUpperLimit({ x: 0, y: 0, z: 0 });
		
	car.carriage = new Physijs.BoxMesh(
		new THREE.BoxGeometry( 16, 7, 5 ),
		car_material,
		200
	);
	car.carriage.position.y = 13;
	car.carriage.position.x = 12;
	car.carriage.castShadow = true;
	scene.add( car.carriage );
		
	car.carriage_constraint = new Physijs.HingeConstraint(
	    car.carriage, // First object to be constrained
		car.body, // OPTIONAL second object - if omitted then physijs_mesh_1 will be constrained to the scene
		new THREE.Vector3( 6, 0, 0 ), // point in the scene to apply the constraint
		new THREE.Vector3( 0, 1, 0 ) // Axis along which the hinge lies - in this case it is the X axis
	);
	scene.addConstraint( car.carriage_constraint );
	car.carriage_constraint.setLimits(
		-Math.PI / 3, // minimum angle of motion, in radians
		Math.PI / 3, // maximum angle of motion, in radians
		0, // applied as a factor to constraint error
		0 // controls bounce at limit (0.0 == no bounce)
	);
		
		/*//this will also work
		car.carriage_constraint = new Physijs.DOFConstraint(
			car.carriage, car.body, new THREE.Vector3( 6, 6.5, 0 )
		);
		scene.addConstraint( car.carriage_constraint );
		car.carriage_constraint.setAngularLowerLimit({ x: 0, y: -Math.PI / 3, z: -Math.PI / 3 });
		car.carriage_constraint.setAngularUpperLimit({ x: 0, y: Math.PI / 3, z: Math.PI / 3 });
		*/
		
	big_wheel_geometry = new THREE.CylinderGeometry( 4, 4, 1, 10 );
		
	car.carriage_wheel_bl = new Physijs.CylinderMesh(
		big_wheel_geometry,
		wheel_material,
		100
	);
	car.carriage_wheel_bl.rotation.x = Math.PI / 2;
	car.carriage_wheel_bl.position.set( 15, 8.3, 4 );
	car.carriage_wheel_bl.castShadow = true;
	scene.add( car.carriage_wheel_bl );
	car.carriage_wheel_bl.setDamping(0,damping);
	car.carriage_wheel_bl_constraint = new Physijs.DOFConstraint(
		car.carriage_wheel_bl, car.carriage, new THREE.Vector3( 15, 8.3, 4 )
	);
	scene.addConstraint( car.carriage_wheel_bl_constraint );
	car.carriage_wheel_bl_constraint.setAngularLowerLimit({ x: 0, y: 0, z: 1 });
	car.carriage_wheel_bl_constraint.setAngularUpperLimit({ x: 0, y: 0, z: 0 });
		
	car.carriage_wheel_br = new Physijs.CylinderMesh(
		big_wheel_geometry,
		wheel_material,
		100
	);
	car.carriage_wheel_br.rotation.x = Math.PI / 2;
	car.carriage_wheel_br.position.set( 15, 8.3, -4 );
	car.carriage_wheel_br.castShadow = true;
	scene.add( car.carriage_wheel_br );
	car.carriage_wheel_br.setDamping(0,damping);
	car.carriage_wheel_br_constraint = new Physijs.DOFConstraint(
		car.carriage_wheel_br, car.carriage, new THREE.Vector3( 15, 8.3, -4 )
	);
	scene.addConstraint( car.carriage_wheel_br_constraint );
	car.carriage_wheel_br_constraint.setAngularLowerLimit({ x: 0, y: 0, z: 1 });
	car.carriage_wheel_br_constraint.setAngularUpperLimit({ x: 0, y: 0, z: 0 });
		
	scene.simulate();
	
	window.addEventListener('resize', onWindowResize, false);//resize callback
	document.onkeydown = handleKeyDown;
	document.onkeyup = handleKeyUp;
	
	scoreText = document.createElement('div');
	scoreText.style.position = 'absolute';
	scoreText.style.width = 100;
	scoreText.style.height = 100;
	scoreText.innerHTML = "0";
	scoreText.style.top = 50 + 'px';
	scoreText.style.left = 100 + 'px';
	document.body.appendChild(scoreText);
};
function handleKeyDown(keyEvent){
    switch( keyEvent.keyCode ) {
		case 37:
		// Left
			car.wheel_fm_constraint.configureAngularMotor( 1, -Math.PI / 3, Math.PI / 3, 1, 200 );
			car.wheel_fm_constraint.enableAngularMotor( 1 );
		break;
		case 39:
		// Right
			car.wheel_fm_constraint.configureAngularMotor( 1, -Math.PI / 3, Math.PI / 3, -1, 200 );
			car.wheel_fm_constraint.enableAngularMotor( 1 );
		break;
		case 38:
		// Up
    		car.wheel_bl_constraint.configureAngularMotor( 2, 1, 0, 6, 2000 );
    		car.wheel_br_constraint.configureAngularMotor( 2, 1, 0, 6, 2000 );
    		car.wheel_bl_constraint.enableAngularMotor( 2 );
    		car.wheel_br_constraint.enableAngularMotor( 2 );
		break;
		case 40:
		// Down
			car.wheel_bl_constraint.configureAngularMotor( 2, 1, 0, -6, 2000 );
			car.wheel_br_constraint.configureAngularMotor( 2, 1, 0, -6, 2000 );
			car.wheel_bl_constraint.enableAngularMotor( 2 );
			car.wheel_br_constraint.enableAngularMotor( 2 );
		break;
	}
}
function handleKeyUp(keyEvent){
   switch( keyEvent.keyCode ) {
		case 37:
		// Left
			car.wheel_fm_constraint.disableAngularMotor( 1 );
		break;
		case 39:
		// Right
		    car.wheel_fm_constraint.disableAngularMotor( 1 );
		break;
		case 38:
		// Up
			car.wheel_bl_constraint.disableAngularMotor( 2 );
			car.wheel_br_constraint.disableAngularMotor( 2 );
		break;
		case 40:
		// Down
			car.wheel_bl_constraint.disableAngularMotor( 2 );
			car.wheel_br_constraint.disableAngularMotor( 2 );
		break;
	}
}
function physicsUpdate(){
    scene.simulate( undefined, 2 );
}	
function render() {
	requestAnimationFrame( render );
	renderer.render( scene, camera );
};
function onWindowResize() {
	//resize & align
	sceneHeight = window.innerHeight;
	sceneWidth = window.innerWidth;
	renderer.setSize(sceneWidth, sceneHeight);
	camera.aspect = sceneWidth/sceneHeight;
	camera.updateProjectionMatrix();
}
window.addEventListener('load', init, false);