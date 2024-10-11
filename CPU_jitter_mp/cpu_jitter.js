let positionBuffer;  // Global variable for the changing buffer

async function fetchShader(url) {
    const response = await fetch(url);
    return await response.text();
}

async function initWebGL(gl) {
    //Fetch vertex and fragment shaders from external files
    const vertexShaderSource = await fetchShader('cpu_vertex.glsl');
    const fragmentShaderSource = await fetchShader('cpu_fragment.glsl');

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


    return program;
}

function initBuffers(gl, jsonData) {
    //Initialize global variable positionBuffer for jittering data
    positionBuffer = gl.createBuffer();

    //Colors (static)
    const colors = jsonData.attributes.color.flat();
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    //Indices (static)
    const indices = jsonData.triangles;
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        indices: indexBuffer,
        originalPositions: jsonData.attributes.position  //Keep original positions to jitter from
    };
}

function updatePositions(gl, buffers) {
    const positions = [...buffers.originalPositions];  //Clone original positions
    const jitterAmount = 0.005;

    // Apply a small jitter to each vertex position
    for (let i = 0; i < positions.length; i++) {
        positions[i][0] += (Math.random() - 0.5) * jitterAmount;  //Jitter in X
        positions[i][1] += (Math.random() - 0.5) * jitterAmount;  //Jitter in Y
    }

    //Flatten the array and send it to the GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions.flat()), gl.DYNAMIC_DRAW);
}

function drawScene(gl, program, buffers) {
    gl.clearColor(1.0, 1.0, 1.0, 1.0); //Clear to white, fully opaque
    gl.clearDepth(1.0); //Clear everything
    gl.enable(gl.DEPTH_TEST); //Enable depth testing
    gl.depthFunc(gl.LEQUAL); //Near things obscure far things

    //Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    //Update vertex positions with jitter
    updatePositions(gl, buffers);

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
    function render() {
        drawScene(gl, program, buffers);  //Render the scene with jitter
        requestAnimationFrame(render);    //Continuously update for animation
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