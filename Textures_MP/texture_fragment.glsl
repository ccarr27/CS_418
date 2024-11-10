#version 300 es
precision highp float;

in vec2 vTexCoord;          //Texture coordinates from the vertex shader
in vec3 vnormal;            //Normal vector for diffuse lighting

uniform vec3 lightDir;      //Direction of the light source
uniform vec3 lightcolor;    //Color/intensity of the light source
uniform sampler2D utex; //Texture for texture-based rendering

out vec4 color;

void main() {
    //Compute the Lambertian diffuse component
    float lambert = max(dot(normalize(vnormal), lightDir), 0.0);

    //Sample the color from the texture and apply the diffuse light
    vec3 diffuseColor = texture(utex
, vTexCoord).rgb * lambert * lightcolor;

    //Set the final color output with full opacity
    color = vec4(diffuseColor, 1.0);
}