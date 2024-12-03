#version 300 es
precision highp float;

//Fog parameters
uniform float fogDensity;
uniform bool fogEnabled;
uniform vec4 fogColor;

//Lighting parameters
uniform vec3 lightDir;
uniform vec4 groundColor;
uniform vec3 lightcolor;
uniform vec3 halfway;

//Inputs from the vertex shader
in vec3 vnormalspec;
in vec3 vnormal;

out vec4 color;

void main() {
    //Compute lighting (Lambert and Blinn-Phong components)
    float lambert = max(dot(normalize(vnormal), lightDir), 0.0);
    float blinn = pow(max(dot(normalize(vnormalspec), halfway), 0.0), 50.0);

    //Base color from lighting calculations
    color = vec4(groundColor.rgb * (lambert * lightcolor) + (vec3(1.0, 1.0, 1.0) * blinn), 1.0);

    //Apply fog if enabled
    if (fogEnabled) {
        float distance = 1.0 / gl_FragCoord.w;

        //Exponential fog factor
        float fogFactor = exp(-fogDensity * distance);
        fogFactor = clamp(fogFactor, 0.0, 1.0);

        //Mix fog color with the lit color
        color = mix(fogColor, color, fogFactor);
    }
}