#version 300 es
precision highp float;

uniform vec3 lightcolor;   //Color/intensity of the light source
uniform vec3 halfway;      //Halfway vector for Blinn-Phong specular
uniform vec3 lightDir;     //Direction of the light source
uniform vec4 groundColor;  //Base color of the ground surface (RGBA)

in vec3 vnormal;           //Interpolated normal vector from the vertex shader
out vec4 color;            //Final output color of the fragment

void main() {
    //Normalize the normal and halfway vectors for correct lighting calculations
    vec3 norm = normalize(vnormal);
    
    //Extract alpha as specular intensity factor
    float alpha = groundColor.a;

    //Compute Blinn-Phong specular component, scaled by 3 * alpha
    float blinn = pow(max(dot(norm, halfway), 0.0), 100.0) * 3.0 * alpha;

    //Compute Lambertian diffuse component, scaled by (1 - alpha)
    float lambert = max(dot(norm, lightDir), 0.0) * (1.0 - alpha);

    //Combine diffuse and specular components with the base color
    vec3 diffuse = groundColor.rgb * lambert * lightcolor;
    vec3 specular = vec3(1.0) * blinn;  //Specular color is white

    // Calculate final color by adding diffuse and specular components
    color = vec4(diffuse + specular, 1.0); //Output alpha is set to 1.0 (fully opaque)
}