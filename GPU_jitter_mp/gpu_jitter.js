async function fetchShader(url) {
    const response = await fetch(url);
    return await response.text();
}

async function initWebGL(gl) {
    //Fetch vertex and fragment shaders from external files
    const vertexShaderSource = await fetchShader('gpu_vertex.glsl');
    const fragmentShaderSource = await fetchShader('gpu_fragment.glsl');

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

function drawScene(gl, program, buffers, time) {
    gl.clearColor(1.0, 1.0, 1.0, 1.0); //Clear to white, fully opaque
    gl.clearDepth(1.0); //Clear everything
    gl.enable(gl.DEPTH_TEST); //Enable depth testing
    gl.depthFunc(gl.LEQUAL); //Near things obscure far things

    //Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    //Set the time uniform
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    gl.uniform1f(timeLocation, time);

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
    let time = 0.0;

    function render() {
        time += 0.05; //Increment time for the jitter effect
        drawScene(gl, program, buffers, time);
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