async function fetchShader(url) {
    const response = await fetch(url);
    return await response.text();
}

async function initWebGL(gl) {
    //Fetch vertex and fragment shaders from external files
    const vertexShaderSource = await fetchShader('logo_vertex.glsl');
    const fragmentShaderSource = await fetchShader('logo_fragment.glsl');

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    //Load and compile the shaders
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    //Create program and attach shaders
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error linking program:', gl.getProgramInfoLog(program));
    }

    return program;
}

function initBuffers(gl, jsonData) {
    //Triangle positions
    const positions = jsonData.attributes.position.flat();
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    //Colors
    const colors = jsonData.attributes.color.flat();
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    //Indices
    const indices = jsonData.triangles;
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        indices: indexBuffer,
    };
}

function getRotationMatrix(angle) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    //3x3 rotation matrix for 2D rotation (homogeneous coordinates)
    return new Float32Array([
        sinA, -cosA, 0.0,
        cosA,  sinA, 0.0,
        0.0,   0.0,  1.0
    ]);
}

function getScalingMatrix(scale) {
    //3x3 scaling matrix for 2D scaling (homogeneous coordinates)
    return new Float32Array([
        scale, 0.0,   0.0,
        0.0,   scale, 0.0,
        0.0,   0.0,   1.0
    ]);
}

function multiplyMatrices(a, b) {
    //Multiplies two 3x3 matrices and returns the result
    const result = new Float32Array(9);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            result[i * 3 + j] = a[i * 3 + 0] * b[0 * 3 + j] +
                                a[i * 3 + 1] * b[1 * 3 + j] +
                                a[i * 3 + 2] * b[2 * 3 + j];
        }
    }
    return result;
}

function drawScene(gl, program, buffers, transformMatrix) {
    gl.clearColor(1.0, 1.0, 1.0, 1.0); //Clear to white, fully opaque
    gl.clearDepth(1.0); //Clear everything
    gl.enable(gl.DEPTH_TEST); //Enable depth testing
    gl.depthFunc(gl.LEQUAL); //Near things obscure far things

    //Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    //Set the transformation matrix uniform (rotation + scaling)
    const transformLocation = gl.getUniformLocation(program, 'u_transformMatrix');
    gl.uniformMatrix3fv(transformLocation, false, transformMatrix);

    //Bind the position buffer
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLocation);

    //Bind the color buffer
    const colorLocation = gl.getAttribLocation(program, 'a_color');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLocation);

    //Bind the index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    //Draw the triangles
    gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);
}

function animate(gl, program, buffers) {
    let angle = 0.0;
    let scale = 3.0;
    let scaleDirection = 1;

    function render() {
        angle -= 0.01; //Rotate counterclockwise

        //Oscillate the scale between 0.5 and 1.5
        scale += scaleDirection * 0.01;
        if (scale > 1.5) scaleDirection = -1;
        if (scale < 0.5) scaleDirection = 1;

        //Get the rotation and scaling matrices
        const rotationMatrix = getRotationMatrix(angle);
        const scalingMatrix = getScalingMatrix(scale);

        //Multiply the matrices to combine rotation and scaling
        const transformMatrix = multiplyMatrices(rotationMatrix, scalingMatrix);

        //Draw the scene with the combined transformation
        drawScene(gl, program, buffers, transformMatrix);

        requestAnimationFrame(render); //Continuously update
    }

    render();
}

window.onload = async function () {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    canvas.width = 600;
    canvas.height = 600;

    const gl = canvas.getContext('webgl2');

    //Load JSON data
    const response = await fetch('illini_I.json');
    const jsonData = await response.json();

    //Initialize WebGL program and buffers
    const program = await initWebGL(gl);
    const buffers = initBuffers(gl, jsonData);

    //Start the animation loop
    animate(gl, program, buffers);
}