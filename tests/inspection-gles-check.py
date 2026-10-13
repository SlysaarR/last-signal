"""Compile and render the actual inspection shaders with native EGL/GLES, no browser.
Usage: python3 tests/inspection-gles-check.py <OUTPUT_DIR from inspection-art-check>
Requires Mesa EGL and Pillow in the QA environment; never shipped as a game dependency.
"""
import ctypes as C
import json
from pathlib import Path
import re
import sys
from PIL import Image

folder=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]
egl=C.CDLL('libEGL.so.1')
def ef(name,restype,args):
    f=getattr(egl,name);f.restype=restype;f.argtypes=args;return f
pointer=C.c_void_p;integer=C.c_int;uint=C.c_uint;boolean=C.c_uint
proc=ef('eglGetProcAddress',pointer,[C.c_char_p])
def gf(name,restype,args):
    address=proc(name.encode());assert address,name
    return C.CFUNCTYPE(restype,*args)(address)
get_display=gf('eglGetPlatformDisplayEXT',pointer,[uint,pointer,C.POINTER(integer)])
display=get_display(0x31DD,None,None)
major=integer();minor=integer()
assert ef('eglInitialize',boolean,[pointer,C.POINTER(integer),C.POINTER(integer)])(display,C.byref(major),C.byref(minor))
assert ef('eglBindAPI',boolean,[uint])(0x30A0)
attrs=(integer*15)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3038)
config=pointer();count=integer()
assert ef('eglChooseConfig',boolean,[pointer,C.POINTER(integer),C.POINTER(pointer),integer,C.POINTER(integer)])(display,attrs,C.byref(config),1,C.byref(count)) and count.value
surface=ef('eglCreatePbufferSurface',pointer,[pointer,pointer,C.POINTER(integer)])(display,config,(integer*5)(0x3057,400,0x3056,400,0x3038))
context=ef('eglCreateContext',pointer,[pointer,pointer,pointer,C.POINTER(integer)])(display,config,None,(integer*3)(0x3098,2,0x3038))
assert ef('eglMakeCurrent',boolean,[pointer,pointer,pointer,pointer])(display,surface,surface,context)
source=(root/'js/graphics/inspection-gl.js').read_text()
create=gf('glCreateShader',uint,[uint]);shader_source=gf('glShaderSource',None,[uint,integer,C.POINTER(C.c_char_p),C.POINTER(integer)])
compile_shader=gf('glCompileShader',None,[uint]);status=gf('glGetShaderiv',None,[uint,uint,C.POINTER(integer)])
info=gf('glGetShaderInfoLog',None,[uint,integer,C.POINTER(integer),C.c_char_p])
shaders=[]
for name,kind in [('vertex',0x8B31),('fragment',0x8B30)]:
    text=re.search(r'const '+name+r'=`(.*?)`;',source,re.S)[1].encode()
    shader=create(kind);shader_source(shader,1,(C.c_char_p*1)(text),None);compile_shader(shader)
    ok=integer();status(shader,0x8B81,C.byref(ok));log=C.create_string_buffer(8192);info(shader,8192,None,log)
    assert ok.value,name+': '+log.value.decode();shaders.append(shader)
