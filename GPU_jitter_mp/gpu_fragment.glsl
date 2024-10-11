#version 300 es

precision mediump float;  //Define precision for floats in the fragment shader

in vec3 v_color;  //Color from the vertex shader

out vec4 fragColor;  //Final color of the fragment

void main() {
    fragColor = vec4(v_color, 1.0);  //Set the fragment color with full opacity
}