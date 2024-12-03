#version 300 es

layout(location=0) in vec4 position;
layout(location=1) in vec3 normal;

uniform mat4 mv;
uniform mat4 p;

out vec3 vnormalspec;
out vec3 vnormal;
out vec4 vPositionView; //Position in view space for fog calculation

void main() {
    //Transform position
    gl_Position = p * mv * position;

    //Pass normal for lighting
    vnormal = normal;

    //Transform normal into view space for lighting specular calculation
    vnormalspec = mat3(mv) * normal;

    //Pass position in view space
    vPositionView = mv * position;
}