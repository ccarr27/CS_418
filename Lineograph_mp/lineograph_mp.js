const IlliniBlue = new Float32Array([0.075, 0.16, 0.292, 1])
const IlliniOrange = new Float32Array([1, 0.373, 0.02, 1])
const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])

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
function setupGeomery(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    for(let i=0; i<geom.attributes.length; i+=1) {
        let data = geom.attributes[i]
        supplyDataBuffer(data, i)
    }

    var indices = new Uint16Array(geom.triangles.flat())
    var indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

var octahedron =
    {"triangles":
        [0,1,2, 
        0,2,3, 
        0,3,4, 
        0,4,1, 
        5,1,4, 
        5,4,3, 
        5,3,2, 
        5,2,1]
    ,"attributes":
        [ // position
            [[1,0,0],[0,1,0],[0,0,1],[0,-1,0],[0,0,-1],[-1,0,0]]
        , // color
            [[1,0.5,0.5],[0.5,1,0.5],[0.5,0.5,1],[0.5,0,0.5],[0.5,0.5,0],[0,0.5,0.5]]
        ]
    }

let moveStep = 0.1;  // Smaller step size
let x = 0;
let y = 0;
let z = 0;


function draw(seconds) {
    gl.useProgram(program);
    gl.bindVertexArray(geom.vao);
    gl.uniform4fv(program.uniforms.color, IlliniOrange);

    //Adjust the camera to view the object head-on along the Z-axis
    let v = m4view([0, 0, 18], [0, 0, 0], [0, 1, 0]); //camera view, set to 20 to look further away

    // Handle movements with smaller step size
    if (keysBeingPressed['q']) z -= moveStep;  //Move deeper into the screen (negative Z)
    if (keysBeingPressed['e']) z += moveStep;  //Move closer to the camera (positive Z)
    if (keysBeingPressed['w']) y += moveStep;  //Move up along the Y-axis
    if (keysBeingPressed['s']) y -= moveStep;  //Move down along the Y-axis
    if (keysBeingPressed['a']) x -= moveStep;  //Move left along the X-axis
    if (keysBeingPressed['d']) x += moveStep;  //Move right along the X-axis

    //Apply transformations
    let m = m4trans(x, y, z);
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, m));
    gl.uniformMatrix4fv(program.uniforms.p, false, p);
    gl.drawElements(geom.mode, geom.count, geom.type, 0);
}


/** Compute any time-varying or animated aspects of the scene */
function tick(milliseconds) {
    let seconds = milliseconds / 1000;

    draw(seconds)
    requestAnimationFrame(tick)
}

/** Resizes the canvas to completely fill the screen */
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
        /////////////////////////////
        gl.clearColor(...IlliniBlue);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        /////////////////////////////
        window.p = m4perspNegZ(.1, 50, 2.1, canvas.width, canvas.height);
    }
}

/** Resizes the canvas to completely fill the screen */
function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    if (window.gl) {
        gl.viewport(0,0, canvas.width, canvas.height)
        gl.clearColor(...IlliniBlue); // f(...[1,2,3]) means f(1,2,3)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        window.p = m4perspNegZ(.1, 19, 2, canvas.width, canvas.height); //middle number has to be bigger than v number
    }
}

/** Compile, link, set up geometry */
window.addEventListener('load', async (event) => {
    window.gl = document.querySelector('canvas').getContext('webgl2',
        {antialias: false, depth:true, preserveDrawingBuffer:true}
    )
    let vs = await fetch('lineograph_vertex.glsl').then(resp => resp.text());
    let fs = await fetch('lineograph_fragment.glsl').then(resp => resp.text());
    window.program = compileShader(vs,fs)
    gl.enable(gl.DEPTH_TEST)
    window.geom = setupGeomery(octahedron)
    fillScreen()
    window.addEventListener('resize', fillScreen)
    ///////////////
    window.keysBeingPressed = {};
    window.addEventListener('keydown', event => keysBeingPressed[event.key] = true);
    window.addEventListener('keyup', event => keysBeingPressed[event.key] = false);
    //////////////
    requestAnimationFrame(tick)
})