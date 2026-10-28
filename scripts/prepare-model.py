"""Blender cleanup. Run with blender -b --python scripts/prepare-model.py -- INPUT OUTPUT.

The original atlas/normal maps remain on disk in INPUT; OUTPUT is disposable.
Only static meshes are joined. Never rename or merge interactive meshes.
"""
import bpy
import bmesh
import json
import sys
from pathlib import Path

source, output = sys.argv[sys.argv.index("--") + 1:]
# Start empty so the default cube, camera and light cannot reach the export.
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(Path(source).resolve()))
# △ (5), □ (8), SELECT (14) and START (15) stay separate too: joined into the body they were decimated with it,
# which warped their printed labels, and the page needs △, □ and START as their own click targets.
interactive = {"screen_low", *(f"button{i}_low" for i in (1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15))}
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
assert interactive <= {o.name for o in meshes}
before = sum(len(o.data.polygons) for o in meshes)
for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    # Weld coincident atlas seams; loop UVs remain separate. Remove degenerates
    # and non-manifold interior faces, without guessing which hidden walls matter.
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.000001)
    bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=0.000001)
    interior = [f for f in bm.faces if all(len(e.link_faces) > 2 for e in f.edges)]
    bmesh.ops.delete(bm, geom=interior, context="FACES")
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()
    if obj.name == "screen_low":
        # Blender imports glTF +Y up as +Z up. Project in world X/Z so U/V
        # match the old runtime X/Y projection. glTF export flips Blender V,
        # so invert it here to keep the runtime CanvasTexture orientation.
        points = [obj.matrix_world @ v.co for v in obj.data.vertices]
        lo_x, hi_x = min(v.x for v in points), max(v.x for v in points)
        lo_y, hi_y = min(v.z for v in points), max(v.z for v in points)
        uv = obj.data.uv_layers.active or obj.data.uv_layers.new()
        for loop in obj.data.loops:
            point = points[loop.vertex_index]
            uv.data[loop.index].uv = ((point.x-lo_x)/(hi_x-lo_x), 1-(point.z-lo_y)/(hi_y-lo_y))
        # The runtime replaces this material. Avoid another atlas draw/texture.
        material = bpy.data.materials.new("XMB screen")
        material.use_backface_culling = True
        obj.data.materials.clear()
        obj.data.materials.append(material)
    elif not obj.name.startswith("button") and obj.name != "toppart_low":
        # Keep buttons and the printed front shell whole: collapsing the latter
        # stretches the PSP logo's UVs. Reduce the remaining body parts instead
        # to keep the complete model inside check-model's 40k triangle budget.
        modifier = obj.modifiers.new("Preserve silhouette", "DECIMATE")
        modifier.ratio = 0.47
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
for material in bpy.data.materials:
    material.use_backface_culling = True
# The atlas includes emissive details; retain them at 512px rather than
# flattening every surface to the same emissive colour.
for image in bpy.data.images:
    if "emissive" in image.name.lower():
        image.scale(512, 512)
static = [o for o in meshes if o.name not in interactive]
bpy.ops.object.select_all(action="DESELECT")
for obj in static:
    obj.select_set(True)
bpy.context.view_layer.objects.active = static[0]
bpy.ops.object.join()
static[0].name = "body_low"
# All body parts use the same atlas; collapse repeated material slots as well.
body = static[0]
material = body.data.materials[0]
body.data.materials.clear()
body.data.materials.append(material)
for polygon in body.data.polygons:
    polygon.material_index = 0
bpy.ops.export_scene.gltf(filepath=str(Path(output).resolve()), export_format="GLB",
    export_yup=True, export_apply=True, export_texcoords=True, export_normals=True,
    export_tangents=False, export_materials="EXPORT", export_cameras=False,
    export_lights=False, export_animations=False, export_image_format="AUTO")
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print("MODEL_CLEANUP", json.dumps({"source_triangles": before,
    "output_triangles": sum(len(o.data.polygons) for o in meshes),
    "meshes": [o.name for o in meshes]}))
