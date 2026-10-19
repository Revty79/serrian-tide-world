# Cylinder display architecture — A7-P1A

The numerical cylinder, intrinsic distance/path/dab/stroke implementations, exact history and all four persistence codecs retain their A7-D authority. This checkpoint changes the browser display and pointer feedback. No elevation is inferred from an image or GPU result.

## Display resources and transforms

`SurfaceRenderer<View>` describes a provider-owned display lifecycle and presentation receipt. `surfaceDisplayDimensions` caps each scene/overlay backing at three million pixels and device scale 1.5 while preserving aspect ratio. The cylinder implementation is `CylinderWebGLRenderer`; other surfaces keep their existing implementations.

WebGL2 stores two reusable reference meshes: an opaque capped cylinder and its connected side/disk map. They use 4,096 angular display segments, independent of numerical detail. Physical reference faceting is bounded by `1 - cos(pi/4096)` radius units (about 0.0000002942); this is a visual approximation, not a numerical terrain mesh. Shared display rim vertices coincide. CPU double-precision projection/unprojection, visibility and intrinsic brush membership remain authoritative. Native multisampling antialiases reference silhouettes where supported; depth testing preserves foreground occlusion, including both cap orientations. No elevation displacement or 3D terrain was introduced.

Camera movement updates uniforms on the same geometry. Moving a map cut changes a phase uniform and camera translation, without rebuilding terrain or meshes. The GPU interpolates palette colors using three small RGBA8 textures: side rows and two polar cap arrays, including display-only copies of the canonical shared-rim colors and repeated center colors. End-cap angular reversal matches the existing numerical representation. These derived colors never feed editing, readouts or saves. A cache revision triggers one bounded texture upload; camera movement alone does not upload colors.

The scene is presented directly by its WebGL canvas rather than copied through a CPU scratch raster. The transparent input canvas retains the established pointer/keyboard arbiter and becomes the CPU scene canvas on failure. The exact stencil/selection overlay remains separate. Identified software graphics implementations (including SwiftShader) use CPU fallback. CPU fallback retains its bounded coherent-raster generator, old pixel/work limits and transform handoff. It completes one in-flight same-mode camera raster and then takes the latest requested view, avoiding starvation during continuous movement. Mode/size changes still cancel incompatible work. Its lower sharpness and camera throughput are explicit limitations.

Context loss prevents default teardown, invalidates the display transform and switches to the CPU renderer without mutating numerical terrain, history or saved checkpoints. Existing pointer-interruption rules remain: a missing displayed target can stop input, report discarded pending positions and retain one undoable committed prefix. Restoration recreates buffers/program/textures from caller-owned derived colors and submits a coherent current view before enabling hit testing. Shader/resource/upload failure also falls back. Disposal removes listeners and deletes owned GPU objects; it never disposes the caller's terrain. There is one coalesced RAF, at most one CPU raster job, finite timing rings, and no growing camera/render queue.

## Pointer versus applied terrain

The native crosshair cursor is independent of numerical presentation. A small DOM crosshair and explicit **Pointer** label follow pointer input directly, without waiting for the dry-run footprint. They do not claim to show an intrinsic brush radius or speculative terrain. **Pending work** refers to actual accepted numerical work or a pending exact footprint. The dots still show the exact B2A dry-run stencil, or the last committed dab while drawing. The renderer uploads and shows only committed colors.

Each animation frame first presents camera/committed colors, then runs the existing bounded numerical pump and preview preparation. A final stencil update is drawn even when preparation finishes on that frame. Expensive individual numerical pumps and dot projection still run on the main thread. The DOM marker can therefore stall behind a long synchronous task, although the native cursor can continue moving. P1A does not promise to eliminate numerical brush backlogs. P1B needs independent authorization and should evaluate moving numerical preparation/ordered stroke processing off the main thread without altering accepted-input or exact-commit semantics.

## Four different resolutions

1. **Numerical geography:** N=64/128/256, with 4,034/16,258/65,282 canonical Float32 samples. Unchanged.
2. **Visual color interpolation:** filtered palette colors between those samples. It supplies no additional geographic detail and does not interpolate saved elevations.
3. **Display resolution:** native backing pixels within the finite DPR/pixel policy, including during navigation. This replaces enlargement of approximately 22–40k interactive and 90–160k idle CPU pixels on the normal GPU path.
4. **Future artwork/detail:** higher-resolution/tiled terrain and professional cartographic assets remain future work, separately authorized.

## Verification and measurement interpretation

The completion report links actual same-input baseline/improved screenshots, native input traces, CPU-throttled mobile cases, per-stage timings and independent GPU readback comparisons. Tests compare interior GPU pixels against the existing double-precision CPU reference. A pixel envelope accounts for implementation-selected multisample positions; center errors are retained, including grazing angles. Projection cuts and silhouettes are also tested as coverage, rather than pretending their antialiasing equals one center ray.

CPU submission time is not GPU completion time. Input-to-following-RAF opportunity is reported as a browser presentation proxy, not a photon measurement. Frame intervals and missed 60-Hz opportunities are measured separately. Direct3D11 hardware and SwiftShader software runs are identified by their actual unmasked renderer strings. Mobile results are Chromium emulation with 4× main-thread throttling on this desktop's GPU, not physical-phone measurements.

The design follows the browser's [WebGL2 API](https://registry.khronos.org/webgl/specs/2.0.0/), with explicit resource recreation after context loss. No paid service, hosting GPU, extra rendering package, network display service or production deployment is required.
