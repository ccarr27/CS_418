#version 300 es

in vec2 a_position;   //Vertex position
in vec3 a_color;      //Vertex color

uniform mat3 u_transformMatrix; //Combined rotation and scaling matrix

out vec3 v_color;     //Color to be passed to the fragment shader

void main() {
    //Apply the transformation matrix to the position
    vec3 transformedPosition = u_transformMatrix * vec3(a_position, 1.0);

    //Pass the color to the fragment shader
    v_color = a_color;

    //Set the position of the vertex
    gl_Position = vec4(transformedPosition.xy, 0.0, 1.0);
}