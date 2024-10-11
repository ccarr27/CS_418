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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

var tetrahedron =
    {"triangles":
        [0,1,2, 
        0,2,3, 
        0,3,1, 
        1,2,3]
    ,"attributes":
        [ // position
            [[1,1,1], [-1,-1,1], [-1,1,-1], [1,-1,-1]]
        , // color
            [[1,1,1], [0,0,1], [0,1,0], [1,0,0]]
        ]
    }


/** Draw one frame */
function draw(seconds) {
    gl.clearColor(...IlliniBlue) // f(...[1,2,3]) means f(1,2,3)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)

    //intialize vertex arrays for octohedron
    gl.bindVertexArray(geom_oct.vao)
    gl.uniformMatrix4fv(program.uniforms.p, false, p)


    //color
    gl.uniform4fv(program.uniforms.color, IlliniOrange)

    //refrence mPositions
    let v = m4view([3.1,1,4.5], [0,0,0], [0,1,0])

    //spin speed for octahedrals
    let sun = m4rotY(seconds*Math.PI)
    let earth_rot = m4rotY(seconds*Math.PI*2)
    let mars_rot = m4rotY(seconds*Math.PI*2/2.2)

    //sun
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,sun))
    gl.drawElements(geom_oct.mode, geom_oct.count, geom_oct.type, 0)

    //earth
    let earth = m4mul(m4rotY(seconds/3), m4trans(2.8, 0, 0), earth_rot, m4scale(0.45, 0.45, 0.45));
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, earth));
    gl.drawElements(geom_oct.mode, geom_oct.count, geom_oct.type, 0);

    //mars
    let mars = m4mul(m4rotY(seconds/3/1.9), m4trans(2.8*1.6, 0, 0), mars_rot, m4scale(0.3, 0.3, 0.3));
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, mars));
    gl.drawElements(geom_oct.mode, geom_oct.count, geom_oct.type, 0);

    //tetrahedron
    gl.bindVertexArray(geom.vao)
    gl.uniformMatrix4fv(program.uniforms.p, false, p);

    //spin speed for tetrahedon

    //moon
    let moon = m4mul(m4rotY(seconds/2000), m4trans(1.6, 0, 0) ,m4scale(0.18, 0.18, 0.18));
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, m4mul(earth, moon)));
    gl.drawElements(geom.mode, geom.count, geom.type, 0);

    //phobos
    let phobos = m4mul(m4rotY(seconds/2000), m4trans(1.5, 0, 0),m4scale(0.12, 0.12, 0.12));
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, m4mul(mars, phobos)));
    gl.drawElements(geom.mode, geom.count, geom.type, 0);

    //Deimos
    let deimos = m4mul(m4rotY(seconds), m4trans(1.5*2, 0, 0) ,m4scale(0.18, 0.18, 0.18));
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, m4mul(mars, deimos)));
    gl.drawElements(geom.mode, geom.count, geom.type, 0);




    

    // let wrapped = seconds % 4
    // let stage = Math.floor(wrapped)
    // let t = wrapped - stage
    // if (stage == 0) {
    //     tr = m4trans(1,0,1*(1-t) + -1*(t))
    // } else if (stage == 1) { 
    //     tr = m4trans(...lerp(t, [1,0,-1], [-1,0,-1]))
    // } else if (stage == 2) { 
    //     tr = m4trans(...lerp(t, [-1,0,-1], [-1,0,1]))
    // } else { // stage == 3
    //     tr = m4trans(...lerp(t, [-1,0,1], [1,0,1]))
    // }

    // let m2 = m4mul(tr, m4scale(0.5, 0.5, 0.5))
    // gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,m2))
    // gl.drawElements(geom.mode, geom.count, geom.type, 0)

    // let m3 = m4mul(m, m4trans(0,1,0), m4scale(0.5, 0.5, 0.5), m4rotZ(seconds))
    // gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,m3))
    // gl.drawElements(geom.mode, geom.count, geom.type, 0)

    // let m4 = m4mul(m3, m4trans(1,0,0), m4scale(0.5, 0.5, 0.5))
    // gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,m4))
    // gl.drawElements(geom.mode, geom.count, geom.type, 0)


    //now initialize triangles
    gl.bindVertexArray(geom.vao)
}

/** Compute any time-varying or animated aspects of the scene */
function tick(milliseconds) {
    let seconds = milliseconds / 1000;

    draw(seconds)
    requestAnimationFrame(tick)
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
        window.p = m4perspNegZ(0.1, 10, 1.5, canvas.width, canvas.height)
    }
}

/** Compile, link, set up geometry */
window.addEventListener('load', async (event) => {
    window.gl = document.querySelector('canvas').getContext('webgl2',
        // optional configuration object: see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
        {antialias: false, depth:true, preserveDrawingBuffer:true}
    )
    let vs = document.querySelector('#vert').textContent.trim()
    let fs = document.querySelector('#frag').textContent.trim()
    window.program = compileShader(vs,fs)
    gl.enable(gl.DEPTH_TEST)
    window.geom = setupGeomery(tetrahedron)
    window.geom_oct = setupGeomery(octahedron)
    fillScreen()
    window.addEventListener('resize', fillScreen)
    requestAnimationFrame(tick)
})