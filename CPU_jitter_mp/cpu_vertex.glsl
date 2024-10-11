#version 300 es

in vec2 a_position;   //Vertex position
in vec3 a_color;      //Vertex color

out vec3 v_color;      //Color to be passed to the fragment shader

void main() {
    //Pass the color to the fragment shader
    v_color = a_color;

    //Set the position of the vertex
    gl_Position = vec4(a_position, 0.0, 1.0);
}