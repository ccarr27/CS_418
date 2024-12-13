let spheres_input = 50;
let spheres = []; 


/**
 * Given the source code of a vertex and fragment shader, compiles them,
 * and returns the linked program.
 */
function compileShader(vertexshader_source, fragmentshader_source) {
    const vertexshader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertexshader, vertexshader_source)
    gl.compileShader(vertexshader)
    if (!gl.getShaderParameter(vertexshader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vertexshader))
        throw Error("Vertex shader compilation failed")
    }

    const fragmentshader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragmentshader, fragmentshader_source)
    gl.compileShader(fragmentshader)
    if (!gl.getShaderParameter(fragmentshader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fragmentshader))
        throw Error("Fragment shader compilation failed")
    }

    const program = gl.createProgram()
    gl.attachShader(program, vertexshader)
    gl.attachShader(program, fragmentshader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }
    
    const uniforms = {}
    for(let i=0; i<gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms

    return program
}


let gridSize;
let grid = new Map();
const cubeWidth = 2.0;

function resetSpherePosition() {
    spheres = [];

    //Generate radii and spheres in one step
    for (let i = 0; i < spheres_input; i++) {
        radius = (Math.random() + 0.25) * (0.75 / Math.cbrt(spheres_input)); //Radius formula
        const mass = Math.pow(radius, 3); //Mass proportional to volume
        radius *= 0.5;

        spheres.push({
            radius: radius,
            mass: mass,
            position: [
                Math.random() * (cubeWidth - 2 * radius) - (cubeWidth / 2 - radius), //Random X
                Math.random() * (cubeWidth / 2 - radius) + radius,                  //Random Y
                Math.random() * (cubeWidth - 2 * radius) - (cubeWidth / 2 - radius) //Random Z
            ],
            velocity: [0.0, 0.0, 0.0], //Start stationary
            color: [Math.random(), Math.random(), Math.random()]
        });
    }

    //Sort spheres in descending order by radius to prioritize larger spheres
    spheres.sort((a, b) => b.radius - a.radius);

    //Set gridSize to slightly larger than the largest radius for efficiency
    gridSize = spheres[0].radius * 3;
}


//index for each cell of the grid
function calculateIndex(position) {
    const x = Math.floor(position[0] / gridSize);
    const y = Math.floor(position[1] / gridSize);
    const z = Math.floor(position[2] / gridSize);
    return `${x},${y},${z}`;
}


function gridUpdate() {
    grid.clear();

    for (let i = 0; i < spheres.length; i++) {
        const cellIndex = calculateIndex(spheres[i].position);

        //Use default pattern for arrays in Map
        if (!grid.has(cellIndex)) grid.set(cellIndex, []);
        grid.get(cellIndex).push(i);
    }
}


const neighborOffragmentshaderets = [
    [0, 0, 0],  //Current cell
    [1, 0, 0], [0, 1, 0], [0, 0, 1],  //Forward x, y, z
    [1, 1, 0], [1, 0, 1], [0, 1, 1],  //Diagonals in positive directions
    [1, 1, 1]                         //Corner diagonal
];


function sphereCollisions() {
    const overlapCorrectionFactor = 0.5; //Smooth correction factor (reduce over-correction)
    const minOverlapThreshold = 1e-6; //Small threshold to ignore tiny overlaps

    for (let i = 0; i < spheres.length; i++) {
        const sphere = spheres[i];
        const cellIndex = calculateIndex(sphere.position);
        const [cellX, cellY, cellZ] = cellIndex.split(',').map(Number);

        //Check current cell and forward neighbors only
        for (const offset of neighborOffragmentshaderets) {
            const neighborCellIndex = `${cellX + offset[0]},${cellY + offset[1]},${cellZ + offset[2]}`;

            if (!grid.has(neighborCellIndex)) continue;

            for (const j of grid.get(neighborCellIndex)) {
                if (i >= j) continue; //Skip duplicate checks

                const other = spheres[j];
                const delta = sub(sphere.position, other.position);
                const distanceSquared = dot(delta, delta);
                const radiusSum = sphere.radius + other.radius;

                if (distanceSquared < radiusSum * radiusSum) { //Check for collision
                    const distance = Math.sqrt(distanceSquared);
                    const overlap = radiusSum - distance;

                    if (overlap > minOverlapThreshold) { //Skip small overlaps
                        const normal = mul(delta, 1 / distance); //Normalized direction

                        //Smoothly correct positions
                        const correction = mul(normal, overlap * overlapCorrectionFactor);
                        sphere.position = add(sphere.position, correction);
                        other.position = sub(other.position, correction);

                        //Impulse response with slight dampening
                        const relativeVelocity = sub(sphere.velocity, other.velocity);
                        const velocityAlongNormal = dot(relativeVelocity, normal);
                        if (velocityAlongNormal < 0) { //Only apply if moving toward each other
                            const impulse = mul(normal, velocityAlongNormal * 0.9); //Dampened response
                            sphere.velocity = sub(sphere.velocity, impulse);
                            other.velocity = add(other.velocity, impulse);
                        }
                    }
                }
            }
        }
    }
}




//Set lighting properties
const lightDirection = [1.0, -1.0, 1.0]; //Directional light direction
const lightColor = [1.0, 1.0, 1.0]; //Light color

