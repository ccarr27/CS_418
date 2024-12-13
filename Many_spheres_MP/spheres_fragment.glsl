#version 300 es
precision highp float;

in vec3 vColor; //Color passed from vertex shader

out vec4 fragColor; //Final output color

uniform vec3 uLightDirection; //Directional light direction
uniform vec3 uLightColor; //Light color
uniform vec3 uViewDirection; //View direction for specular lighting

void main() {
    //Map gl_PointCoord from (0,0)-(1,1) to (-1,-1)-(1,1)
    vec2 pointCoord = gl_PointCoord * 2.0 - 1.0;
    float distanceSquared = dot(pointCoord, pointCoord);

    //Discard fragments outside the sphere
    if(distanceSquared > 1.0) discard;

    //Compute the sphere's surface normal
    vec3 normal = normalize(vec3(pointCoord, sqrt(1.0 - distanceSquared)));

    //Ambient lighting
    float ambientStrength = 0.2; //Strength of ambient light
    vec3 ambient = ambientStrength * uLightColor;

    //Diffuse lighting
    float diffuseStrength = max(dot(normal, normalize(uLightDirection)), 0.0);
    vec3 diffuse = diffuseStrength * uLightColor;

    //Specular lighting (Phong model)
    float shininess = 32.0; //Shininess factor
    vec3 reflectDir = reflect(-normalize(uLightDirection), normal);
    float spec = pow(max(dot(normalize(uViewDirection), reflectDir), 0.0), shininess);
    vec3 specular = 0.5 * spec * uLightColor; //Specular intensity

    //Combine lighting components
    vec3 lighting = (ambient + diffuse + specular) * vColor;

    fragColor = vec4(lighting, 1.0);
}
