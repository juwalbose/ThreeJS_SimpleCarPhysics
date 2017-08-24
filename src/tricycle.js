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
var wheel_material, wheel_geometry, big_wheel_geometry;
var damping=0.7;
var friction=0.9;//high
var ball;
	
function init() {
    createScene();
    render();
}
function createScene(){
    sceneWidth=window.innerWidth;
    sceneHeight=window.innerHeight;
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
	
	addWorld();
	addVehicle();
	addBall();
	scene.simulate();
	
	window.addEventListener('resize', onWindowResize, false);//resize callback
	document.onkeydown = handleKeyDown;
	document.onkeyup = handleKeyUp;
	
	scoreText = document.createElement('div');
	scoreText.style.position = 'absolute';
	scoreText.style.width = 100;
	scoreText.style.height = 100;
	scoreText.innerHTML = "0";
	scoreText.style.top = 80 + 'px';
	scoreText.style.left = 100 + 'px';
	document.body.appendChild(scoreText);
	
	var infoText = document.createElement('div');
	infoText.style.position = 'absolute';
	infoText.style.width = 100;
	infoText.style.height = 100;
	infoText.innerHTML = "use arrow keys to drive. collect the blue ball";
	infoText.style.top = 60 + 'px';
	infoText.style.left = 100 + 'px';
	document.body.appendChild(infoText);
};
function addWorld(){
	var ground_material, ground_geometry,sun, ground;
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
	
	ground_material = Physijs.createMaterial(
		new THREE.MeshStandardMaterial( { color: 0x00ff00 } ),friction, .9 // low restitution
	);
	// Ground
	ground = new Physijs.BoxMesh(new THREE.BoxGeometry(150, 1, 150),ground_material,0 // mass
	);
	ground.receiveShadow = true;
	scene.add( ground );
	//walls
	var wall_material = Physijs.createMaterial(
		new THREE.MeshStandardMaterial( { color: 0x444444 } ),friction, .9 // low restitution
	);
	var wallHeight=10;
	var wallLength=150;
	var wall1 = new Physijs.BoxMesh(new THREE.BoxGeometry(wallLength, wallHeight, 2),wall_material,0 // mass
	);
	//wall1.castShadow = true;
	wall1.position.y=wallHeight/2;
	wall1.position.z=wallLength/2;
	scene.add( wall1 );
	var wall2 = new Physijs.BoxMesh(new THREE.BoxGeometry(wallLength, wallHeight, 2),wall_material,0 // mass
	);
	//wall2.castShadow = true;
	wall2.position.y=wallHeight/2;
	wall2.position.z=-wallLength/2;
	scene.add( wall2 );
	var wall3 = new Physijs.BoxMesh(new THREE.BoxGeometry(2, wallHeight, wallLength),wall_material,0 // mass
	);
	//wall3.castShadow = true;
	wall3.position.y=wallHeight/2;
	wall3.position.x=-wallLength/2;
	scene.add( wall3 );
	var wall4 = new Physijs.BoxMesh(new THREE.BoxGeometry(2, wallHeight, wallLength),wall_material,0 // mass
	);
	//wall4.castShadow = true;
	wall4.position.y=wallHeight/2;
	wall4.position.x=wallLength/2;
	scene.add( wall4 );
}
function addVehicle(){
	var car_material = Physijs.createMaterial(new THREE.MeshStandardMaterial({ color: 0xff6666 ,shading:THREE.FlatShading}),friction,.9);
	wheel_material = Physijs.createMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff ,shading:THREE.FlatShading}),friction,.6 // medium restitution
	);
	wheel_geometry = new THREE.CylinderGeometry( 2, 2, 1, 10 );
		
	car.body = new Physijs.BoxMesh(new THREE.BoxGeometry( 10, 2, 7 ),car_material,700);
	car.body.position.y = 8;
	car.body.castShadow = true;
	car.body.name="cart";
	scene.add( car.body );
	
	car.wheel_fm_constraint=addWheel(car.wheel_fm, new THREE.Vector3( -7.5, 6.5, 0 ),false,300);
	car.wheel_fm_constraint.setAngularLowerLimit({ x: 0, y: -Math.PI / 8, z: 1 });
	car.wheel_fm_constraint.setAngularUpperLimit({ x: 0, y: Math.PI / 8, z: 0 });
	car.wheel_bl_constraint=addWheel(car.wheel_bl, new THREE.Vector3( 3.5, 6.5, 5 ),false,500);
	car.wheel_br_constraint=addWheel(car.wheel_br, new THREE.Vector3( 3.5, 6.5, -5 ),false,500);
	
	car.carriage = new Physijs.BoxMesh(new THREE.BoxGeometry( 16, 7, 5 ),car_material,200);
	car.carriage.position.y = 13;
	car.carriage.position.x = 12;
	car.carriage.castShadow = true;
	car.carriage.name="cart";
	scene.add( car.carriage );
		
	car.carriage_constraint = new Physijs.HingeConstraint(
	    car.carriage, // First object to be constrained
		car.body, // constrained to this
		new THREE.Vector3( 6, 0, 0 ), // at this point
		new THREE.Vector3( 0, 1, 0 ) // along this axis
	);
	scene.addConstraint( car.carriage_constraint );
	car.carriage_constraint.setLimits(
		-Math.PI / 3, // minimum angle of motion, in radians
		Math.PI / 3, // maximum angle of motion, in radians
		0, // applied as a factor to constraint error
		0 // controls bounce at limit (0.0 == no bounce)
	);
		/*//this will also work
		car.carriage_constraint = new Physijs.DOFConstraint(	car.carriage, car.body, new THREE.Vector3( 6, 6.5, 0 ));
		scene.addConstraint( car.carriage_constraint );
		car.carriage_constraint.setAngularLowerLimit({ x: 0, y: -Math.PI / 3, z: -Math.PI / 3 });
		car.carriage_constraint.setAngularUpperLimit({ x: 0, y: Math.PI / 3, z: Math.PI / 3 });
		*/
	big_wheel_geometry = new THREE.CylinderGeometry( 4, 4, 1, 10 );
	
	car.carriage_wheel_bl_constraint=addWheel(car.carriage_wheel_bl, new THREE.Vector3( 15, 8.3, 4 ),true,100);
	car.carriage_wheel_bl_constraint.setAngularLowerLimit({ x: 0, y: 0, z: 1 });
	car.carriage_wheel_bl_constraint.setAngularUpperLimit({ x: 0, y: 0, z: 0 });
	car.carriage_wheel_br_constraint=addWheel(car.carriage_wheel_br, new THREE.Vector3( 15, 8.3, -4 ),true,100);	
	car.carriage_wheel_br_constraint.setAngularLowerLimit({ x: 0, y: 0, z: 1 });
	car.carriage_wheel_br_constraint.setAngularUpperLimit({ x: 0, y: 0, z: 0 });
}
function addWheel(wheel, pos, isBig, weight){
	var geometry=wheel_geometry;
	if(isBig){
		geometry=big_wheel_geometry;
	}
	wheel = new Physijs.CylinderMesh(
		geometry,
		wheel_material,
		weight
	);
	wheel.name="cart";
	wheel.rotation.x = Math.PI / 2;
	wheel.position.set(pos.x,pos.y,pos.z);
	wheel.castShadow = true;
	scene.add( wheel );
	wheel.setDamping(0,damping);
	var wheelConstraint = new Physijs.DOFConstraint(
		wheel, car.body, pos
	);
	if(isBig){
		wheelConstraint = new Physijs.DOFConstraint(
		wheel, car.carriage, pos);
	}
	scene.addConstraint( wheelConstraint );
	wheelConstraint.setAngularLowerLimit({ x: 0, y: 0, z: 0 });
	wheelConstraint.setAngularUpperLimit({ x: 0, y: 0, z: 0 });
	return wheelConstraint;
}
function addBall(){
	var ball_material = Physijs.createMaterial(new THREE.MeshStandardMaterial({ color: 0x0000ff ,shading:THREE.FlatShading}),friction,.9 // good restitution
	);
	var ball_geometry = new THREE.SphereGeometry( 2,16,16);
		
	ball = new Physijs.SphereMesh(ball_geometry,ball_material,20);
	ball.castShadow = true;
	releaseBall();
	scene.add( ball );
	ball.setDamping(0,0.9);
	
	ball.addEventListener( 'collision', onCollision);
}
function releaseBall(){
	var range =10+Math.random()*30;
	ball.position.y = 16;
	ball.position.x = ((2*Math.floor(Math.random()*2))-1)*range;
	ball.position.z = ((2*Math.floor(Math.random()*2))-1)*range;
	ball.__dirtyPosition = true;//disable physics temporarily
    
    // You also want to cancel the object's velocity
    ball.setLinearVelocity(new THREE.Vector3(0, 0, 0));
    ball.setAngularVelocity(new THREE.Vector3(0, 0, 0));
}
function onCollision(other_object, linear_velocity, angular_velocity ){
	if(other_object.name==="cart"){
		score++;
		releaseBall();
		scoreText.innerHTML=score.toString();
	}
}
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