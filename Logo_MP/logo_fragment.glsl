#version 300 es

precision mediump float;

in vec3 v_color;  //Color from the vertex shader

out vec4 fragColor;  //Final color of the fragment

void main() {
    //Set the fragment color
    fragColor = vec4(v_color, 1.0);
}