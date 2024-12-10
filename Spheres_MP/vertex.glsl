#version 300 es
precision mediump float;

layout(location = 0) in vec3 aPosition;   //Vertex position
layout(location = 1) in vec3 aNormal;     //Vertex normal

uniform mat4 uModelViewMatrix;    //Combined Model-View matrix
uniform mat4 uProjectionMatrix;   //Projection matrix

out vec3 vNormal;          //Normal vector in view space
out vec3 vFragPosition;    //Fragment position in view space

void main() {
    //Transform position into view space
    vec4 fragPosView = uModelViewMatrix * vec4(aPosition, 1.0);
    vFragPosition = fragPosView.xyz;

    //Transform the normal into view space
    vNormal = mat3(uModelViewMatrix) * aNormal;

    //Final position: project to clip space
    gl_Position = uProjectionMatrix * fragPosView;
}