const cubeWidth = 2.5;
const sphereDiameter = cubeWidth*0.15*0.5;

let prevReset = 0;
let sphereGeometry;
let spheres = []; 

const numSpheres = 50;
const gravity = -0.03; 
const elasticity = 0.9;
const reset_timer = 15;

/**
 * Given the source code of a vertex and fragment shader, compiles them,
 * and returns the linked program.
 */
function compileShader(vs_source, fs_source) {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
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


async function loadSphereJSON(url) {
    //Fetch the JSON file containing sphere geometry
    const response = await fetch(url);
    const sphereData = await response.json();

    //Extract data from the JSON
    const positions = sphereData.attributes[0]; //Assuming first set of positions
    const normals = sphereData.attributes[1];   //Assuming second set are normals
    const indices = sphereData.triangles.flat(); //Flatten triangle indices

    //Create buffers for positions, normals, and indices
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions.flat()), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals.flat()), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    //Create a VAO for the sphere geometry
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    //Bind the position buffer to attribute location 0
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); //3 floats per vertex
    gl.enableVertexAttribArray(0);

    //Bind the normal buffer to attribute location 1
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0); //3 floats per normal
    gl.enableVertexAttribArray(1);

    //Bind the index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    //Return the sphere geometry object
    return {
        vao: vao,
        indicesCount: indices.length,
    };
}



function handleSphereCollisons(deltaTime) {
    const clampedDeltaTime = Math.min(deltaTime * 0.2, 0.1);
    const sphereRadius = sphereDiameter;
    const dampingFactor = 0.99;

    for (let i = 0; i < spheres.length; i++) {
        const sphere = spheres[i];

        //Update velocity using Euler's method
        sphere.velocity[1] += gravity * clampedDeltaTime; //Apply gravity

        //Apply damping to velocity (drag effect)
        sphere.velocity = mul(sphere.velocity, dampingFactor);

        //Update position using Euler's method
        sphere.position = add(sphere.position, mul(sphere.velocity, clampedDeltaTime));

        // Handle wall collisions
        for (let j = 0; j < 3; j++) {
            if (sphere.position[j] > cubeWidth / 2 - sphereRadius) {
                sphere.position[j] = cubeWidth / 2 - sphereRadius;
                sphere.velocity[j] *= -elasticity; //Reverse velocity
            } else if (sphere.position[j] < -cubeWidth / 2 + sphereRadius) {
                sphere.position[j] = -cubeWidth / 2 + sphereRadius;
                sphere.velocity[j] *= -elasticity; //Reverse velocity
            }
        }

        //check every ball for other ball collisions
        for (let k = i + 1; k < spheres.length; k++) {
            const other = spheres[k];

            // Calculate distance between sphere centers
            const delta = sub(sphere.position, other.position);
            const distance = Math.sqrt(dot(delta, delta));


            // actual collsion
            if (distance < 2*sphereRadius) {
                const normal = mul(delta, 1 / distance); // Collision normal
                const overlap = 2*sphereRadius - distance;

                // Resolve overlap by moving spheres apart
                const correction = mul(normal, overlap / 2);
                sphere.position = add(sphere.position, correction);
                other.position = sub(other.position, correction);

                // Exchange velocities along the collision normal
                const relativeVelocity = sub(sphere.velocity, other.velocity);
                const velocityAlongNormal = dot(relativeVelocity, normal);

                // Apply impulse for velocity exchange
                const impulse = mul(normal, velocityAlongNormal);
                sphere.velocity = sub(sphere.velocity, impulse);
                other.velocity = add(other.velocity, impulse);
            }
        }
    }
}

function Spheresreset() {
    spheres = [];
    for (let i = 0; i < numSpheres; i++) {
        const yPosition = Math.random() * (cubeWidth / 2 - sphereDiameter / 2) + sphereDiameter / 2;
        spheres.push({
            position: [
                Math.random() * (cubeWidth - sphereDiameter) - (cubeWidth / 2), // Random X
                yPosition, // Random Y
                Math.random() * (cubeWidth - sphereDiameter) - (cubeWidth / 2)  // Random Z
            ],
            velocity: [
                Math.random() * 0.05 - 0.025, // Slower initial X velocity
                0.0, // Start stationary in Y
                Math.random() * 0.05 - 0.025  // Slower initial Z velocity
            ],
            color: [Math.random(), Math.random(), Math.random()],
        });
    }
}



function draw(seconds) {
    //Clear the screen with a white background
    gl.clearColor(1.0, 1.0, 1.0, 1.0); //White background
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    // Set up the light position
    const lightPosition = [3.0, 3.0, 3.0];//Static light position
    gl.uniform3fv(program.uniforms.uLightPosition, lightPosition);

    //Send the projection matrix (precomputed in `window.p`)
    gl.uniformMatrix4fv(program.uniforms.uProjectionMatrix, false, window.p);

    //Bind the sphere geometry VAO
    gl.bindVertexArray(sphereGeometry.vao);

    //Static camera position looking at the origin
    const cameraPosition = [0.0, 0.0, 3.3];
    const viewMatrix = m4view(cameraPosition, [0, 0, 0], [0, 0.5 ,0]);

    //Draw each sphere
    for (const sphere of spheres) {
        //Compute the model matrix for the sphere
        const modelMatrix = m4mul(
            m4trans(...sphere.position), //Translation matrix
            m4scale(sphereDiameter, sphereDiameter, sphereDiameter) //Scaling matrix
        );

        //Combine model and view matrices
        const modelViewMatrix = m4mul(viewMatrix, modelMatrix);

        //Send matrices and sphere color to the GPU
        gl.uniformMatrix4fv(program.uniforms.uModelViewMatrix, false, modelViewMatrix);
        gl.uniform3fv(program.uniforms.uSphereColor, sphere.color);

        //Draw the sphere
        gl.drawElements(gl.TRIANGLES, sphereGeometry.indicesCount, gl.UNSIGNED_SHORT, 0);
    }
}


function tick(milliseconds) {
    //curr time
    const time = milliseconds / 1000;

    //draw
    handleSphereCollisons(time);
    draw(time);

    //reset ball postions every reset_timer
    if (milliseconds  > (reset_timer*1000) + prevReset) {
        prevReset = milliseconds;
        Spheresreset();
    }

    requestAnimationFrame(tick);
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
        gl.viewport(0,0, canvas.width, canvas.height);
        window.p = m4perspNegZ(0.1, 10, 1.3, canvas.width, canvas.height);
    }
}


window.addEventListener('load', async (event) => {

    window.gl = document.querySelector('canvas').getContext('webgl2', {antialias: false, depth: true, preserveDrawingBuffer: true});

    //Load and compile the shaders
    const vertexShaderSource = await fetch('vertex.glsl').then(resp => resp.text());
    const fragmentShaderSource = await fetch('fragment.glsl').then(resp => resp.text());
    program = compileShader(vertexShaderSource, fragmentShaderSource);

    //Use the compiled shader program
    gl.useProgram(program);

    //Enable depth testing to ensure proper 3D rendering
    gl.enable(gl.DEPTH_TEST);

    //Load the sphere geometry from the provided JSON file
    sphereGeometry = await loadSphereJSON("sphere.json");


    //Initialize the spheres with random positions and velocities
    Spheresreset();

    //Set up the canvas to match the screen size
    fillScreen();
    window.addEventListener('resize', fillScreen); //Update canvas size on window resize

    //first draw
    draw();

    //Start the animation loop
    requestAnimationFrame(tick);
});