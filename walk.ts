    import * as THREE from 'three'
    import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
    import Stats from 'three/examples/jsm/libs/stats.module'
    import * as CANNON from 'cannon-es'
    import CannonUtils from './cannonUtils'
    import CannonDebugRenderer from './cannonDebugRenderer'
    // import collisionModel from './collision.json';

    const scene = new THREE.Scene()
    // scene.fog = new THREE.Fog( 0xccddff, 500, 2000 );

    var aLight = new THREE.AmbientLight( 0xffffff );
    scene.add( aLight ); 
    // var sLight = new THREE.SpotLight( 0xffffff );
    // sLight.position.set( 100, 100, 100 );
    // scene.add( sLight );   

    const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    )
    
    const loader = new THREE.CubeTextureLoader();
    const envTexture = loader.load([
        'assets/px.jpg',
        'assets/nx.jpg',
        'assets/py.jpg',
        'assets/ny.jpg',
        'assets/pz.jpg',
        'assets/nz.jpg'
    ]);
    envTexture.encoding = THREE.sRGBEncoding;
    scene.background = envTexture;
    camera.position.set(0, 0, 0)

    const followCamPivot = new THREE.Object3D()
    followCamPivot.rotation.order = 'YXZ'
    const followCam = new THREE.Object3D()
    followCam.position.y = 0
    followCam.position.z = 3
    followCamPivot.add(followCam)

    const renderer = new THREE.WebGLRenderer()
    renderer.physicallyCorrectLights = true; // this option is to load light embed on glb file.
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    document.body.appendChild(renderer.domElement)

    const world = new CANNON.World()
    world.gravity.set(0, -9.82, 0)
    // world.broadphase = new CANNON.NaiveBroadphase();
    // ;(world.solver as CANNON.GSSolver).iterations = 10

    const groundMaterial = new CANNON.Material('groundMaterial')
    const slipperyMaterial = new CANNON.Material('slipperyMaterial')
    const slippery_ground_cm = new CANNON.ContactMaterial(
        groundMaterial,
        slipperyMaterial,
        {
            friction: 0,
            restitution: 0.3,
            contactEquationStiffness: 1e8,
            contactEquationRelaxation: 3,
        }
    )
    world.addContactMaterial(slippery_ground_cm)

    // Character Collider
    const characterCollider = new THREE.Object3D()
    const colliderShape = new CANNON.Sphere(0.5)
    const colliderBody = new CANNON.Body({ mass: 1, material: slipperyMaterial })

    let mixer: THREE.AnimationMixer
    let modelReady = false
    let modelMesh: THREE.Object3D
    const animationActions: THREE.AnimationAction[] = []
    let activeAction: THREE.AnimationAction
    let lastAction: THREE.AnimationAction

    const gltfLoader = new GLTFLoader()
    let cityMesh: THREE.Object3D
    const normalMaterial = new THREE.MeshNormalMaterial()

    gltfLoader.load(
        'models/map.glb',
        (gltf) => {
            gltf.scene.position.x = 0;
            gltf.scene.position.y = 0;
            gltf.scene.position.z = 0;
            gltf.scene.scale.setScalar(1)
            scene.add(gltf.scene);

            gltf.scene.traverse(function (child) {

                if (child.name == 'Rectangle031' || child.name == 'Rectangle003'|| child.name == 'Rectangle004' || child.name == 'Rectangle005' || child.name == 'Rectangle006'|| child.name == 'Rectangle007'|| child.name == 'Rectangle008'|| child.name == 'Rectangle009'|| child.name == 'Rectangle016'|| child.name == 'Rectangle033'|| child.name == 'Rectangle016' ) {
                    cityMesh = child
                    const position = new THREE.Vector3();
                    cityMesh.getWorldPosition(position)
                    // ;(cityMesh as THREE.Mesh).material = normalMaterial
                    const cityShape = CannonUtils.CreateTrimesh(
                        (cityMesh as THREE.Mesh).geometry
                    )
                    const cityBody = new CANNON.Body({ mass: 0, material: groundMaterial })
                    cityBody.position.x = position.x
                    cityBody.position.y = position.y
                    cityBody.position.z = position.z
                    cityBody.addShape(cityShape)
                    world.addBody(cityBody)
                }
            })
            console.log('loaded map')
            gltfLoader.load(
                'models/Idle.glb',
                (gltf) => {
                    mixer = new THREE.AnimationMixer(gltf.scene)
                    let animationAction = mixer.clipAction(gltf.animations[0])
                    animationActions.push(animationAction)
                    activeAction = animationActions[0]
                    scene.add(gltf.scene)
                    modelMesh = gltf.scene
                    console.log('loaded Eve Idle')
                    //add an animation from another file
                    gltfLoader.load(
                        'models/Walking.glb',
                        (gltf) => {
                            let animationAction = mixer.clipAction(gltf.animations[0])
                            animationActions.push(animationAction)
                            console.log('loaded Eve walking')
        
                            gltfLoader.load(
                                'models/Jumping.glb',
                                (gltf) => {
                                    gltf.animations[0].tracks.shift() //delete the specific track that moves the object up/down while jumping
                                    let animationAction = mixer.clipAction(
                                        gltf.animations[0]
                                    )
                                    animationActions.push(animationAction)
                                    //progressBar.style.display = 'none'
                                    modelReady = true
                                    setAction(animationActions[1], true)
                                    console.log('loaded Eve jump')
                                    creatCollider()
                                },
                                (xhr) => {
                                    if (xhr.lengthComputable) {
                                        //const percentComplete = (xhr.loaded / xhr.total) * 100
                                        //progressBar.value = percentComplete
                                        //progressBar.style.display = 'block'
                                    }
                                },
                                (error) => {
                                    console.log(error)
                                }
                            )
                        },
                        (xhr) => {
                        },
                        (error) => {
                            console.log(error)
                        }
                    )
                },
                (xhr) => {
                },
                (error) => {
                    console.log(error)
                }
            )
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        (error) => {
            console.log(error)
        }
    )
    const creatCollider = () => {
        characterCollider.add(followCamPivot)
        characterCollider.position.x = 0
        characterCollider.position.y = 3
        characterCollider.position.z = 0
        scene.add(characterCollider)
    
    
        colliderBody.addShape(colliderShape, new CANNON.Vec3(0, 0.5, 0))
        colliderBody.addShape(colliderShape, new CANNON.Vec3(0, -0.5, 0))
        colliderBody.position.set(
            characterCollider.position.x,
            characterCollider.position.y,
            characterCollider.position.z
        )
        colliderBody.linearDamping = 0.95
        colliderBody.angularFactor.set(0, 1, 0) // prevents rotation X,Z axis
        world.addBody(colliderBody)
    }

    const setAction = (toAction: THREE.AnimationAction, loop: Boolean) => {
        if (toAction != activeAction) {
            lastAction = activeAction
            activeAction = toAction
            lastAction.fadeOut(0.1)
            activeAction.reset()
            activeAction.fadeIn(0.1)
            activeAction.play()
            if (!loop) {
                activeAction.clampWhenFinished = true
                activeAction.loop = THREE.LoopOnce
            }
        }
    }
    let moveForward = false
    let moveBackward = false
    let moveLeft = false
    let moveRight = false
    let canJump = true
    const contactNormal = new CANNON.Vec3()
    const upAxis = new CANNON.Vec3(0, 1, 0)
    colliderBody.addEventListener('collide', function (e: any) {
        const contact = e.contact
        if (contact.bi.id == colliderBody.id) {
            contact.ni.negate(contactNormal)
        } else {
            contactNormal.copy(contact.ni)
        }
        if (contactNormal.dot(upAxis) > 0.5) {
            if (!canJump) {
                setAction(animationActions[1], true)
            }
            canJump = true
        }
    })

    const controls = new PointerLockControls( camera, renderer.domElement );
    const blocker = document.getElementById( 'blocker' ) as HTMLInputElement;
    const instructions = document.getElementById( 'instructions' ) as HTMLInputElement;
    instructions.addEventListener( 'click', function () {

        controls.lock();

    } );
    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        blocker.style.display = 'none';

        document.addEventListener('keydown', onDocumentKey, false)
        document.addEventListener('keyup', onDocumentKey, false)

        renderer.domElement.addEventListener(
            'mousemove',
            onDocumentMouseMove,
            false
        )
        renderer.domElement.addEventListener(
            'mousewheel',
            onDocumentMouseWheel,
            false
        )
    })
    controls.addEventListener('unlock', () => {
        

        document.removeEventListener('keydown', onDocumentKey, false)
        document.removeEventListener('keyup', onDocumentKey, false)

        renderer.domElement.removeEventListener(
            'mousemove',
            onDocumentMouseMove,
            false
        )
        renderer.domElement.removeEventListener(
            'mousewheel',
            onDocumentMouseWheel,
            false
        )

        setTimeout(() => {
            blocker.style.display = 'block';
            instructions.style.display = '';
        }, 1000)
    })

    window.addEventListener('resize', onWindowResize, false)
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
        render()
    }

    const onDocumentMouseMove = (e: MouseEvent) => {
        followCamPivot.rotation.y -= e.movementX * 0.002
        followCamPivot.rotation.x -= e.movementY * 0.002
        return false
    }

    const onDocumentMouseWheel = (e: THREE.Event) => {
        let newVal = followCam.position.z + e.deltaY * 0.05
        if (newVal > 0.25 && newVal < 10) {
            followCam.position.z = newVal
        }
        return false
    }

    const keyMap: { [id: string]: boolean } = {}
    const onDocumentKey = (e: KeyboardEvent) => {
        keyMap[e.code] = e.type === 'keydown'

        if (controls.isLocked) {
            moveForward = keyMap['KeyW']
            moveBackward = keyMap['KeyS']
            moveLeft = keyMap['KeyA']
            moveRight = keyMap['KeyD']

            if (keyMap['Space']) {
                if (canJump === true) {
                    colliderBody.velocity.y = 10
                    setAction(animationActions[2], false)

                }
                canJump = false

            }
        }
    }

    const inputVelocity = new THREE.Vector3()
    const velocity = new CANNON.Vec3()
    const euler = new THREE.Euler()
    const quat = new THREE.Quaternion()
    const camTo = new THREE.Vector3()
    const targetQuaternion = new THREE.Quaternion()
    let distance = 0

    // const stats = new Stats()
    // document.body.appendChild(stats.dom)

    const clock = new THREE.Clock()
    let delta = 0
    const cannonDebugRenderer = new CannonDebugRenderer(scene, world)

    function animate() {
        requestAnimationFrame(animate)

        if (modelReady) {
            if (canJump) {
                //walking
                mixer.update(delta * distance * 5)
            } else {
                //were in the air
                mixer.update(delta)
            }
            const p = characterCollider.position
            p.y -= 1
            modelMesh.position.y = characterCollider.position.y
            distance = modelMesh.position.distanceTo(p)

            const rotationMatrix = new THREE.Matrix4()
            rotationMatrix.lookAt(p, modelMesh.position, modelMesh.up)
            targetQuaternion.setFromRotationMatrix(rotationMatrix)

            if (!modelMesh.quaternion.equals(targetQuaternion)) {
                modelMesh.quaternion.rotateTowards(targetQuaternion, delta * 10)
            }

            if (canJump) {
                inputVelocity.set(0, 0, 0)

                if (moveForward) {
                    inputVelocity.z = -10 * delta
                }
                if (moveBackward) {
                    inputVelocity.z = 10 * delta
                }

                if (moveLeft) {
                    inputVelocity.x = -10 * delta
                }
                if (moveRight) {
                    inputVelocity.x = 10 * delta
                }

                // apply camera rotation to inputVelocity
                euler.y = followCamPivot.rotation.y
                euler.order = 'XYZ'
                quat.setFromEuler(euler)
                inputVelocity.applyQuaternion(quat)
            }

            modelMesh.position.lerp(characterCollider.position, 0.1)
        }
        velocity.set(inputVelocity.x, inputVelocity.y, inputVelocity.z)
        colliderBody.applyImpulse(velocity)

        delta = Math.min(clock.getDelta(), 0.1)
        world.step(delta)

        cannonDebugRenderer.update()

        characterCollider.position.set(
            colliderBody.position.x,
            colliderBody.position.y,
            colliderBody.position.z
        )

        followCam.getWorldPosition(camTo)
        camera.position.lerpVectors(camera.position, camTo, 0.1)

        render()

        // stats.update()
    }

    function render() {
        renderer.render(scene, camera)
    }

    animate()