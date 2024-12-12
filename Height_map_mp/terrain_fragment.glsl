#version 300 es
precision highp float;

in float valtitude;
in vec3 vnormal;
in vec3 vnormalspec;

uniform vec3 lightDir;      //Light direction
uniform vec3 lightcolor;    //Light color
uniform vec4 groundColor;   //Base color of terrain
uniform vec3 halfway;       //Halfway vector for specular calculation

out vec4 fragColor;

//Function to compute rainbow colors
vec3 rainbow(float t) {
    //Smooth rainbow transition with higher frequency
    float r = 0.5 + 0.5 * sin(12.56636 * t);           //Red
    float g = 0.5 + 0.5 * sin(12.56636 * t - 2.094);   //Green
    float b = 0.5 + 0.5 * sin(12.56636 * t - 4.188);   //Blue
    return vec3(r, g, b);
}

void main() {
    //Normalize altitude to 0-1 range and repeat with higher frequency
    float normalizedAltitude = fract(valtitude * 2.0);

    //Generate the rainbow color
    vec3 rainbowColor = rainbow(normalizedAltitude);

    //Ambient component to prevent total darkness
    float ambient = 0.3;

    //Diffuse lighting
    float diffuse = max(dot(normalize(vnormal), lightDir), 0.0);

    //Specular lighting (reduced shininess)
    float specularPower = 30.0; //Lowered to make specular softer
    float specularIntensity = 0.7; //Reduced specular contribution
    float specular = specularIntensity * pow(max(dot(normalize(vnormalspec), halfway), 0.0), specularPower);

    //Combine lighting and rainbow color
    vec3 color = (ambient + diffuse) * rainbowColor + specular * lightcolor;

    fragColor = vec4(color, 1.0);
}