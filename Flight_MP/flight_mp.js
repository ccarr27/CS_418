candraw = 1; //variable to check if we can draw
terrain = {};


const IlliniBlue = new Float32Array([0.075, 0.16, 0.292, 1]);
const IlliniOrange = new Float32Array([1, 0.373, 0.02, 1]);
const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

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

/**
 * Sends per-vertex data to the GPU and connects it to a VS input
 * 
 * @param data    a 2D array of per-vertex data (e.g. [[x,y,z,w],[x,y,z,w],...])
 * @param loc     the layout location of the vertex shader's `in` attribute
 * @param mode    (optional) gl.STATIC_DRAW, gl.DYNAMIC_DRAW, etc
 * 
 * @returns the ID of the buffer in GPU memory; useful for changing data later
 */
function supplyDataBuffer(data, loc, mode) {
    if (mode === undefined) mode = gl.STATIC_DRAW
    
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    const f32 = new Float32Array(data.flat())
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode)
    
    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc)
    
    return buf;
}

/**
 * Creates a Vertex Array Object and puts into it all of the data in the given
 * JSON structure, which should have the following form:
 * 
 * ````
 * {"triangles": a list of of indices of vertices
 * ,"attributes":
 *  [ a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 0
 *  , a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 1
 *  , ...
 *  ]
 * }
 * ````
 * 
 * @returns an object with four keys:
 *  - mode = the 1st argument for gl.drawElements
 *  - count = the 2nd argument for gl.drawElements
 *  - type = the 3rd argument for gl.drawElements
 *  - vao = the vertex array object for use with gl.bindVertexArray
 */

function setupGeometry(geom) {
    var triangleArray = gl.createVertexArray();
    gl.bindVertexArray(triangleArray);

    supplyDataBuffer(geom.attributes.normal, 1); //sends the normals to the gpu for lighting calculations
    supplyDataBuffer(geom.attributes.position, 0); //sends the positions to the gpu

    var indices = new Uint16Array(geom.triangles.flat());
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    };
}

function applyFault(vertices, gridsize, centerIndex, faultRadius, displacement) {
    const cx = centerIndex % gridsize; //x coordinate of the center vertex
    const cy = Math.floor(centerIndex / gridsize); //y coordinate of the center vertex

    for (let i = 0; i < gridsize; i++) {
        for (let j = 0; j < gridsize; j++) {
            const dx = cx - j;
            const dy = cy - i;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < faultRadius) {
                //Apply a displacement that decreases with distance from the center
                const factor = (faultRadius - distance) / faultRadius;
                vertices[i * gridsize + j][2] += displacement * factor;
            }
        }
    }
}



function drawTerrain(gridsize, faults){
    if (gridsize < 2) {
        return;
    }

    if (gridsize > 255){
        return;
    }

    vertices = [];
    triangles = [];

    cut = 2 / (gridsize - 1);

    //create verticies
    for (let i = 0; i < gridsize; i++) {
        for (let j = 0; j < gridsize; j++) {
            x = -1 + j * cut;
            y = -1 + i * cut;
            vertices.push([x, y, 0]); //z is zero
        }
    }

    //Generate triangles
    for (let i = 0; i < gridsize - 1; i++) {
        for (let j = 0; j < gridsize - 1; j++) {
            topLeft = i * gridsize + j;
            topRight = topLeft + 1;
            bottomLeft = topLeft + gridsize;
            bottomRight = bottomLeft + 1;

            //we need to push 2 triangles to make 1 square
            triangles.push([bottomLeft, bottomRight, topRight]);
            triangles.push([topLeft, bottomLeft, topRight]);
        }
    }

    //Apply faults
    if (faults > 0) {
        const faultRadius = Math.floor(gridsize / 10); //Adjustable fault radius
        const baseDisplacement = (faults < 10) ? 1.0 : 0.5; //Larger displacement for fewer faults

        for (let i = 0; i < faults; i++) {
            const centerIndex = Math.floor(Math.random() * (gridsize * gridsize));
            const displacement = (Math.random() - 0.5) ;
            
            const faultRadius = (i % 2 === 0) ? Math.floor(gridsize / 20) : Math.floor(gridsize / 5); //Alternate fault sizes
            applyFault(vertices, gridsize, centerIndex, faultRadius, displacement);//go to faults function
        }
    }

    //Find min and max heights
    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (const vertex of vertices) {
        const height = vertex[2];
        if (height < minHeight) minHeight = height;
        if (height > maxHeight) maxHeight = height;
    }

    //use the provided formula to normalize heights
    c = 1; //changes the height of the peaks


    for (let i = 0; i < vertices.length; i++) {
        const height = vertices[i][2];
        //Normalize the height
        vertices[i][2] = c * ((height) - (0.5 * (maxHeight + minHeight))) / (maxHeight - minHeight);
    }
    

    terrain.attributes = {
        position:vertices, 
        normal: []
    };
    terrain.triangles = triangles;
    

    candraw = 1;
}

