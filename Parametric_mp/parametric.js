candraw = 0; //variable to check if we can draw
terrain = {};


const IlliniBlue = new Float32Array([1, 1, 1, 1]);
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




function generate(rings, slices, torus){
    vertices = []; // Array to store the 3D coordinates of all generated vertices.
    triangles = []; // Array to store indices representing the triangular faces of the geometry.
    const normals = []; // Array to store normal vectors for lighting calculations.

    if(torus){
        // Check if a torus shape needs to be generated.
        // Ensure sufficient subdivisions to form a meaningful torus shape.
        if(rings < 3 || slices < 3){
            return;
        }
        const majorRadius = 0.7;
        const minorRadius = 0.3;
    
        for (let i = 0; i <= rings; i++) {
            const theta = (i / rings) * 2 * Math.PI;
            const cosTheta = Math.cos(theta);
            const sinTheta = Math.sin(theta);
    
            for (let j = 0; j <= slices; j++) {
                const phi = (j / slices) * 2 * Math.PI;
                const cosPhi = Math.cos(phi);
                const sinPhi = Math.sin(phi);


                const nx = cosTheta * cosPhi;
                const ny = cosTheta * sinPhi;
                const nz = sinTheta;
                normals.push([nx, ny, nz]);
    

                const x = (majorRadius + minorRadius * cosTheta) * cosPhi;
                const y = (majorRadius + minorRadius * cosTheta) * sinPhi;
                const z = minorRadius * sinTheta;
                vertices.push([x, y, z]);
    
    
                if (i < rings && j < slices) {
                    const first = i * (slices + 1) + j;
                    const second = first + slices + 1;
                    triangles.push([first, second, first + 1]);
                    triangles.push([second, second + 1, first + 1]);
                }
            }
        }
        // Assign position and normal attributes to the terrain object.
    
        terrain.attributes = {
            position: vertices,
            normal: normals
        };
        terrain.triangles = triangles;
    }
    else{
        // Check if a sphere shape needs to be generated.
        // Ensure sufficient subdivisions to form a meaningful sphere shape.
        if (rings < 1 || slices < 3) {
            return; 
        }
    
        const radius = 1;
        if(rings == 1){
            rings += 1;
        }
        for (let i = 0; i <= rings; i++) {
            const theta = (i / rings) * Math.PI; 
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
    
            for (let j = 0; j <= slices; j++) {
                const phi = (j / slices) * 2 * Math.PI;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
    
                const x = radius * sinTheta * cosPhi;
                const y = radius * cosTheta;
                const z = radius * sinTheta * sinPhi;
                vertices.push([x, y, z]);
    
                const nx = x / radius;
                const ny = y / radius;
                const nz = z / radius;
                normals.push([nx, ny, nz]);
    
                if (i < rings && j < slices) {
                    const first = i * (slices + 1) + j;
                    const second = first + slices + 1;
                    triangles.push([first, second, first + 1]);
                    triangles.push([second, second + 1, first + 1]);
                }
            }
        }
        // Assign position and normal attributes to the terrain object.
        terrain.attributes = {
            position: vertices,
            normal: normals
        };
        terrain.triangles = triangles;
    }
    
    // Enable the draw function to render the generated geometry.
    candraw = 1;
}



function draw(seconds) {
    if (!candraw) { // If we can't draw yet, return
        return; 
    }

    gl.clearColor(...IlliniBlue);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Activate the shader program
    gl.useProgram(program);

    // Bind the vertex array
    gl.bindVertexArray(geom.vao);

    // Setting the ground color
    gl.uniform4fv(program.uniforms.groundColor, [1, 0.4, 0.2, 1.0]);

    // Rotate the camera around the Z-axis
    let radius = 3; // Distance from the camera to the terrain
    let angle = seconds; // Controls the rotation speed and angle
    let eye = [Math.sin(angle) * radius, Math.cos(angle) * radius, -1.4]; // Camera position (rotating around Z-axis)
    let center = [0, 0, 0]; // Looking at the center of the terrain
    let up = [0, 0, -1]; // Z-axis is now the "up" direction since we are rotating around the Z-axis
    let v = m4view(eye, center, up);  // View matrix

    // Set light to rotate around the Y-axis relative to the terrain
    let lightRadius = 5; // Distance of the light from the center of the terrain
    let lightAngle = -1.5*seconds; // Rotation speed for the light
    let lightHeight = 3.0; // Fixed height of the light above the terrain
    let lightPosition = [
        Math.sin(lightAngle) * lightRadius, // Light's X position
        0.0, // Fixed Y position (rotates around Y-axis)
        Math.cos(lightAngle) * lightRadius // Light's Z position
    ];
    let ld = normalize(lightPosition); // Normalize for lighting calculations
    let h = normalize(add(ld, [0, 0, 1])); // Halfway vector for lighting

    // Pass lighting data to the shader
    gl.uniform3fv(program.uniforms.lightDir, ld);
    gl.uniform3fv(program.uniforms.lightcolor, [1, 1, 1]);
    gl.uniform3fv(program.uniforms.halfway, h);

    // The model matrix is now just an identity matrix (no terrain rotation)
    let m = IdentityMatrix;

    // Send the matrices to the shader
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, m)); // Model-View matrix
    gl.uniformMatrix4fv(program.uniforms.p, false, p); // Projection matrix

    // Draw the terrain
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
    let vs = await fetch('para_vertex.glsl').then(resp => resp.text());
    let fs = await fetch('para_fragment.glsl').then(resp => resp.text());
    window.program = compileShader(vs, fs);


    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    document.querySelector('#submit').addEventListener('click', event => {
        const rings = Number(document.querySelector('#rings').value);
        const slices = Number(document.querySelector('#slices').value);
        const torus = document.querySelector('#torus').checked;
        // TO DO: generate a new gridsize-by-gridsize grid here, then apply faults to it
        generate(rings, slices, torus);
        window.geom = setupGeometry(terrain);
    })
    
    fillScreen();
    window.addEventListener('resize', fillScreen);
    requestAnimationFrame(tick);
});