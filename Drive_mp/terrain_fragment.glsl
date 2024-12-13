#version 300 es
precision highp float;



uniform vec3 lightDir;
uniform vec4 groundColor;
uniform vec3 lightcolor;
uniform vec3 halfway;

in vec3 vnormal;
out vec4 color;


void main() {
    float blinn = pow(max(dot(normalize(vnormal), halfway), 0.0), 120.0);
    float lambert = max(dot(normalize(vnormal), lightDir), 0.0);
    color = vec4(groundColor.rgb * (lambert * lightcolor) + (vec3(1,1, 1) * blinn), 1.0);
}