function addNormals(geom){
    if (!geom.attributes.position) {
        console.error("No position attribute found in geometry.");
        return;
    }
    
    let normals = [];
    for(let i = 0; i < geom.attributes.position.length; i+=1){
        normals.push([0, 0, 0]);  //Initialize all normals to zero
    }
    
    //Calculate normals based on triangles
    for(let i = 0; i < geom.triangles.length; i+=1){
        let p0 = geom.attributes.position[geom.triangles[i][0]];
        let p1 = geom.attributes.position[geom.triangles[i][1]];
        let p2 = geom.attributes.position[geom.triangles[i][2]];
        let e1 = sub(p1, p0);
        let e2 = sub(p2, p0);
        let n = cross(e1, e2);  //Normal vector
        
        normals[geom.triangles[i][0]] = add(normals[geom.triangles[i][0]], n);
        normals[geom.triangles[i][1]] = add(normals[geom.triangles[i][1]], n);
        normals[geom.triangles[i][2]] = add(normals[geom.triangles[i][2]], n);
    }


    for(let i = 0; i < normals.length; i+=1) {
        normals[i] = normalize(normals[i]);
    }
    geom.attributes.normal = normals;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

let cameraPos = [-0.2, 2.8, -1.9]; //Start the camera above the terrain
let cameraFront = [5, -1, 0.4]; //Looking downward initially
let cameraUp = [0, 0, -1]; //The Z-axis is still the up direction, if needed
let cameraSpeed = 0.06; //Adjust the speed of movement
let slowdown = 0.06;
let yaw = -90; //Horizontal rotation (adjust based on your terrain orientation)
let pitch = -330; //Vertical rotation, looking more downward at a 65-degree angle


function updateCamera(deltaTime) {
    let cameraRight = normalize(cross(cameraFront, cameraUp)); //The right vector
    
    if (keysBeingPressed['w']) {
        cameraPos = add(cameraPos, mul(cameraFront, cameraSpeed * deltaTime* slowdown)); //Move forward
    }
    if (keysBeingPressed['s']) {
        cameraPos = sub(cameraPos, mul(cameraFront, cameraSpeed * deltaTime* slowdown)); //Move backward
    }
    if (keysBeingPressed['a']) {
        cameraPos = sub(cameraPos, mul(cameraRight, cameraSpeed * deltaTime* slowdown)); //Move left
    }
    if (keysBeingPressed['d']) {
        cameraPos = add(cameraPos, mul(cameraRight, cameraSpeed * deltaTime* slowdown)); //Move right
    }


    

    //Rotation based on arrow keys
    if (keysBeingPressed['ArrowUp']) {
        pitch -= cameraSpeed * deltaTime;
    }
    if (keysBeingPressed['ArrowDown']) {
        pitch += cameraSpeed * deltaTime;
    }
    if (keysBeingPressed['ArrowLeft']) {
        yaw -= cameraSpeed * deltaTime;
    }
    if (keysBeingPressed['ArrowRight']) {
        yaw += cameraSpeed * deltaTime;
    }


    //Update the cameraFront vector based on yaw and pitch
    let front = [
        Math.cos(degToRad(yaw)) * Math.cos(degToRad(pitch)),
        Math.sin(degToRad(yaw)) * Math.cos(degToRad(pitch)), //Now yaw affects Y
        Math.sin(degToRad(pitch))  //Pitch affects Z-axis
    ];
    cameraFront = normalize(front);


    // console.log(`Camera Position: (${cameraPos[0]}, ${cameraPos[1]}, ${cameraPos[2]})`);
    // console.log(`Camera Front: (${cameraFront[0]}, ${cameraFront[1]}, ${cameraFront[2]})`);
    // console.log(`Camera Up: (${cameraUp[0]}, ${cameraUp[1]}, ${cameraUp[2]})`);
    // console.log(`Yaw: ${yaw}`);
    // console.log(`Pitch: ${pitch}`);
}

//Helper to convert degrees to radians
function degToRad(deg) {
    return deg * (Math.PI / 180);
}



function draw(seconds) {
    gl.clearColor(...IlliniBlue);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //Update camera
    updateCamera(seconds);

    gl.useProgram(program);
    gl.bindVertexArray(geom.vao);

    gl.uniform4fv(program.uniforms.groundColor, [0.827, 0.737, 0.459, 1.0]);

    //Set up lighting
    let ld = normalize([1, 1, 1]);
    let h = normalize(add(ld, [0, 0, 1]));
    gl.uniform3fv(program.uniforms.lightDir, ld);
    gl.uniform3fv(program.uniforms.lightcolor, [1, 1, 1]);
    gl.uniform3fv(program.uniforms.halfway, h);

    //Camera view matrix
    let view = m4view(cameraPos, add(cameraPos, cameraFront), cameraUp);

    //Model matrix remains the identity matrix
    let model = IdentityMatrix;

    //Send matrices to the shader
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(view, model));
    gl.uniformMatrix4fv(program.uniforms.p, false, p); // Projection matrix

    gl.drawElements(geom.mode, geom.count, geom.type, 0);
}

function tick(milliseconds){
    let seconds = milliseconds / 1000;
    draw(seconds);
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
        window.p = m4perspNegZ(0.1, 10, 1, canvas.width, canvas.height);
    }
}


window.addEventListener('load', async (event) => {
    window.gl = document.querySelector('canvas').getContext('webgl2', {antialias: false, depth: true, preserveDrawingBuffer: true});
    let vs = await fetch('terrain_vertex.glsl').then(resp => resp.text());
    let fs = await fetch('terrain_fragment.glsl').then(resp => resp.text());
    window.program = compileShader(vs, fs);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    //Automatically set grid size to 50 and faults to 250
    const gridsize = 50;
    const faults = 250;
    
    //Generate terrain with predefined grid size and fault values
    drawTerrain(gridsize, faults);
    addNormals(terrain);
    window.geom = setupGeometry(terrain);


    //code to read button pressses
    window.keysBeingPressed = {}
    window.addEventListener('keydown', event => keysBeingPressed[event.key] = true)
    window.addEventListener('keyup', event => keysBeingPressed[event.key] = false)


    fillScreen();
    window.addEventListener('resize', fillScreen);
    requestAnimationFrame(tick);
});
