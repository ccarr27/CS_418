#version 300 es

in vec2 a_position;   //Vertex position
in vec3 a_color;      //Vertex color

uniform float u_time;  //Time-based uniform to introduce jitter

out vec3 v_color;      //Color to be passed to the fragment shader

void main() {
    //Amplify the jitter effect by multiplying the displacement by a larger factor
    float jitterAmount = 0.05;  //Increase this value for more jitter (was 0.01)

    //Use gl_VertexID to create some vertex-specific movement
    float jitterX = sin(float(gl_VertexID) + u_time) * jitterAmount;  //Larger jitter on X
    float jitterY = cos(float(gl_VertexID) + u_time) * jitterAmount;  //Larger jitter on Y

    //Apply jitter to the position
    vec2 jitteredPosition = a_position + vec2(jitterX, jitterY);

    //Pass the color to the fragment shader
    v_color = a_color;

    //Set the position of the vertex
    gl_Position = vec4(jitteredPosition, 0.0, 1.0);
}