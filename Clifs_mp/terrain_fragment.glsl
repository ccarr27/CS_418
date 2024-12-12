#version 300 es
precision highp float;

//Uniforms for lighting and materials
uniform vec3 lightDir;
uniform vec3 halfway;
uniform vec3 lightcolor;

//Input normal from vertex shader
in vec3 vnormal;

//Output color
out vec4 color;

void main() {
    //Normalize the interpolated normal
    vec3 normal = normalize(vnormal);
    
    //Calculate the steepness of the slope (using upward Y coordinate)
    float steepness = normal.y;

    //Define shallow slope material (green with slight brown tint)
    vec3 shallowColor = vec3(0.2, 0.6, 0.1); // Slightly browner green
    float shallowShine = 200.0;

    //Define steep slope material (original red)
    vec3 steepColor = vec3(0.6, 0.3, 0.3); // Original red
    float steepShine = 50.0;

    //Smoothly interpolate between materials based on steepness
    float t = smoothstep(0.0, 0.5, steepness); // Map steepness to [0, 1]
    vec3 materialColor = mix(steepColor, shallowColor, t);
    float shininess = mix(steepShine, shallowShine, t);

    //Calculate Lambertian (diffuse) lighting
    float lambert = max(dot(normal, lightDir), 0.0);

    //Calculate Blinn-Phong specular lighting
    float blinn = pow(max(dot(normal, halfway), 0.0), shininess);

    //Combine diffuse and specular lighting
    vec3 finalColor = materialColor * (lambert * lightcolor) + vec3(1.0) * blinn;

    //Set final fragment color
    color = vec4(finalColor, 1.0);
}