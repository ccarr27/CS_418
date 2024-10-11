#version 300 es

precision highp float;

in vec2 fC;
out vec4 fragColor;

uniform float seconds; 

void main() {

    //pattern creation
    float red_1 = sin(fC.x * 5.0 + seconds) * cos(fC.y * 9.0 - seconds) * cos(fC.y * 23.0 - seconds) + seconds*0.2*fC.x;
    float blue_1 = cos(fC.y * 6.0 - fC.y * 9.0 + seconds * 1.3) +  sin(fC.x * 4.0 - fC.y * 6.5 + seconds * 0.2)* cos(fC.x * 4.0 - fC.y * 6.5 + seconds * 0.2) + seconds*0.1*fC.y;
    float green_1 = sin(fC.y * 8.0 - seconds) * sin(fC.x * 8.0 + seconds * 1.5) + seconds*1.5*fC.x;

    float mix = red_1 + blue_1 ;

    //color mapping
    vec3 color = vec3(1.5 + 0.5 * cos(mix + green_1 + seconds*3.0),1.2 + sin(mix * 2.0 - seconds * 0.8), 0.5 + cos(mix * 1.6 + seconds));
    fragColor = vec4(color, 1.0);
}