function draw() {
    //Clear the screen and depth buffer
    gl.clearColor(1.0, 1.0, 1.0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //Use the compiled shader program
    gl.useProgram(program);

    //Set projection matrix and viewport size
    gl.uniformMatrix4fv(program.uniforms.uProjectionMatrix, false, window.p);
    gl.uniform1f(program.uniforms.uViewportSize, gl.canvas.width);

    gl.uniform3fv(program.uniforms.uLightDirection, lightDirection);
    gl.uniform3fv(program.uniforms.uLightColor, lightColor);

    //Bind sphere colors
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereColorsBuffer);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);

    //Bind sphere radii
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereRadiiBuffer);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    //Bind sphere centers
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereCentersBuffer);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    //Draw spheres as points
    gl.drawArrays(gl.POINTS, 0, spheres.length);
}

const speedMultiplier = 1; //Slows down velocity updates
const elasticity = 0.9;
const gravity = -4;

function updateSpheres(deltaTime) {
    const clampedDeltaTime = Math.min(deltaTime, 0.1);
    const dampingFactor = 0.995;
    const halfCube = cubeWidth / 2;

    for (let sphere of spheres) {
        //Apply scaled gravity and damping
        sphere.velocity[1] = sphere.velocity[1] * dampingFactor + gravity * clampedDeltaTime * speedMultiplier;
        sphere.velocity = mul(sphere.velocity, dampingFactor * speedMultiplier);

        //Update position based on scaled velocity
        sphere.position = add(sphere.position, mul(sphere.velocity, clampedDeltaTime));

        //Clamp position and handle wall collisions
        for (let j = 0; j < 3; j++) {
            const wallLimit = halfCube - sphere.radius;
            if (Math.abs(sphere.position[j]) > wallLimit) {
                sphere.velocity[j] *= -elasticity; //Reverse velocity
                sphere.position[j] = Math.sign(sphere.position[j]) * wallLimit; //Clamp to wall
            }
        }
    }

    gridUpdate();
    sphereCollisions();
}


let fps = 0;

function updateFPS(deltaTime) {
    if (deltaTime > 0) {
        fps = 1 / deltaTime;
        document.querySelector('#fps').innerText = fps.toFixed(1);
    }
}

let lft = 0;
let lr = 0;

function tick(currentTime) {
    const deltaTime = lft ? (currentTime - lft) / 1000 : 0;
    lft = currentTime;

    //Restart simulation every 15 seconds
    if (currentTime - lr > 15000) {
        reset();
    }

    //Update FPS
    updateFPS(deltaTime);

    //reload buf
    updateSpheres(deltaTime);
    reloadbuf();

    draw();
    requestAnimationFrame(tick);
}


function reset() {
    spheres_input = parseInt(document.querySelector('#spheres').value, 10) || spheres_input;
    resetSpherePosition();
    lr = performance.now(); 
}

const CAMERA_SETTINGS = {
    fovy: 1,                    //Field of view
    near: 0.1,                    //Near plane
    far: 50,                     //Far plane
    position: [0, 0, 3.5],        //Camera position
    target: [0, 0, 0],            //Look-at position
    up: [0, 1, 0]                 //Up direction
};

function setupCamera(canvasWidth, canvasHeight) {
    const { fovy, near, far, position, target, up } = CAMERA_SETTINGS;

    //Projection matrix
    const projectionMatrix = m4perspNegZ(near, far, fovy, canvasWidth, canvasHeight);

    //View matrix
    const viewMatrix = m4view(position, target, up);

    //Combine view and projection matrices
    return m4mul(projectionMatrix, viewMatrix);
}

function fillScreen() {
    let canvas = document.querySelector('canvas');
    document.body.style.margin = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    canvas.style.width = '';
    canvas.style.height = '';

    if (window.gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        window.p = setupCamera(canvas.width, canvas.height);
    }
}

function reloadbuf() {
    //Update sphere radii (static buffer)
    const radii = new Float32Array(spheres.map(sphere => sphere.radius));
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereRadiiBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, radii, gl.STATIC_DRAW);

    //Update sphere colors (static buffer)
    const colors = new Float32Array(spheres.flatMap(sphere => sphere.color));
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereColorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    //Update sphere centers (dynamic buffer)
    const centers = new Float32Array(spheres.flatMap(sphere => sphere.position));
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereCentersBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, centers, gl.DYNAMIC_DRAW);
}



window.addEventListener('load', async (event) => {
    document.querySelector('#submit').addEventListener('click', reset);
    window.gl = document.querySelector('canvas').getContext('webgl2', {antialias: false, depth: true, preserveDrawingBuffer: true});
    let vertexshader = await fetch('spheres_vertex.glsl').then(resp => resp.text());
    let fragmentshader = await fetch('spheres_fragment.glsl').then(resp => resp.text());

    program = compileShader(vertexshader, fragmentshader);
    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);

    fillScreen();
    sphereCentersBuffer = gl.createBuffer();
    sphereRadiiBuffer = gl.createBuffer();
    sphereColorsBuffer = gl.createBuffer();
    resetSpherePosition();

    requestAnimationFrame(tick);
});