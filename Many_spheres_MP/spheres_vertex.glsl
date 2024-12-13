#version 300 es
precision highp float;

in vec3 aCenter; //Sphere center position
in float aRadius; //Sphere radius
in vec3 aColor; //Sphere color

uniform mat4 uProjectionMatrix; //Projection matrix
uniform float uViewportSize; //Viewport size

out vec3 vColor; //Pass color to fragment shader
out vec3 vViewDirection; //Pass view direction to fragment shader

void main() {
    //Transform sphere center to clip space
    vec4 clipPosition = uProjectionMatrix * vec4(aCenter, 1.0);

    //Compute point size in pixels based on perspective
    float onScreenRadius = (uViewportSize * uProjectionMatrix[1][1]) * (aRadius / clipPosition.w);
    gl_PointSize = onScreenRadius;

    //Pass color to the fragment shader
    vColor = aColor;

    //Fake view direction pointing towards -Z for compatibility
    vViewDirection = vec3(0.0, 0.0, 1.0);

    //Output final position in clip space
    gl_Position = clipPosition;
}