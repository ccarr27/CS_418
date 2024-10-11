#version 300 es

//Specify the locations for the attributes
layout(location = 0) in vec2 a_position;  //Position attribute, location 0
layout(location = 1) in vec3 a_color;     //Color attribute, location 1

//Output for the fragment shader
out vec3 v_color;

//Uniform for the transformation matrix
uniform mat3 u_transformMatrix;

void main() {
    //Apply the transformation matrix to the position
    vec3 transformedPosition = u_transformMatrix * vec3(a_position, 1.0);
    
    //Set the gl_Position using the transformed position
    gl_Position = vec4(transformedPosition.xy, 0.0, 1.0);
    
    //Pass the color to the fragment shader
    v_color = a_color;
}