program=gf('glCreateProgram',uint,[])();attach=gf('glAttachShader',None,[uint,uint])
for shader in shaders:attach(program,shader)
gf('glLinkProgram',None,[uint])(program);ok=integer();gf('glGetProgramiv',None,[uint,uint,C.POINTER(integer)])(program,0x8B82,C.byref(ok))
log=C.create_string_buffer(8192);gf('glGetProgramInfoLog',None,[uint,integer,C.POINTER(integer),C.c_char_p])(program,8192,None,log)
assert ok.value,log.value.decode();gf('glUseProgram',None,[uint])(program)
fixture=json.loads((folder/'mesh.json').read_text());vertices=[];ranges=[]
for mat in range(len(fixture['textures'])):
    start=len(vertices)//8
    for t in fixture['triangles']:
        if t['mat']==mat:
            for i in range(3):vertices+=t['points'][i]+t['normal']+[v/512 for v in t['uv'][i]]
    ranges.append((start,len(vertices)//8-start))
buffer=uint();gf('glGenBuffers',None,[integer,C.POINTER(uint)])(1,C.byref(buffer));gf('glBindBuffer',None,[uint,uint])(0x8892,buffer)
array=(C.c_float*len(vertices))(*vertices);gf('glBufferData',None,[uint,C.c_ssize_t,pointer,uint])(0x8892,C.sizeof(array),array,0x88E4)
for name,size,offset in [('position',3,0),('normal',3,12),('uv',2,24)]:
    loc=gf('glGetAttribLocation',integer,[uint,C.c_char_p])(program,name.encode());assert loc>=0
    gf('glEnableVertexAttribArray',None,[uint])(loc);gf('glVertexAttribPointer',None,[uint,integer,uint,C.c_ubyte,integer,pointer])(loc,size,0x1406,0,32,pointer(offset))
locations={name:gf('glGetUniformLocation',integer,[uint,C.c_char_p])(program,name.encode()) for name in ['angle','size','polish','image','relief','reliefSide','light','zoom','pan']}
assert all(v>=0 for v in locations.values()),locations
u1i=gf('glUniform1i',None,[integer,integer]);u1f=gf('glUniform1f',None,[integer,C.c_float]);u2f=gf('glUniform2f',None,[integer,C.c_float,C.c_float]);u3f=gf('glUniform3f',None,[integer,C.c_float,C.c_float,C.c_float])
u1i(locations['image'],0);u1i(locations['relief'],1);u1f(locations['polish'],fixture['polish']);u2f(locations['size'],400,400);u2f(locations['pan'],0,0)
active=gf('glActiveTexture',None,[uint]);bind=gf('glBindTexture',None,[uint,uint])
def texture(data,size):
    tex=uint();gf('glGenTextures',None,[integer,C.POINTER(uint)])(1,C.byref(tex));bind(0x0DE1,tex)
    buf=C.create_string_buffer(data);gf('glTexImage2D',None,[uint,integer,integer,integer,integer,integer,uint,uint,pointer])(0x0DE1,0,0x1908,size,size,0,0x1908,0x1401,buf)
    parameter=gf('glTexParameteri',None,[uint,uint,integer])
    for key,value in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:parameter(0x0DE1,key,value)
    return tex
textures=[texture((folder/p).read_bytes(),512) for p in fixture['textures']]
reliefs=[texture((folder/p['path']).read_bytes(),256) if p else texture(bytes([128,128,255,255]),1) for p in fixture['reliefs']]
enable=gf('glEnable',None,[uint]);enable(0x0B71);enable(0x0B44)
gf('glClearColor',None,[C.c_float]*4)(.10,.16,.11,1);gf('glViewport',None,[integer]*4)(0,0,400,400)
lights=[[-.6,.7,1],[.7,.35,1],[.05,1,1]];images=[]
for yaw,pitch,zoom,light in fixture['views']:
    gf('glClear',None,[uint])(0x4000|0x0100);u2f(locations['angle'],yaw,pitch);u1f(locations['zoom'],zoom)
    l=lights[light];length=sum(x*x for x in l)**.5;u3f(locations['light'],*[x/length for x in l])
    for i,(start,count) in enumerate(ranges):
        active(0x84C0);bind(0x0DE1,textures[i]);active(0x84C1);bind(0x0DE1,reliefs[i]);u1f(locations['reliefSide'],fixture['reliefs'][i]['side'] if fixture['reliefs'][i] else 0)
        gf('glDrawArrays',None,[uint,integer,integer])(4,start,count)
    pixels=(C.c_ubyte*(400*400*4))();gf('glReadPixels',None,[integer,integer,integer,integer,uint,uint,pointer])(0,0,400,400,0x1908,0x1401,pixels)
    assert gf('glGetError',uint,[])()==0,'GL error'
    image=Image.frombytes('RGBA',(400,400),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);assert len(set(image.getdata()))>100,'model not rendered';images.append(image)
assert images[0].tobytes()!=images[1].tobytes(),'lamp must change GPU image'
strip=Image.new('RGBA',(400*len(images),400))
for i,image in enumerate(images):strip.paste(image,(400*i,0))
strip.save(folder/'gpu-views.png')
print('PASS actual GLSL ES compile/link and native GLES front, back, edge, zoom and lamp renders; no GL errors')
