candraw = 0; //variable to check if we can draw
terrain = {};
true_if_texture = false; //check what fragment shader to use


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

    ///////////////////////////
    if(geom.attributes.tcoord){
        supplyDataBuffer(geom.attributes.tcoord, 2); //attribute 2 for texture coordinate mapping
    }
    ///////////////////////////////////////////

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



function drawTerrain(gridsize, faults) {
    if (gridsize < 2) {
        return;
    }

    if (gridsize > 255){
        return;
    }

    vertices = [];
    triangles = [];

    //////////////////
    let textureCoords = [];
    /////////////////

    const cut = 2 / (gridsize - 1);
    const texcut = 1 / (gridsize - 1); // Texture coordinate step

    // Create vertices
    for (let i = 0; i < gridsize; i++) {
        for (let j = 0; j < gridsize; j++) {
            const x = -1 + j * cut;
            const y = -1 + i * cut;
            vertices.push([x, y, 0]); // z is initially zero

            // Set texture coordinates
            const v = i * texcut; // Texture v-coordinate
            const u = j * texcut; // Texture u-coordinate

            textureCoords.push([u, v]);
        }
    }

    // Generate triangles
    for (let i = 0; i < gridsize - 1; i++) {
        for (let j = 0; j < gridsize - 1; j++) {
            const topLeft = i * gridsize + j;
            const topRight = topLeft + 1;
            const bottomLeft = topLeft + gridsize;
            const bottomRight = bottomLeft + 1;

            // Push 2 triangles to make 1 square
            triangles.push([bottomLeft, bottomRight, topRight]);
            triangles.push([topLeft, bottomLeft, topRight]);
        }
    }

    // Apply faults if needed
    if (faults > 0) {
        const faultRadius = Math.floor(gridsize / 10); // Adjustable fault radius
        const baseDisplacement = (faults < 10) ? 1.0 : 0.5; // Larger displacement for fewer faults

        for (let i = 0; i < faults; i++) {
            const centerIndex = Math.floor(Math.random() * (gridsize * gridsize));
            const displacement = (Math.random() - 0.5);

            const faultRadius = (i % 2 === 0) ? Math.floor(gridsize / 20) : Math.floor(gridsize / 5); // Alternate fault sizes
            applyFault(vertices, gridsize, centerIndex, faultRadius, displacement); // go to faults function
        }
    }

    // Find min and max heights
    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (const vertex of vertices) {
        const height = vertex[2];
        if (height < minHeight) minHeight = height;
        if (height > maxHeight) maxHeight = height;
    }

    // Normalize heights if there is a range (to prevent division by zero)
    const c = 1; // Controls the height of the peaks
    if (maxHeight > minHeight) {
        for (let i = 0; i < vertices.length; i++) {
            const height = vertices[i][2];
            vertices[i][2] = c * ((height) - (0.5 * (maxHeight + minHeight))) / (maxHeight - minHeight);
        }
    }

    terrain.attributes = {
        position: vertices,
        tcoord: textureCoords,
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



function change_texture(input, gl) {
    
    //check if hex color
    if (/[.](jpg|png)$/i.test(input)) {
        console.info("Using Texture.");
        const img = new Image();
        img.crossOrigin = 'anonymous'; 
        img.src = input;

        img.addEventListener('error', () => {
            //if image does not exist
            console.error("no image corresponding to this name");
            gl.useProgram(colorProgram);
            gl.uniform4f(colorProgram.uniforms.groundColor, 1, 0, 1, 0); //color told to use
            return;
        });

        img.addEventListener('load', () => {
            true_if_texture = true;
            const sslot = 0;
            const texture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0 + sslot);
            gl.bindTexture(gl.TEXTURE_2D, texture);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.generateMipmap(gl.TEXTURE_2D);

            gl.useProgram(textureProgram);
            gl.uniform1i(textureProgram.uniforms.utex, sslot);
            
            console.log(img);
        });

    } 
    //image if ends with jpg or ong
    else if (/^#[0-9a-f]{8}$/i.test(input)) {
        console.info("Using color.");
        true_if_texture = false;
        const red = parseInt(input.substr(1, 2), 16) / 255;
        const green = parseInt(input.substr(3, 2), 16) / 255;
        const blue = parseInt(input.substr(5, 2), 16) / 255;
        const alpha = parseInt(input.substr(7, 2), 16) / 255;

        //use color texture
        gl.useProgram(colorProgram);
        gl.uniform4f(colorProgram.uniforms.groundColor, red, green, blue, alpha);
    } 
    else {
        console.info("No color or texture inputed.");
        gl.useProgram(colorProgram);
        gl.uniform4f(colorProgram.uniforms.groundColor, 1,1,1,0.3);
        true_if_texture = false;
    }
}



function draw(seconds) {
    if (!candraw) { // If we can't draw yet, return
        return; 
    }

    gl.clearColor(...IlliniBlue);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


///////////////////////////////////////////////////////
    //choose and Activate the shader program
    if(true_if_texture == true){
        program = textureProgram
    }
    else{
        program = colorProgram
    }
    gl.useProgram(program);
//////////////////////////////////////////////////////

    //Bind the vertex array
    gl.bindVertexArray(geom.vao);

    //Setting the ground color
    // gl.uniform4fv(program.uniforms.groundColor, [0.827, 0.737, 0.459, 1.0]);

    //Set up lighting
    let ld = normalize([1, 1, 1]);
    let h = normalize(add(ld, [0, 0, 1]));
    gl.uniform3fv(program.uniforms.lightDir, ld);
    gl.uniform3fv(program.uniforms.lightcolor, [1, 1, 1]);
    gl.uniform3fv(program.uniforms.halfway, h);

    //Rotate the camera around the Z-axis
    let radius = 3; //Distance from the camera to the terrain
    let angle = seconds; //Controls the rotation speed and angle
    let eye = [Math.sin(angle) * radius, Math.cos(angle) * radius, -1.4]; //Camera position (rotating around Z-axis)
    let center = [0, 0, 0]; //Looking at the center of the terrain
    let up = [0, 0, -1]; // Z-axis is now the "up" direction since we are rotating around the Z-axis
    let v = m4view(eye, center, up);  //View matrix

    //The model matrix is now just an identity matrix (no terrain rotation)
    let m = IdentityMatrix;

    //Send the matrices to the shader
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, m)); //Model-View matrix
    gl.uniformMatrix4fv(program.uniforms.p, false, p); //Projection matrix

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
    let vs = await fetch('textures_vertex.glsl').then(resp => resp.text());
    let fs = await fetch('color_fragment.glsl').then(resp => resp.text());
    let texture_fs = await fetch('texture_fragment.glsl').then(resp => resp.text());

    window.colorProgram = compileShader(vs, fs);
    window.textureProgram = compileShader(vs, texture_fs);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    document.querySelector('#submit').addEventListener('click', event => {
        const gridsize = Number(document.querySelector('#gridsize').value) || 2
        const faults = Number(document.querySelector('#faults').value) || 0
        const material = document.querySelector('#material').value;
        // TO DO: generate a new gridsize-by-gridsize grid here, then apply faults to it

        drawTerrain(gridsize, faults);
        addNormals(terrain);
        window.geom = setupGeometry(terrain);
        change_texture(material, gl);
    })
    
    fillScreen();
    window.addEventListener('resize', fillScreen);
    requestAnimationFrame(tick);
});

function updateMaterial() {
    const material = document.querySelector('#material').value;
    change_texture(material, gl);  //Update the color or texture based on the new input
    draw(0);  //Redraw the terrain with the new material
}