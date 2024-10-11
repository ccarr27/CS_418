from PIL import Image, ImageDraw, ImageCms
import math
import copy
import numpy as np


def file_to_image(input_file):
    positions = []
    colors = []
    vertices = []
    # sRGB = False
    with open(input_file, 'r') as file:
        img = None  # Initialize img to None
        for line in file:
            line = line.strip()

            # if line.startswith('sRGB'):
            #     sRGB = True
            #############################################################
            if line.startswith('png'):
                _, width, height, filename = line.split()
                width = int(width)
                height = int(height)
                img = Image.new('RGBA', (width, height))
                img.save(filename)
            ##############################################################
            elif line.startswith('position'):
                _, coords_dimensions, *coords = line.split()
                positions.clear()
                vertices.clear()
                for i in range(0, len(coords), int(coords_dimensions)):
                    x = float(coords[i])
                    y = float(coords[i+1])
                    z = float(coords[i+2])
                    w = float(coords[i+3])
                    positions.append((x, y, z, w))
                for i in range(0, len(positions)):
                    xx = float((((positions[i][0])/(positions[i][3]))+1)*width/2)
                    yy = float((((positions[i][1])/(positions[i][3]))+1)*height/2)
                    vertices.append((xx,yy))
            ##############################################################
            elif line.startswith('color'):
                _, color_dimensions, *vals = line.split()
                colors.clear()
                for i in range(0, len(vals), int(color_dimensions)):
                    r = float(vals[i])
                    g = float(vals[i+1])
                    b = float(vals[i+2])
                    colors.append((r, g, b))
            ###############################################################
            elif line.startswith('drawArraysTriangles'):
                _, first_vertex, count  = line.split()
                count = int(count)
                first_vertex = int(first_vertex)
                end_vertex = first_vertex+count
                for i in range(first_vertex,end_vertex, 3):
                    # print("hello")
                    #begining of scanline where we have 3 dim q,p,r

                    dim_p = [vertices[i][0]]
                    dim_p.append(vertices[i][1])
                    dim_q = [vertices[i+1][0]]
                    dim_q.append(vertices[i+1][1])
                    dim_r = [vertices[i+2][0]]
                    dim_r.append(vertices[i+2][1])


                    for j in range(0,3):
                        dim_p.append(colors[i][j])
                    for j in range(0,3):
                        dim_q.append(colors[i+1][j])
                    for j in range(0,3):
                        dim_r.append(colors[i+2][j])

                    # print(dim_p)
                    # print(dim_q)
                    # print(dim_r)

                    #find t,b,m
                    vec_t = min(dim_p, dim_q, dim_r, key=lambda v: v[1])
                    vec_b = max(dim_p, dim_q, dim_r, key=lambda v: v[1])
                    remaining = [dim_p, dim_q, dim_r]
                    remaining.remove(vec_t)
                    remaining.remove(vec_b)
                    vec_m = remaining[0]

                    # print(vec_t, vec_b, vec_m)

                    # print(remaining)


                    #now run dday
                    points_t_b = dda(vec_t,vec_b,1)
                    points_t_m = dda(vec_t,vec_m,1)
                    points_m_b = dda(vec_m,vec_b,1)

                    #now we draw
                    for a1,b1 in zip(points_t_m,points_t_b):
                        draw(a1,b1,img, width, height)
                    
                    for a1, b1 in zip(points_m_b, points_t_b[len(points_t_m):]):
                        draw(a1,b1,img, width, height)


                    img.save(filename)

        # #sRGB
        # if(sRGB == True):
        #     srgb_profile = ImageCms.createProfile("sRGB")
        #     img = ImageCms.profileToProfile(img, srgb_profile, srgb_profile)
        #     img.save(filename)


def draw(a,b, img, width, height):
    draw_img = ImageDraw.Draw(img)
    p = a
    p_l = b

    if(p[0] > p_l[0]):
        p , p_l = p_l, p

    # print(p, p_l)
    

    ddax = dda(p, p_l, 0)
    # print(ddax)
    for pixel in ddax:
        draw_img.point((int(pixel[0]),int(pixel[1])), fill = (int(pixel[2]*255),int(pixel[3]*255),int(pixel[4]*255)))



def dda(vecc1,vecc2,d):
    dda_output = []

    vec1 = np.array(vecc1).astype(float)
    vec2 = np.array(vecc2).astype(float)

    

    if( vec1[d] == vec2[d] ):
        return dda_output
    
    if(vec1[d] > vec2[d]):
        vec1, vec2 = vec2, vec1
    
    delta = vec2 - vec1

    delta_d =  float(vec2[d]- vec1[d])

    s = delta/delta_d

    e = float(math.ceil(vec1[d]) - vec1[d])

    o = e * s

    p = np.copy(vec1)

    p += o

    while(p[d] < vec2[d]):
        current_p = p.tolist()
        dda_output.append(current_p)
        p += s

    return dda_output



if __name__ == "__main__":
    import sys
    file_to_image(sys.argv[1])
