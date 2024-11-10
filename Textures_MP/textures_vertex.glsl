#version 300 es
layout(location=0) in vec4 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 tcoord;

uniform mat4 mv;
uniform mat4 p;

out vec3 vnormal;
out vec2 vTexCoord;

void main() {
    //Calculate position in clip space
    gl_Position = p * mv * position;

    //Transform normal using the inverse transpose of the model-view matrix (for non-uniform scaling)
    vnormal = transpose(inverse(mat3(mv))) * normal;

    //Pass texture coordinates to the fragment shader
    vTexCoord = tcoord;
}