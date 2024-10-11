#version 300 es



precision highp float;

out vec2 fC;

void main() {
    vec2 positions[6] = vec2[](
        vec2(-1.0, -1.0), vec2( 1.0, -1.0), vec2(-1.0,  1.0), vec2(-1.0,  1.0), vec2( 1.0, -1.0), vec2( 1.0,  1.0)  
    );
    
    fC = positions[gl_VertexID];
    gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
