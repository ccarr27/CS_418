#version 300 es

//Input attributes from the vertex array
layout(location=0) in vec4 position;   //Vertex position in object space
layout(location=1) in vec3 normal;     //Vertex normal in object space
layout(location=2) in float altitude;  //Vertex altitude value (for coloring)

//Uniforms passed in from the application
uniform mat4 mv;  //Model-View matrix: transforms vertices to view space
uniform mat4 p;   //Projection matrix: transforms vertices to clip space

//Outputs sent to the fragment shader
out float valtitude;     //Passes the altitude to fragment shader for coloring
out vec3 vnormalspec;    //Normal vector transformed to view space for lighting
out vec3 vnormal;        //Original normal vector in object space

void main() {
    //Pass the altitude value to the fragment shader
    valtitude = altitude;

    //Transform the vertex position to clip space
    gl_Position = p * mv * position;

    //Pass the original normal vector
    vnormal = normal;

    //Transform the normal to view space using the Model-View matrix
    //mat3(mv) ensures the transformation only affects the 3x3 part of the matrix
    vnormalspec = mat3(mv) * vnormal;
}