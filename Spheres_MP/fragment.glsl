#version 300 es
precision mediump float;

in vec3 vNormal;          //Interpolated normal from vertex shader
in vec3 vFragPosition;    //Fragment position in view space

uniform vec3 uSphereColor;    //Sphere base color
uniform vec3 uLightPosition;  //Light position in view space
uniform vec3 uViewPosition;   //Camera (view) position

out vec4 fragColor;

void main() {
    //Normalize vectors
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vFragPosition);

    //Diffuse component
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * uSphereColor;

    //Specular component (soft and subtle)
    float specularStrength = 0.1; //Lower strength for less shine
    vec3 viewDir = normalize(uViewPosition - vFragPosition);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 8.0); //Lower shininess
    vec3 specular = specularStrength * spec * vec3(1.0);// White highlights

    //Combine diffuse and specular (no ambient for simplicity)
    vec3 resultColor = diffuse + specular;

    //Output final color
    fragColor = vec4(resultColor, 1.0);
}
