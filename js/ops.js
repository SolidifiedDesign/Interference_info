"use strict";

var CABLES=CABLES||{};
CABLES.OPS=CABLES.OPS||{};

var Ops=Ops || {};
Ops.Gl=Ops.Gl || {};
Ops.Anim=Ops.Anim || {};
Ops.Html=Ops.Html || {};
Ops.Math=Ops.Math || {};
Ops.Number=Ops.Number || {};
Ops.String=Ops.String || {};
Ops.Devices=Ops.Devices || {};
Ops.Gl.GLTF=Ops.Gl.GLTF || {};
Ops.Trigger=Ops.Trigger || {};
Ops.Graphics=Ops.Graphics || {};
Ops.Gl.Matrix=Ops.Gl.Matrix || {};
Ops.Gl.Meshes=Ops.Gl.Meshes || {};
Ops.Gl.Shader=Ops.Gl.Shader || {};
Ops.Devices.Mouse=Ops.Devices.Mouse || {};
Ops.Graphics.Intersection=Ops.Graphics.Intersection || {};



// **************************************************************
// 
// Ops.Gl.MainLoop
// 
// **************************************************************

Ops.Gl.MainLoop = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    fpsLimit = op.inValue("FPS Limit", 0),
    trigger = op.outTrigger("trigger"),
    width = op.outNumber("width"),
    height = op.outNumber("height"),
    reduceFocusFPS = op.inValueBool("Reduce FPS not focussed", true),
    reduceLoadingFPS = op.inValueBool("Reduce FPS loading"),
    clear = op.inValueBool("Clear", true),
    clearAlpha = op.inValueBool("ClearAlpha", true),
    fullscreen = op.inValueBool("Fullscreen Button", false),
    active = op.inValueBool("Active", true),
    hdpi = op.inValueBool("Hires Displays", false),
    inUnit = op.inSwitch("Pixel Unit", ["Display", "CSS"], "Display");

op.onAnimFrame = render;
hdpi.onChange = function ()
{
    if (hdpi.get()) op.patch.cgl.pixelDensity = window.devicePixelRatio;
    else op.patch.cgl.pixelDensity = 1;

    op.patch.cgl.updateSize();
    if (CABLES.UI) gui.setLayout();
};

active.onChange = function ()
{
    op.patch.removeOnAnimFrame(op);

    if (active.get())
    {
        op.setUiAttrib({ "extendTitle": "" });
        op.onAnimFrame = render;
        op.patch.addOnAnimFrame(op);
        op.log("adding again!");
    }
    else
    {
        op.setUiAttrib({ "extendTitle": "Inactive" });
    }
};

const cgl = op.patch.cgl;
let rframes = 0;
let rframeStart = 0;

if (!op.patch.cgl) op.uiAttr({ "error": "No webgl cgl context" });

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

fullscreen.onChange = updateFullscreenButton;
setTimeout(updateFullscreenButton, 100);
let fsElement = null;

let winhasFocus = true;
let winVisible = true;

window.addEventListener("blur", () => { winhasFocus = false; });
window.addEventListener("focus", () => { winhasFocus = true; });
document.addEventListener("visibilitychange", () => { winVisible = !document.hidden; });
testMultiMainloop();

inUnit.onChange = () =>
{
    width.set(0);
    height.set(0);
};

function getFpsLimit()
{
    if (reduceLoadingFPS.get() && op.patch.loading.getProgress() < 1.0) return 5;

    if (reduceFocusFPS.get())
    {
        if (!winVisible) return 10;
        if (!winhasFocus) return 30;
    }

    return fpsLimit.get();
}

function updateFullscreenButton()
{
    function onMouseEnter()
    {
        if (fsElement)fsElement.style.display = "block";
    }

    function onMouseLeave()
    {
        if (fsElement)fsElement.style.display = "none";
    }

    op.patch.cgl.canvas.addEventListener("mouseleave", onMouseLeave);
    op.patch.cgl.canvas.addEventListener("mouseenter", onMouseEnter);

    if (fullscreen.get())
    {
        if (!fsElement)
        {
            fsElement = document.createElement("div");

            const container = op.patch.cgl.canvas.parentElement;
            if (container)container.appendChild(fsElement);

            fsElement.addEventListener("mouseenter", onMouseEnter);
            fsElement.addEventListener("click", function (e)
            {
                if (CABLES.UI && !e.shiftKey) gui.cycleFullscreen();
                else cgl.fullScreen();
            });
        }

        fsElement.style.padding = "10px";
        fsElement.style.position = "absolute";
        fsElement.style.right = "5px";
        fsElement.style.top = "5px";
        fsElement.style.width = "20px";
        fsElement.style.height = "20px";
        fsElement.style.cursor = "pointer";
        fsElement.style["border-radius"] = "40px";
        fsElement.style.background = "#444";
        fsElement.style["z-index"] = "9999";
        fsElement.style.display = "none";
        fsElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" id=\"Capa_1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 490 490\" style=\"width:20px;height:20px;\" xml:space=\"preserve\" width=\"512px\" height=\"512px\"><g><path d=\"M173.792,301.792L21.333,454.251v-80.917c0-5.891-4.776-10.667-10.667-10.667C4.776,362.667,0,367.442,0,373.333V480     c0,5.891,4.776,10.667,10.667,10.667h106.667c5.891,0,10.667-4.776,10.667-10.667s-4.776-10.667-10.667-10.667H36.416     l152.459-152.459c4.093-4.237,3.975-10.99-0.262-15.083C184.479,297.799,177.926,297.799,173.792,301.792z\" fill=\"#FFFFFF\"/><path d=\"M480,0H373.333c-5.891,0-10.667,4.776-10.667,10.667c0,5.891,4.776,10.667,10.667,10.667h80.917L301.792,173.792     c-4.237,4.093-4.354,10.845-0.262,15.083c4.093,4.237,10.845,4.354,15.083,0.262c0.089-0.086,0.176-0.173,0.262-0.262     L469.333,36.416v80.917c0,5.891,4.776,10.667,10.667,10.667s10.667-4.776,10.667-10.667V10.667C490.667,4.776,485.891,0,480,0z\" fill=\"#FFFFFF\"/><path d=\"M36.416,21.333h80.917c5.891,0,10.667-4.776,10.667-10.667C128,4.776,123.224,0,117.333,0H10.667     C4.776,0,0,4.776,0,10.667v106.667C0,123.224,4.776,128,10.667,128c5.891,0,10.667-4.776,10.667-10.667V36.416l152.459,152.459     c4.237,4.093,10.99,3.975,15.083-0.262c3.992-4.134,3.992-10.687,0-14.82L36.416,21.333z\" fill=\"#FFFFFF\"/><path d=\"M480,362.667c-5.891,0-10.667,4.776-10.667,10.667v80.917L316.875,301.792c-4.237-4.093-10.99-3.976-15.083,0.261     c-3.993,4.134-3.993,10.688,0,14.821l152.459,152.459h-80.917c-5.891,0-10.667,4.776-10.667,10.667s4.776,10.667,10.667,10.667     H480c5.891,0,10.667-4.776,10.667-10.667V373.333C490.667,367.442,485.891,362.667,480,362.667z\" fill=\"#FFFFFF\"/></g></svg>";
    }
    else
    {
        if (fsElement)
        {
            fsElement.style.display = "none";
            fsElement.remove();
            fsElement = null;
        }
    }
}

op.onDelete = function ()
{
    cgl.gl.clearColor(0, 0, 0, 0);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
};

function render(time)
{
    if (!active.get()) return;
    if (cgl.aborted || cgl.canvas.clientWidth === 0 || cgl.canvas.clientHeight === 0) return;

    op.patch.cg = cgl;

    if (hdpi.get())op.patch.cgl.pixelDensity = window.devicePixelRatio;

    const startTime = performance.now();

    op.patch.config.fpsLimit = getFpsLimit();

    if (cgl.canvasWidth == -1)
    {
        cgl.setCanvas(op.patch.config.glCanvasId);
        return;
    }

    if (cgl.canvasWidth != width.get() || cgl.canvasHeight != height.get())
    {
        let div = 1;
        if (inUnit.get() == "CSS")div = op.patch.cgl.pixelDensity;

        width.set(cgl.canvasWidth / div);
        height.set(cgl.canvasHeight / div);
    }

    if (CABLES.now() - rframeStart > 1000)
    {
        CGL.fpsReport = CGL.fpsReport || [];
        if (op.patch.loading.getProgress() >= 1.0 && rframeStart !== 0)CGL.fpsReport.push(rframes);
        rframes = 0;
        rframeStart = CABLES.now();
    }
    CGL.MESH.lastShader = null;
    CGL.MESH.lastMesh = null;

    cgl.renderStart(cgl, identTranslate, identTranslateView);

    if (clear.get())
    {
        cgl.gl.clearColor(0, 0, 0, 1);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    }

    trigger.trigger();

    if (CGL.MESH.lastMesh)CGL.MESH.lastMesh.unBind();

    if (CGL.Texture.previewTexture)
    {
        if (!CGL.Texture.texturePreviewer) CGL.Texture.texturePreviewer = new CGL.Texture.texturePreview(cgl);
        CGL.Texture.texturePreviewer.render(CGL.Texture.previewTexture);
    }
    cgl.renderEnd(cgl);

    op.patch.cg = null;

    if (clearAlpha.get())
    {
        cgl.gl.clearColor(1, 1, 1, 1);
        cgl.gl.colorMask(false, false, false, true);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT);
        cgl.gl.colorMask(true, true, true, true);
    }

    if (!cgl.frameStore.phong)cgl.frameStore.phong = {};
    rframes++;

    op.patch.cgl.profileData.profileMainloopMs = performance.now() - startTime;
}

function testMultiMainloop()
{
    setTimeout(
        () =>
        {
            if (op.patch.getOpsByObjName(op.name).length > 1)
            {
                op.setUiError("multimainloop", "there should only be one mainloop op!");
                op.patch.addEventListener("onOpDelete", testMultiMainloop);
            }
            else op.setUiError("multimainloop", null, 1);
        }, 500);
}


};

Ops.Gl.MainLoop.prototype = new CABLES.Op();
CABLES.OPS["b0472a1d-db16-4ba6-8787-f300fbdc77bb"]={f:Ops.Gl.MainLoop,objName:"Ops.Gl.MainLoop"};




// **************************************************************
// 
// Ops.Trigger.Sequence
// 
// **************************************************************

Ops.Trigger.Sequence = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    exe = op.inTrigger("exe"),
    cleanup = op.inTriggerButton("Clean up connections");

const
    exes = [],
    triggers = [],
    num = 16;

let
    updateTimeout = null,
    connectedOuts = [];

exe.onTriggered = triggerAll;
cleanup.onTriggered = clean;
cleanup.setUiAttribs({ "hideParam": true, "hidePort": true });

for (let i = 0; i < num; i++)
{
    const p = op.outTrigger("trigger " + i);
    triggers.push(p);
    p.onLinkChanged = updateButton;

    if (i < num - 1)
    {
        let newExe = op.inTrigger("exe " + i);
        newExe.onTriggered = triggerAll;
        exes.push(newExe);
    }
}

updateConnected();

function updateConnected()
{
    connectedOuts.length = 0;
    for (let i = 0; i < triggers.length; i++)
        if (triggers[i].links.length > 0) connectedOuts.push(triggers[i]);
}

function updateButton()
{
    updateConnected();
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() =>
    {
        let show = false;
        for (let i = 0; i < triggers.length; i++)
            if (triggers[i].links.length > 1) show = true;

        cleanup.setUiAttribs({ "hideParam": !show });

        if (op.isCurrentUiOp()) op.refreshParams();
    }, 60);
}

function triggerAll()
{
    // for (let i = 0; i < triggers.length; i++) triggers[i].trigger();
    for (let i = 0; i < connectedOuts.length; i++) connectedOuts[i].trigger();
}

function clean()
{
    let count = 0;
    for (let i = 0; i < triggers.length; i++)
    {
        let removeLinks = [];

        if (triggers[i].links.length > 1)
            for (let j = 1; j < triggers[i].links.length; j++)
            {
                while (triggers[count].links.length > 0) count++;

                removeLinks.push(triggers[i].links[j]);
                const otherPort = triggers[i].links[j].getOtherPort(triggers[i]);
                op.patch.link(op, "trigger " + count, otherPort.op, otherPort.name);
                count++;
            }

        for (let j = 0; j < removeLinks.length; j++) removeLinks[j].remove();
    }
    updateButton();
    updateConnected();
}


};

Ops.Trigger.Sequence.prototype = new CABLES.Op();
CABLES.OPS["a466bc1f-06e9-4595-8849-bffb9fe22f99"]={f:Ops.Trigger.Sequence,objName:"Ops.Trigger.Sequence"};




// **************************************************************
// 
// Ops.Gl.Matrix.Camera
// 
// **************************************************************

Ops.Gl.Matrix.Camera = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const render = op.inTrigger("render");
const trigger = op.outTrigger("trigger");

/* Inputs */
// projection | prespective & ortogonal
const projectionMode = op.inValueSelect("projection mode", ["prespective", "ortogonal"], "prespective");
const zNear = op.inValue("frustum near", 0.01);
const zFar = op.inValue("frustum far", 5000.0);

const fov = op.inValue("fov", 45);
const autoAspect = op.inValueBool("Auto Aspect Ratio", true);
const aspect = op.inValue("Aspect Ratio", 1);

// look at camera
const eyeX = op.inValue("eye X", 0);
const eyeY = op.inValue("eye Y", 0);
const eyeZ = op.inValue("eye Z", 5);

const centerX = op.inValue("center X", 0);
const centerY = op.inValue("center Y", 0);
const centerZ = op.inValue("center Z", 0);

// camera transform and movements
const posX = op.inValue("truck", 0);
const posY = op.inValue("boom", 0);
const posZ = op.inValue("dolly", 0);

const rotX = op.inValue("tilt", 0);
const rotY = op.inValue("pan", 0);
const rotZ = op.inValue("roll", 0);

/* Outputs */
const outAsp = op.outNumber("Aspect");
const outArr = op.outArray("Look At Array");

/* logic */
const cgl = op.patch.cgl;

let asp = 0;

const vUp = vec3.create();
const vEye = vec3.create();
const vCenter = vec3.create();
const transMatrix = mat4.create();
mat4.identity(transMatrix);

const arr = [];

// Transform and move
const vPos = vec3.create();
const transMatrixMove = mat4.create();
mat4.identity(transMatrixMove);

let updateCameraMovementMatrix = true;

render.onTriggered = function ()
{
    if (cgl.frameStore.shadowPass) return trigger.trigger();

    // Aspect ration
    if (!autoAspect.get()) asp = aspect.get();
    else asp = cgl.getViewPort()[2] / cgl.getViewPort()[3];
    outAsp.set(asp);

    // translation (truck, boom, dolly)
    cgl.pushViewMatrix();

    if (updateCameraMovementMatrix)
    {
        mat4.identity(transMatrixMove);

        vec3.set(vPos, posX.get(), posY.get(), posZ.get());
        if (posX.get() !== 0.0 || posY.get() !== 0.0 || posZ.get() !== 0.0)
            mat4.translate(transMatrixMove, transMatrixMove, vPos);

        if (rotX.get() !== 0)
            mat4.rotateX(transMatrixMove, transMatrixMove, rotX.get() * CGL.DEG2RAD);
        if (rotY.get() !== 0)
            mat4.rotateY(transMatrixMove, transMatrixMove, rotY.get() * CGL.DEG2RAD);
        if (rotZ.get() !== 0)
            mat4.rotateZ(transMatrixMove, transMatrixMove, rotZ.get() * CGL.DEG2RAD);

        updateCameraMovementMatrix = false;
    }

    mat4.multiply(cgl.vMatrix, cgl.vMatrix, transMatrixMove);

    // projection (prespective / ortogonal)
    cgl.pushPMatrix();

    // look at
    cgl.pushViewMatrix();

    if (projectionMode.get() == "prespective")
    {
        mat4.perspective(
            cgl.pMatrix,
            fov.get() * 0.0174533,
            asp,
            zNear.get(),
            zFar.get()
        );
    }
    else if (projectionMode.get() == "ortogonal")
    {
        mat4.ortho(
            cgl.pMatrix,
            -1 * (fov.get() / 14),
            1 * (fov.get() / 14),
            -1 * (fov.get() / 14) / asp,
            1 * (fov.get() / 14) / asp,
            zNear.get(),
            zFar.get()
        );
    }

    arr[0] = eyeX.get();
    arr[1] = eyeY.get();
    arr[2] = eyeZ.get();

    arr[3] = centerX.get();
    arr[4] = centerY.get();
    arr[5] = centerZ.get();

    arr[6] = 0;
    arr[7] = 1;
    arr[8] = 0;

    outArr.setRef(arr);

    vec3.set(vUp, 0, 1, 0);
    vec3.set(vEye, eyeX.get(), eyeY.get(), eyeZ.get());
    vec3.set(vCenter, centerX.get(), centerY.get(), centerZ.get());

    mat4.lookAt(transMatrix, vEye, vCenter, vUp);

    mat4.multiply(cgl.vMatrix, cgl.vMatrix, transMatrix);

    trigger.trigger();

    cgl.popViewMatrix();
    cgl.popPMatrix();

    cgl.popViewMatrix();

    // GUI for dolly, boom and truck
    if (op.isCurrentUiOp())
        gui.setTransformGizmo({
            "posX": posX,
            "posY": posY,
            "posZ": posZ
        });
};

const updateUI = function ()
{
    if (!autoAspect.get())
    {
        aspect.setUiAttribs({ "greyout": false });
    }
    else
    {
        aspect.setUiAttribs({ "greyout": true });
    }
};

const cameraMovementChanged = function ()
{
    updateCameraMovementMatrix = true;
};

// listeners
posX.onChange = cameraMovementChanged;
posY.onChange = cameraMovementChanged;
posZ.onChange = cameraMovementChanged;

rotX.onChange = cameraMovementChanged;
rotY.onChange = cameraMovementChanged;
rotZ.onChange = cameraMovementChanged;

autoAspect.onChange = updateUI;
updateUI();


};

Ops.Gl.Matrix.Camera.prototype = new CABLES.Op();
CABLES.OPS["b24dbfdc-485c-49d2-92a1-7258efd9239a"]={f:Ops.Gl.Matrix.Camera,objName:"Ops.Gl.Matrix.Camera"};




// **************************************************************
// 
// Ops.Devices.Mouse.MouseDrag
// 
// **************************************************************

Ops.Devices.Mouse.MouseDrag = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    active = op.inValueBool("Active", true),
    speed = op.inValue("Speed", 0.01),
    inputType = op.inSwitch("Input Type", ["All", "Mouse", "Touch"], "All"),
    area = op.inSwitch("Area", ["Canvas Area", "Canvas", "Document"], "Canvas Area"),
    outDeltaX = op.outNumber("Delta X"),
    outDeltaY = op.outNumber("Delta Y"),
    outDragging = op.outNumber("Is Dragging");

let listenerElement = null;
let sizeElement = null;
const absoluteX = 0;
const absoluteY = 0;
let pressed = false;
let lastX = 0;
let lastY = 0;
let firstMove = true;

inputType.onChange =
area.onChange = updateArea;

updateArea();

function isHovering(e)
{
    if (area.get() === "Canvas Area")
    {
        const r = sizeElement.getBoundingClientRect();

        return (
            e.clientX > r.left &&
            e.clientX < r.left + r.width &&
            e.clientY > r.top &&
            e.clientY < r.top + r.height
        );
    }
    return true;
}

function onMouseMove(e)
{
    if (e.touches) e = e.touches[0];

    if (pressed && e && isHovering(e))
    {
        if (!firstMove)
        {
            outDragging.set(true);
            const deltaX = (e.clientX - lastX) * speed.get();
            const deltaY = (e.clientY - lastY) * speed.get();

            outDeltaX.set(0);
            outDeltaY.set(0);
            outDeltaX.set(deltaX);
            outDeltaY.set(deltaY);
        }

        firstMove = false;

        lastX = e.clientX;
        lastY = e.clientY;
    }
}

function onMouseDown(e)
{
    try { listenerElement.setPointerCapture(e.pointerId); }
    catch (_e) {}

    pressed = true;
}

function onMouseUp(e)
{
    try { listenerElement.releasePointerCapture(e.pointerId); }
    catch (e) {}

    pressed = false;
    outDragging.set(false);
    lastX = 0;
    lastY = 0;
    firstMove = true;
}

function updateArea()
{
    removeListener();

    if (area.get() == "Canvas Area")
    {
        listenerElement = document;
        sizeElement = op.patch.cgl.canvas;
    }
    else if (area.get() == "Document") listenerElement = sizeElement = document;
    else listenerElement = sizeElement = op.patch.cgl.canvas;

    if (active.get())addListener();
}

function addListener()
{
    if (!listenerElement)updateArea();

    if (inputType.get() == "All" || inputType.get() == "Mouse")
    {
        listenerElement.addEventListener("mousemove", onMouseMove);
        listenerElement.addEventListener("mousedown", onMouseDown);
        listenerElement.addEventListener("mouseup", onMouseUp);
        listenerElement.addEventListener("mouseenter", onMouseUp);
        listenerElement.addEventListener("mouseleave", onMouseUp);
    }

    if (inputType.get() == "All" || inputType.get() == "Touch")
    {
        listenerElement.addEventListener("touchmove", onMouseMove);
        listenerElement.addEventListener("touchend", onMouseUp);
        listenerElement.addEventListener("touchstart", onMouseDown);
    }
}

function removeListener()
{
    if (!listenerElement) return;
    listenerElement.removeEventListener("mousemove", onMouseMove);
    listenerElement.removeEventListener("mousedown", onMouseDown);
    listenerElement.removeEventListener("mouseup", onMouseUp);
    listenerElement.removeEventListener("mouseenter", onMouseUp);
    listenerElement.removeEventListener("mouseleave", onMouseUp);

    listenerElement.removeEventListener("touchmove", onMouseMove);
    listenerElement.removeEventListener("touchend", onMouseUp);
    listenerElement.removeEventListener("touchstart", onMouseDown);
}

active.onChange = function ()
{
    if (active.get())addListener();
    else removeListener();
};

op.onDelete = function ()
{
    removeListener();
};


};

Ops.Devices.Mouse.MouseDrag.prototype = new CABLES.Op();
CABLES.OPS["5103d14e-2f21-4f43-ae91-c1b55a944226"]={f:Ops.Devices.Mouse.MouseDrag,objName:"Ops.Devices.Mouse.MouseDrag"};




// **************************************************************
// 
// Ops.Gl.Shader.MatCapMaterialNew_v3
// 
// **************************************************************

Ops.Gl.Shader.MatCapMaterialNew_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"matcap_frag":"{{MODULES_HEAD}}\n\n#ifdef HAS_TEXTURES\n    IN vec2 texCoord;\n#endif\n\nIN vec3 transformedNormal;\nIN vec3 viewSpacePosition;\n\nUNI vec4 inColor;\n\nUNI sampler2D texMatcap;\n\n#ifdef HAS_DIFFUSE_TEXTURE\n   UNI sampler2D texDiffuse;\n#endif\n\n#ifdef USE_SPECULAR_TEXTURE\n   UNI sampler2D texSpec;\n   UNI sampler2D texSpecMatCap;\n#endif\n\n#ifdef HAS_AO_TEXTURE\n    UNI sampler2D texAo;\n    UNI float aoIntensity;\n#endif\n\n#ifdef HAS_NORMAL_TEXTURE\n    IN vec3 vBiTangent;\n    IN vec3 vTangent;\n    IN mat3 normalMatrix;\n\n    UNI sampler2D texNormal;\n    UNI float normalMapIntensity;\n#endif\n\n#ifdef HAS_TEXTURE_OPACITY\n    UNI sampler2D texOpacity;\n#endif\n\n#ifdef CALC_SSNORMALS\n    IN vec3 eye_relative_pos;\n\n    // from https://www.enkisoftware.com/devlogpost-20150131-1-Normal_generation_in_the_pixel_shader\n    vec3 CalculateScreenSpaceNormals() {\n    \tvec3 dFdxPos = dFdx(eye_relative_pos);\n    \tvec3 dFdyPos = dFdy(eye_relative_pos);\n    \tvec3 screenSpaceNormal = normalize( cross(dFdxPos, dFdyPos));\n        return normalize(screenSpaceNormal);\n    }\n#endif\n\n// * taken & modified from https://github.com/mrdoob/three.js/blob/dev/src/renderers/shaders/ShaderLib/meshmatcap_frag.glsl.js\nvec2 getMatCapUV(vec3 viewSpacePosition, vec3 normal) {\n    vec3 viewDir = normalize(-viewSpacePosition);\n\tvec3 x = normalize(vec3(viewDir.z, 0.0, - viewDir.x));\n\tvec3 y = normalize(cross(viewDir, x));\n\tvec2 uv = vec2(dot(x, normal), dot(y, normal)) * 0.495 + 0.5; // 0.495 to remove artifacts caused by undersized matcap disks\n\treturn uv;\n}\n\nvoid main()\n{\n    vec3 viewSpaceNormal = normalize(transformedNormal);\n\n    #ifdef HAS_TEXTURES\n        vec2 texCoords = texCoord;\n        {{MODULE_BEGIN_FRAG}}\n    #endif\n\n\n    #ifdef CALC_SSNORMALS\n        viewSpaceNormal = CalculateScreenSpaceNormals();\n    #endif\n\n\n   #ifdef HAS_NORMAL_TEXTURE\n        vec3 normalFromMap = texture( texNormal, texCoord ).xyz * 2.0 - 1.0;\n        normalFromMap = normalize(normalFromMap);\n\n        vec3 tangent;\n        vec3 binormal;\n\n        #ifdef CALC_TANGENT\n            vec3 c1 = cross(normalFromMap, vec3(0.0, 0.0, 1.0));\n            vec3 c2 = cross(normalFromMap, vec3(0.0, 1.0, 0.0));\n\n            tangent = c1;\n            tangent = normalize(tangent);\n            binormal = cross(viewSpaceNormal, tangent);\n            binormal = normalize(binormal);\n        #endif\n\n        #ifndef CALC_TANGENT\n            tangent = normalize(normalMatrix * vTangent);\n            vec3 bitangent = normalize(normalMatrix * vBiTangent);\n            binormal = normalize(cross(viewSpaceNormal, bitangent));\n        #endif\n\n        normalFromMap = normalize(\n            tangent * normalFromMap.x\n            + binormal * normalFromMap.y\n            + viewSpaceNormal * normalFromMap.z\n        );\n\n        vec3 mixedNormal = normalize(viewSpaceNormal + normalFromMap * normalMapIntensity);\n\n        viewSpaceNormal = mixedNormal;\n    #endif\n\n    vec4 col = texture(texMatcap, getMatCapUV(viewSpacePosition, viewSpaceNormal));\n\n    #ifdef HAS_DIFFUSE_TEXTURE\n        col = col*texture(texDiffuse, texCoords);\n    #endif\n\n    col.rgb *= inColor.rgb;\n\n\n    #ifdef HAS_AO_TEXTURE\n        col = col\n            * mix(\n                vec4(1.0,1.0,1.0,1.0),\n                texture(texAo, texCoords),\n                aoIntensity\n            );\n    #endif\n\n    #ifdef USE_SPECULAR_TEXTURE\n        vec4 spec = texture(texSpecMatCap, getMatCapUV(viewSpacePosition, viewSpaceNormal));\n        spec *= texture(texSpec, texCoords);\n        col += spec;\n    #endif\n\n    col.a *= inColor.a;\n\n    #ifdef HAS_TEXTURE_OPACITY\n        #ifdef TRANSFORMALPHATEXCOORDS\n            texCoords=vec2(texCoord.s,1.0-texCoord.t);\n            texCoords.y = 1. - texCoords.y;\n        #endif\n        #ifdef ALPHA_MASK_ALPHA\n            col.a*=texture(texOpacity,texCoords).a;\n        #endif\n        #ifdef ALPHA_MASK_LUMI\n            col.a*=dot(vec3(0.2126,0.7152,0.0722), texture(texOpacity,texCoords).rgb);\n        #endif\n        #ifdef ALPHA_MASK_R\n            col.a*=texture(texOpacity,texCoords).r;\n        #endif\n        #ifdef ALPHA_MASK_G\n            col.a*=texture(texOpacity,texCoords).g;\n        #endif\n        #ifdef ALPHA_MASK_B\n            col.a*=texture(texOpacity,texCoords).b;\n        #endif\n\n        #ifdef DISCARDTRANS\n            if(col.a < 0.2) discard;\n        #endif\n    #endif\n\n    {{MODULE_COLOR}}\n\n    outColor = col;\n}","matcap_vert":"IN vec3 vPosition;\n\n#ifdef HAS_TEXTURES\n    IN vec2 attrTexCoord;\n#endif\n\nIN vec3 attrVertNormal;\nIN float attrVertIndex;\n\n#ifdef HAS_NORMAL_TEXTURE\n    IN vec3 attrTangent;\n    IN vec3 attrBiTangent;\n    OUT vec3 vBiTangent;\n    OUT vec3 vTangent;\n#endif\n\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\nUNI vec3 camPos;\n\n#ifdef HAS_TEXTURES\n    UNI vec2 texOffset;\n    UNI vec2 texRepeat;\n    OUT vec2 texCoord;\n#endif\n\nOUT mat3 normalMatrix;\nOUT vec3 viewSpacePosition;\nOUT vec3 transformedNormal;\n\n{{MODULES_HEAD}}\n\n#ifdef CALC_SSNORMALS\n    // from https://www.enkisoftware.com/devlogpost-20150131-1-Normal_generation_in_the_pixel_shader\n    OUT vec3 eye_relative_pos;\n#endif\n\nmat3 transposeMat3(mat3 m) {\n    return mat3(m[0][0], m[1][0], m[2][0],\n        m[0][1], m[1][1], m[2][1],\n        m[0][2], m[1][2], m[2][2]);\n}\n\n mat3 inverseMat3(mat3 m) {\n    float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];\n    float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];\n    float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];\n\n    float b01 = a22 * a11 - a12 * a21;\n    float b11 = -a22 * a10 + a12 * a20;\n    float b21 = a21 * a10 - a11 * a20;\n\n    float det = a00 * b01 + a01 * b11 + a02 * b21;\n\n    return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11),\n        b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10),\n        b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;\n}\n\nvoid main()\n{\n    #ifdef HAS_TEXTURES\n        texCoord = texRepeat * vec2(attrTexCoord.x, attrTexCoord.y) + texOffset;\n        texCoord.y = 1. - texCoord.y;\n    #endif\n\n    mat4 mMatrix = modelMatrix;\n    mat4 mvMatrix;\n\n    #ifdef HAS_NORMAL_TEXTURE\n        vec3 tangent = attrTangent;\n        vec3 bitangent = attrBiTangent;\n        vTangent = attrTangent;\n        vBiTangent = attrBiTangent;\n    #endif\n\n    vec4 pos = vec4(vPosition, 1.);\n    vec3 norm = attrVertNormal;\n\n    {{MODULE_VERTEX_POSITION}}\n\n    mvMatrix = viewMatrix * mMatrix;\n    vec3 normal = norm;\n\n    normalMatrix = transposeMat3(inverseMat3(mat3(mvMatrix)));\n\n    vec3 fragPos = vec3((mvMatrix) * pos);\n    viewSpacePosition = normalize(fragPos);\n\n    #ifdef CALC_SSNORMALS\n        eye_relative_pos = -(vec3(viewMatrix * vec4(camPos, 1.)) - fragPos);\n    #endif\n\n    transformedNormal = normalize(mat3(normalMatrix) * normal);\n\n   gl_Position = projMatrix * mvMatrix * pos;\n\n}",};
const cgl = op.patch.cgl;

const
    render = op.inTrigger("Render"),
    textureMatcap = op.inTexture("MatCap"),
    textureDiffuse = op.inTexture("Diffuse"),
    textureNormal = op.inTexture("Normal"),
    textureSpec = op.inTexture("Specular Mask"),
    textureSpecMatCap = op.inTexture("Specular MatCap"),
    textureAo = op.inTexture("AO Texture"),
    textureOpacity = op.inTexture("Opacity Texture"),
    r = op.inValueSlider("r", 1),
    g = op.inValueSlider("g", 1),
    b = op.inValueSlider("b", 1),
    pOpacity = op.inValueSlider("Opacity", 1),
    aoIntensity = op.inValueSlider("AO Intensity", 1.0),
    normalMapIntensity = op.inFloatSlider("Normal Map Intensity", 1),
    repeatX = op.inValue("Repeat X", 1),
    repeatY = op.inValue("Repeat Y", 1),
    offsetX = op.inValue("Offset X", 0),
    offsetY = op.inValue("Offset Y", 0),
    ssNormals = op.inValueBool("Screen Space Normals"),
    calcTangents = op.inValueBool("Calc normal tangents", true),
    texCoordAlpha = op.inValueBool("Opacity TexCoords Transform", false),
    discardTransPxl = op.inValueBool("Discard Transparent Pixels"),

    next = op.outTrigger("Next"),
    shaderOut = op.outObject("Shader");

r.setUiAttribs({ "colorPick": true });

const alphaMaskSource = op.inSwitch("Alpha Mask Source", ["Luminance", "R", "G", "B", "A"], "Luminance");
alphaMaskSource.setUiAttribs({ "greyout": true });

op.setPortGroup("Texture Opacity", [alphaMaskSource, texCoordAlpha, discardTransPxl]);
op.setPortGroup("Texture Transforms", [aoIntensity, normalMapIntensity, repeatX, repeatY, offsetX, offsetY, calcTangents, ssNormals]);
op.setPortGroup("Texture Maps", [textureDiffuse, textureNormal, textureSpec, textureSpecMatCap, textureAo, textureOpacity]);
op.setPortGroup("Color", [r, g, b, pOpacity]);

const shader = new CGL.Shader(cgl, "MatCapMaterialNew3");
const uniOpacity = new CGL.Uniform(shader, "f", "opacity", pOpacity);

shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);
shader.setSource(attachments.matcap_vert, attachments.matcap_frag);
shaderOut.set(shader);

const textureMatcapUniform = new CGL.Uniform(shader, "t", "texMatcap");
let textureDiffuseUniform = null;
let textureNormalUniform = null;
let normalMapIntensityUniform = null;
let textureSpecUniform = null;
let textureSpecMatCapUniform = null;
let textureAoUniform = null;
const offsetUniform = new CGL.Uniform(shader, "2f", "texOffset", offsetX, offsetY);
const repeatUniform = new CGL.Uniform(shader, "2f", "texRepeat", repeatX, repeatY);

const aoIntensityUniform = new CGL.Uniform(shader, "f", "aoIntensity", aoIntensity);
const colorUniform = new CGL.Uniform(shader, "4f", "inColor", r, g, b, pOpacity);

calcTangents.onChange = updateDefines;
updateDefines();

function updateDefines()
{
    if (calcTangents.get()) shader.define("CALC_TANGENT");
    else shader.removeDefine("CALC_TANGENT");
}

ssNormals.onChange = function ()
{
    if (ssNormals.get())
    {
        if (cgl.glVersion < 2)
        {
            cgl.gl.getExtension("OES_standard_derivatives");
            shader.enableExtension("GL_OES_standard_derivatives");
        }

        shader.define("CALC_SSNORMALS");
    }
    else shader.removeDefine("CALC_SSNORMALS");
};

textureMatcap.onChange = updateMatcap;

function updateMatcap()
{
    if (!cgl.defaultMatcapTex3)
    {
        const pixels = new Uint8Array(256 * 4);
        for (let x = 0; x < 16; x++)
        {
            for (let y = 0; y < 16; y++)
            {
                let c = y * 16;
                c *= Math.min(1, (x + y / 3) / 8);
                pixels[(x + y * 16) * 4 + 0] = pixels[(x + y * 16) * 4 + 1] = pixels[(x + y * 16) * 4 + 2] = c;
                pixels[(x + y * 16) * 4 + 3] = 255;
            }
        }

        cgl.defaultMatcapTex3 = new CGL.Texture(cgl);
        cgl.defaultMatcapTex3.initFromData(pixels, 16, 16, CGL.Texture.FILTER_LINEAR, CGL.Texture.WRAP_REPEAT);
    }
}

textureDiffuse.onChange = function ()
{
    if (textureDiffuse.get())
    {
        if (textureDiffuseUniform !== null) return;
        shader.define("HAS_DIFFUSE_TEXTURE");
        shader.removeUniform("texDiffuse");
        textureDiffuseUniform = new CGL.Uniform(shader, "t", "texDiffuse");
    }
    else
    {
        shader.removeDefine("HAS_DIFFUSE_TEXTURE");
        shader.removeUniform("texDiffuse");
        textureDiffuseUniform = null;
    }
};

textureNormal.onChange = function ()
{
    if (textureNormal.get())
    {
        if (textureNormalUniform !== null) return;
        shader.define("HAS_NORMAL_TEXTURE");
        shader.removeUniform("texNormal");
        textureNormalUniform = new CGL.Uniform(shader, "t", "texNormal");
        if (!normalMapIntensityUniform) normalMapIntensityUniform = new CGL.Uniform(shader, "f", "normalMapIntensity", normalMapIntensity);
    }
    else
    {
        shader.removeDefine("HAS_NORMAL_TEXTURE");
        shader.removeUniform("texNormal");
        textureNormalUniform = null;
    }
};

textureAo.onChange = function ()
{
    if (textureAo.get())
    {
        if (textureAoUniform !== null) return;
        shader.define("HAS_AO_TEXTURE");
        shader.removeUniform("texAo");
        textureAoUniform = new CGL.Uniform(shader, "t", "texAo");
    }
    else
    {
        shader.removeDefine("HAS_AO_TEXTURE");
        shader.removeUniform("texAo");
        textureAoUniform = null;
    }
};

textureSpec.onChange = textureSpecMatCap.onChange = function ()
{
    if (textureSpec.get() && textureSpecMatCap.get())
    {
        if (textureSpecUniform !== null) return;
        shader.define("USE_SPECULAR_TEXTURE");
        shader.removeUniform("texSpec");
        shader.removeUniform("texSpecMatCap");
        textureSpecUniform = new CGL.Uniform(shader, "t", "texSpec");
        textureSpecMatCapUniform = new CGL.Uniform(shader, "t", "texSpecMatCap");
    }
    else
    {
        shader.removeDefine("USE_SPECULAR_TEXTURE");
        shader.removeUniform("texSpec");
        shader.removeUniform("texSpecMatCap");
        textureSpecUniform = null;
        textureSpecMatCapUniform = null;
    }
};

// TEX OPACITY

function updateAlphaMaskMethod()
{
    if (alphaMaskSource.get() == "Alpha Channel") shader.define("ALPHA_MASK_ALPHA");
    else shader.removeDefine("ALPHA_MASK_ALPHA");

    if (alphaMaskSource.get() == "Luminance") shader.define("ALPHA_MASK_LUMI");
    else shader.removeDefine("ALPHA_MASK_LUMI");

    if (alphaMaskSource.get() == "R") shader.define("ALPHA_MASK_R");
    else shader.removeDefine("ALPHA_MASK_R");

    if (alphaMaskSource.get() == "G") shader.define("ALPHA_MASK_G");
    else shader.removeDefine("ALPHA_MASK_G");

    if (alphaMaskSource.get() == "B") shader.define("ALPHA_MASK_B");
    else shader.removeDefine("ALPHA_MASK_B");
}
alphaMaskSource.onChange = updateAlphaMaskMethod;
textureOpacity.onChange = updateOpacity;

let textureOpacityUniform = null;

function updateOpacity()
{
    if (textureOpacity.get())
    {
        if (textureOpacityUniform !== null) return;
        shader.removeUniform("texOpacity");
        shader.define("HAS_TEXTURE_OPACITY");
        if (!textureOpacityUniform) textureOpacityUniform = new CGL.Uniform(shader, "t", "texOpacity");

        alphaMaskSource.setUiAttribs({ "greyout": false });
        discardTransPxl.setUiAttribs({ "greyout": false });
        texCoordAlpha.setUiAttribs({ "greyout": false });
    }
    else
    {
        shader.removeUniform("texOpacity");
        shader.removeDefine("HAS_TEXTURE_OPACITY");
        textureOpacityUniform = null;

        alphaMaskSource.setUiAttribs({ "greyout": true });
        discardTransPxl.setUiAttribs({ "greyout": true });
        texCoordAlpha.setUiAttribs({ "greyout": true });
    }
    updateAlphaMaskMethod();
}

discardTransPxl.onChange = function ()
{
    if (discardTransPxl.get()) shader.define("DISCARDTRANS");
    else shader.removeDefine("DISCARDTRANS");
};

texCoordAlpha.onChange = function ()
{
    if (texCoordAlpha.get()) shader.define("TRANSFORMALPHATEXCOORDS");
    else shader.removeDefine("TRANSFORMALPHATEXCOORDS");
};

function checkUiErrors()
{
    if (textureSpec.get() && !textureSpecMatCap.get())
    {
        op.setUiError("specNoMatCapSpec", "You connected a specular texture but have not connected a specular matcap texture. You need to connect both texture inputs for the specular input to work.", 1);
        op.setUiError("noSpecMatCapSpec", null);
    }
    else if (!textureSpec.get() && textureSpecMatCap.get())
    {
        op.setUiError("noSpecMatCapSpec", "You connected a specular matcap texture but have not connected a specular texture. You need to connect both texture inputs for the specular input to work.", 1);
        op.setUiError("specNoMatCapSpec", null);
    }
    else if (textureSpec.get() && textureSpecMatCap.get())
    {
        op.setUiError("specNoMatCapSpec", null);
        op.setUiError("noSpecMatCapSpec", null);
    }
    else
    {
        op.setUiError("specNoMatCapSpec", null);
        op.setUiError("noSpecMatCapSpec", null);
    }
}

render.onTriggered = function ()
{
    checkUiErrors();

    if (!cgl.defaultMatcapTex3) updateMatcap();
    shader.popTextures();

    const tex = textureMatcap.get() || cgl.defaultMatcapTex3;
    shader.pushTexture(textureMatcapUniform, tex.tex);

    if (textureDiffuse.get() && textureDiffuseUniform) shader.pushTexture(textureDiffuseUniform, textureDiffuse.get().tex);
    if (textureNormal.get() && textureNormalUniform) shader.pushTexture(textureNormalUniform, textureNormal.get().tex);
    if (textureSpec.get() && textureSpecUniform) shader.pushTexture(textureSpecUniform, textureSpec.get().tex);
    if (textureSpecMatCap.get() && textureSpecMatCapUniform) shader.pushTexture(textureSpecMatCapUniform, textureSpecMatCap.get().tex);
    if (textureAo.get() && textureAoUniform) shader.pushTexture(textureAoUniform, textureAo.get().tex);
    if (textureOpacity.get() && textureOpacityUniform) shader.pushTexture(textureOpacityUniform, textureOpacity.get().tex);

    cgl.pushShader(shader);
    next.trigger();
    cgl.popShader();
};


};

Ops.Gl.Shader.MatCapMaterialNew_v3.prototype = new CABLES.Op();
CABLES.OPS["c1dd6e76-61b4-471a-b8d1-f550a5a9a4f4"]={f:Ops.Gl.Shader.MatCapMaterialNew_v3,objName:"Ops.Gl.Shader.MatCapMaterialNew_v3"};




// **************************************************************
// 
// Ops.Gl.Matrix.Transform
// 
// **************************************************************

Ops.Gl.Matrix.Transform = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    posX = op.inValue("posX", 0),
    posY = op.inValue("posY", 0),
    posZ = op.inValue("posZ", 0),
    scale = op.inValue("scale", 1),
    rotX = op.inValue("rotX", 0),
    rotY = op.inValue("rotY", 0),
    rotZ = op.inValue("rotZ", 0),
    trigger = op.outTrigger("trigger");

op.setPortGroup("Rotation", [rotX, rotY, rotZ]);
op.setPortGroup("Position", [posX, posY, posZ]);
op.setPortGroup("Scale", [scale]);
op.setUiAxisPorts(posX, posY, posZ);

op.toWorkPortsNeedToBeLinked(render, trigger);

const vPos = vec3.create();
const vScale = vec3.create();
const transMatrix = mat4.create();
mat4.identity(transMatrix);

let
    doScale = false,
    doTranslate = false,
    translationChanged = true,
    scaleChanged = true,
    rotChanged = true;

rotX.onChange = rotY.onChange = rotZ.onChange = setRotChanged;
posX.onChange = posY.onChange = posZ.onChange = setTranslateChanged;
scale.onChange = setScaleChanged;

render.onTriggered = function ()
{
    // if(!CGL.TextureEffect.checkOpNotInTextureEffect(op)) return;

    let updateMatrix = false;
    if (translationChanged)
    {
        updateTranslation();
        updateMatrix = true;
    }
    if (scaleChanged)
    {
        updateScale();
        updateMatrix = true;
    }
    if (rotChanged) updateMatrix = true;

    if (updateMatrix) doUpdateMatrix();

    const cg = op.patch.cg || op.patch.cgl;
    cg.pushModelMatrix();
    mat4.multiply(cg.mMatrix, cg.mMatrix, transMatrix);

    trigger.trigger();
    cg.popModelMatrix();

    if (CABLES.UI && CABLES.UI.showCanvasTransforms) gui.setTransform(op.id, posX.get(), posY.get(), posZ.get());

    if (op.isCurrentUiOp())
        gui.setTransformGizmo(
            {
                "posX": posX,
                "posY": posY,
                "posZ": posZ,
            });
};

op.transform3d = function ()
{
    return { "pos": [posX, posY, posZ] };
};

function doUpdateMatrix()
{
    mat4.identity(transMatrix);
    if (doTranslate)mat4.translate(transMatrix, transMatrix, vPos);

    if (rotX.get() !== 0)mat4.rotateX(transMatrix, transMatrix, rotX.get() * CGL.DEG2RAD);
    if (rotY.get() !== 0)mat4.rotateY(transMatrix, transMatrix, rotY.get() * CGL.DEG2RAD);
    if (rotZ.get() !== 0)mat4.rotateZ(transMatrix, transMatrix, rotZ.get() * CGL.DEG2RAD);

    if (doScale)mat4.scale(transMatrix, transMatrix, vScale);
    rotChanged = false;
}

function updateTranslation()
{
    doTranslate = false;
    if (posX.get() !== 0.0 || posY.get() !== 0.0 || posZ.get() !== 0.0) doTranslate = true;
    vec3.set(vPos, posX.get(), posY.get(), posZ.get());
    translationChanged = false;
}

function updateScale()
{
    // doScale=false;
    // if(scale.get()!==0.0)
    doScale = true;
    vec3.set(vScale, scale.get(), scale.get(), scale.get());
    scaleChanged = false;
}

function setTranslateChanged()
{
    translationChanged = true;
}

function setScaleChanged()
{
    scaleChanged = true;
}

function setRotChanged()
{
    rotChanged = true;
}

doUpdateMatrix();


};

Ops.Gl.Matrix.Transform.prototype = new CABLES.Op();
CABLES.OPS["650baeb1-db2d-4781-9af6-ab4e9d4277be"]={f:Ops.Gl.Matrix.Transform,objName:"Ops.Gl.Matrix.Transform"};




// **************************************************************
// 
// Ops.Math.Multiply
// 
// **************************************************************

Ops.Math.Multiply = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    number1 = op.inValueFloat("number1", 1),
    number2 = op.inValueFloat("number2", 2),
    result = op.outNumber("result");

op.setTitle("*");

number1.onChange = number2.onChange = update;
update();

function update()
{
    const n1 = number1.get();
    const n2 = number2.get();

    result.set(n1 * n2);
}


};

Ops.Math.Multiply.prototype = new CABLES.Op();
CABLES.OPS["1bbdae06-fbb2-489b-9bcc-36c9d65bd441"]={f:Ops.Math.Multiply,objName:"Ops.Math.Multiply"};




// **************************************************************
// 
// Ops.Number.Number
// 
// **************************************************************

Ops.Number.Number = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    v = op.inValueFloat("value"),
    result = op.outNumber("result");

v.onChange = exec;

function exec()
{
    result.set(Number(v.get()));
}


};

Ops.Number.Number.prototype = new CABLES.Op();
CABLES.OPS["8fb2bb5d-665a-4d0a-8079-12710ae453be"]={f:Ops.Number.Number,objName:"Ops.Number.Number"};




// **************************************************************
// 
// Ops.Math.DeltaSum
// 
// **************************************************************

Ops.Math.DeltaSum = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    inVal = op.inValue("Delta Value"),
    defVal = op.inValue("Default Value", 0),
    inMul = op.inValue("Multiply", 1),
    inReset = op.inTriggerButton("Reset"),
    inLimit = op.inValueBool("Limit", false),
    inMin = op.inValue("Min", 0),
    inMax = op.inValue("Max", 100),
    inRubber = op.inValue("Rubberband", 0),
    outVal = op.outNumber("Absolute Value");

inVal.changeAlways = true;

op.setPortGroup("Limit", [inLimit, inMin, inMax, inRubber]);

let value = 0;
let lastEvent = CABLES.now();
let rubTimeout = null;

inLimit.onChange = updateLimit;
defVal.onChange =
    inReset.onTriggered = resetValue;

inMax.onChange =
    inMin.onChange = updateValue;

updateLimit();

function resetValue()
{
    let v = defVal.get();

    if (inLimit.get())
    {
        v = Math.max(inMin.get(), v);
        v = Math.min(inMax.get(), v);
    }

    value = v;
    outVal.set(value);
}

function updateLimit()
{
    inMin.setUiAttribs({ "greyout": !inLimit.get() });
    inMax.setUiAttribs({ "greyout": !inLimit.get() });
    inRubber.setUiAttribs({ "greyout": !inLimit.get() });

    updateValue();
}

function releaseRubberband()
{
    const min = inMin.get();
    const max = inMax.get();

    if (value < min) value = min;
    if (value > max) value = max;

    outVal.set(value);
}

function updateValue()
{
    if (inLimit.get())
    {
        const min = inMin.get();
        const max = inMax.get();
        const rubber = inRubber.get();
        const minr = inMin.get() - rubber;
        const maxr = inMax.get() + rubber;

        if (value < minr) value = minr;
        if (value > maxr) value = maxr;

        if (rubber !== 0.0)
        {
            clearTimeout(rubTimeout);
            rubTimeout = setTimeout(releaseRubberband.bind(this), 300);
        }
    }

    outVal.set(value);
}

inVal.onChange = function ()
{
    let v = inVal.get();

    const rubber = inRubber.get();

    if (rubber !== 0.0)
    {
        const min = inMin.get();
        const max = inMax.get();
        const minr = inMin.get() - rubber;
        const maxr = inMax.get() + rubber;

        if (value < min)
        {
            const aa = Math.abs(value - minr) / rubber;
            v *= (aa * aa);
        }
        if (value > max)
        {
            const aa = Math.abs(maxr - value) / rubber;
            v *= (aa * aa);
        }
    }

    lastEvent = CABLES.now();
    value += v * inMul.get();
    updateValue();
};


};

Ops.Math.DeltaSum.prototype = new CABLES.Op();
CABLES.OPS["d9d4b3db-c24b-48da-b798-9e6230d861f7"]={f:Ops.Math.DeltaSum,objName:"Ops.Math.DeltaSum"};




// **************************************************************
// 
// Ops.Gl.Texture_v2
// 
// **************************************************************

Ops.Gl.Texture_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    filename = op.inUrl("File", [".jpg", ".png", ".webp", ".jpeg", ".avif"]),
    tfilter = op.inSwitch("Filter", ["nearest", "linear", "mipmap"]),
    wrap = op.inValueSelect("Wrap", ["repeat", "mirrored repeat", "clamp to edge"], "clamp to edge"),
    aniso = op.inSwitch("Anisotropic", ["0", "1", "2", "4", "8", "16"], "0"),
    dataFrmt = op.inSwitch("Data Format", ["R", "RG", "RGB", "RGBA"], "RGBA"),
    flip = op.inValueBool("Flip", false),
    unpackAlpha = op.inValueBool("Pre Multiplied Alpha", false),
    active = op.inValueBool("Active", true),
    inFreeMemory = op.inBool("Save Memory", true),
    textureOut = op.outTexture("Texture"),
    width = op.outNumber("Width"),
    height = op.outNumber("Height"),
    ratio = op.outNumber("Aspect Ratio"),
    loaded = op.outNumber("Loaded", false),
    loading = op.outNumber("Loading", false);

const cgl = op.patch.cgl;

op.toWorkPortsNeedToBeLinked(textureOut);
op.setPortGroup("Size", [width, height]);

let loadedFilename = null;
let loadingId = null;
let tex = null;
let cgl_filter = CGL.Texture.FILTER_MIPMAP;
let cgl_wrap = CGL.Texture.WRAP_REPEAT;
let cgl_aniso = 0;
let timedLoader = 0;

unpackAlpha.setUiAttribs({ "hidePort": true });
unpackAlpha.onChange =
    filename.onChange =
    dataFrmt.onChange =
    flip.onChange = reloadSoon;
aniso.onChange = tfilter.onChange = onFilterChange;
wrap.onChange = onWrapChange;

tfilter.set("mipmap");
wrap.set("repeat");

textureOut.set(CGL.Texture.getEmptyTexture(cgl));

active.onChange = function ()
{
    if (active.get())
    {
        if (loadedFilename != filename.get() || !tex) reloadSoon();
        else textureOut.set(tex);
    }
    else
    {
        textureOut.set(CGL.Texture.getEmptyTexture(cgl));
        width.set(CGL.Texture.getEmptyTexture(cgl).width);
        height.set(CGL.Texture.getEmptyTexture(cgl).height);
        if (tex)tex.delete();
        op.setUiAttrib({ "extendTitle": "" });
        tex = null;
    }
};

const setTempTexture = function ()
{
    const t = CGL.Texture.getTempTexture(cgl);
    textureOut.set(t);
};

function reloadSoon(nocache)
{
    clearTimeout(timedLoader);
    timedLoader = setTimeout(function ()
    {
        realReload(nocache);
    }, 30);
}

function getPixelFormat()
{
    if (dataFrmt.get() == "R") return CGL.Texture.PFORMATSTR_R8UB;
    if (dataFrmt.get() == "RG") return CGL.Texture.PFORMATSTR_RG8UB;
    if (dataFrmt.get() == "RGB") return CGL.Texture.PFORMATSTR_RGB8UB;
    return CGL.Texture.PFORMATSTR_RGBA8UB;
}

function realReload(nocache)
{
    if (!active.get()) return;
    // if (filename.get() === null) return;
    if (loadingId)loadingId = cgl.patch.loading.finished(loadingId);
    loadingId = cgl.patch.loading.start("textureOp", filename.get(), op);

    let url = op.patch.getFilePath(String(filename.get()));

    if (nocache)url += "?rnd=" + CABLES.uuid();

    if (String(filename.get()).indexOf("data:") == 0) url = filename.get();

    let needsRefresh = false;
    if (loadedFilename != filename.get()) needsRefresh = true;
    loadedFilename = filename.get();

    if ((filename.get() && filename.get().length > 1))
    {
        loaded.set(false);
        loading.set(true);

        const fileToLoad = filename.get();

        op.setUiAttrib({ "extendTitle": CABLES.basename(url) });
        if (needsRefresh) op.refreshParams();

        cgl.patch.loading.addAssetLoadingTask(() =>
        {
            op.setUiError("urlerror", null);
            CGL.Texture.load(cgl, url, function (err, newTex)
            {
                cgl.checkFrameStarted("texture inittexture");

                if (filename.get() != fileToLoad)
                {
                    cgl.patch.loading.finished(loadingId);
                    loadingId = null;
                    return;
                }

                if (tex)tex.delete();

                if (err)
                {
                    const t = CGL.Texture.getErrorTexture(cgl);
                    textureOut.setRef(t);

                    op.setUiError("urlerror", "could not load texture: \"" + filename.get() + "\"", 2);
                    cgl.patch.loading.finished(loadingId);
                    loadingId = null;
                    return;
                }

                // textureOut.setRef(newTex);

                width.set(newTex.width);
                height.set(newTex.height);
                ratio.set(newTex.width / newTex.height);

                // if (!newTex.isPowerOfTwo()) op.setUiError("npot", "Texture dimensions not power of two! - Texture filtering will not work in WebGL 1.", 0);
                // else op.setUiError("npot", null);

                tex = newTex;
                // textureOut.set(null);
                textureOut.setRef(tex);

                loading.set(false);
                loaded.set(true);

                if (inFreeMemory.get()) tex.image = null;

                if (loadingId)
                {
                    cgl.patch.loading.finished(loadingId);
                    loadingId = null;
                }
                // testTexture();
            }, {
                "anisotropic": cgl_aniso,
                "wrap": cgl_wrap,
                "flip": flip.get(),
                "unpackAlpha": unpackAlpha.get(),
                "pixelFormat": getPixelFormat(),
                "filter": cgl_filter
            });

            // textureOut.set(null);
            // textureOut.set(tex);
        });
    }
    else
    {
        cgl.patch.loading.finished(loadingId);
        loadingId = null;
        setTempTexture();
    }
}

function onFilterChange()
{
    if (tfilter.get() == "nearest") cgl_filter = CGL.Texture.FILTER_NEAREST;
    else if (tfilter.get() == "linear") cgl_filter = CGL.Texture.FILTER_LINEAR;
    else if (tfilter.get() == "mipmap") cgl_filter = CGL.Texture.FILTER_MIPMAP;
    else if (tfilter.get() == "Anisotropic") cgl_filter = CGL.Texture.FILTER_ANISOTROPIC;

    aniso.setUiAttribs({ "greyout": cgl_filter != CGL.Texture.FILTER_MIPMAP });

    cgl_aniso = parseFloat(aniso.get());

    reloadSoon();
}

function onWrapChange()
{
    if (wrap.get() == "repeat") cgl_wrap = CGL.Texture.WRAP_REPEAT;
    if (wrap.get() == "mirrored repeat") cgl_wrap = CGL.Texture.WRAP_MIRRORED_REPEAT;
    if (wrap.get() == "clamp to edge") cgl_wrap = CGL.Texture.WRAP_CLAMP_TO_EDGE;

    reloadSoon();
}

op.onFileChanged = function (fn)
{
    if (filename.get() && filename.get().indexOf(fn) > -1)
    {
        textureOut.set(CGL.Texture.getEmptyTexture(op.patch.cgl));
        textureOut.set(CGL.Texture.getTempTexture(cgl));
        realReload(true);
    }
};

// function testTexture()
// {
//     cgl.setTexture(0, tex.tex);

//     const filter = cgl.gl.getTexParameter(cgl.gl.TEXTURE_2D, cgl.gl.TEXTURE_MIN_FILTER);
//     const wrap = cgl.gl.getTexParameter(cgl.gl.TEXTURE_2D, cgl.gl.TEXTURE_WRAP_S);

//     if (cgl_filter === CGL.Texture.FILTER_MIPMAP && filter != cgl.gl.LINEAR_MIPMAP_LINEAR) console.log("wrong texture filter!", filename.get());
//     if (cgl_filter === CGL.Texture.FILTER_NEAREST && filter != cgl.gl.NEAREST) console.log("wrong texture filter!", filename.get());
//     if (cgl_filter === CGL.Texture.FILTER_LINEAR && filter != cgl.gl.LINEAR) console.log("wrong texture filter!", filename.get());

//     if (cgl_wrap === CGL.Texture.WRAP_REPEAT && wrap != cgl.gl.REPEAT) console.log("wrong texture wrap1!", filename.get());
//     if (cgl_wrap === CGL.Texture.WRAP_MIRRORED_REPEAT && wrap != cgl.gl.MIRRORED_REPEAT) console.log("wrong texture wrap2!", filename.get());
//     if (cgl_wrap === CGL.Texture.WRAP_CLAMP_TO_EDGE && wrap != cgl.gl.CLAMP_TO_EDGE) console.log("wrong texture wrap3!", filename.get());
// }


};

Ops.Gl.Texture_v2.prototype = new CABLES.Op();
CABLES.OPS["790f3702-9833-464e-8e37-6f0f813f7e16"]={f:Ops.Gl.Texture_v2,objName:"Ops.Gl.Texture_v2"};




// **************************************************************
// 
// Ops.Devices.Mouse.Mouse_v3
// 
// **************************************************************

Ops.Devices.Mouse.Mouse_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    inCoords = op.inSwitch("Coordinates", ["-1 to 1", "Pixel Display", "Pixel", "0 to 1"], "-1 to 1"),
    area = op.inValueSelect("Area", ["Canvas", "Document", "Parent Element", "Canvas Area"], "Canvas"),
    flipY = op.inValueBool("flip y", true),
    rightClickPrevDef = op.inBool("right click prevent default", true),
    touchscreen = op.inValueBool("Touch support", true),
    active = op.inValueBool("Active", true),
    outMouseX = op.outNumber("x", 0),
    outMouseY = op.outNumber("y", 0),
    mouseClick = op.outTrigger("click"),
    mouseClickRight = op.outTrigger("click right"),
    mouseDown = op.outBoolNum("Button is down"),
    mouseOver = op.outBoolNum("Mouse is hovering");

const cgl = op.patch.cgl;
let normalize = 1;
let listenerElement = null;
let sizeElement = null;
area.onChange = addListeners;

inCoords.onChange = updateCoordNormalizing;
op.onDelete = removeListeners;

addListeners();

op.on("loadedValueSet",
    () =>
    {
        if (normalize == 0)
        {
            outMouseX.set(sizeElement.clientWidth / 2);
            outMouseY.set(sizeElement.clientHeight / 2);
        }
        if (normalize == 1)
        {
            outMouseX.set(0);
            outMouseY.set(0);
        }
        if (normalize == 2)
        {
            outMouseX.set(0.5);
            outMouseY.set(0.5);
        }
    });

function setValue(x, y)
{
    x = x || 0;
    y = y || 0;

    if (normalize == 0) // pixel
    {
        outMouseX.set(x);
        outMouseY.set(y);
    }
    else
    if (normalize == 3) // pixel css
    {
        outMouseX.set(x * cgl.pixelDensity);
        outMouseY.set(y * cgl.pixelDensity);
    }
    else
    {
        let w = sizeElement.clientWidth / cgl.pixelDensity;
        let h = sizeElement.clientHeight / cgl.pixelDensity;

        w = w || 1;
        h = h || 1;

        if (normalize == 1) // -1 to 1
        {
            let xx = (x / w * 2.0 - 1.0);
            let yy = (y / h * 2.0 - 1.0);
            xx = CABLES.clamp(xx, -1, 1);
            yy = CABLES.clamp(yy, -1, 1);

            outMouseX.set(xx);
            outMouseY.set(yy);
        }
        else if (normalize == 2) // 0 to 1
        {
            let xx = x / w;
            let yy = y / h;

            xx = CABLES.clamp(xx, 0, 1);
            yy = CABLES.clamp(yy, 0, 1);

            outMouseX.set(xx);
            outMouseY.set(yy);
        }
    }
}

function checkHovering(e)
{
    const r = sizeElement.getBoundingClientRect();

    return (
        e.clientX > r.left &&
        e.clientX < r.left + r.width &&
        e.clientY > r.top &&
        e.clientY < r.top + r.height
    );
}

touchscreen.onChange = function ()
{
    removeListeners();
    addListeners();
};

active.onChange = function ()
{
    if (listenerElement)removeListeners();
    if (active.get())addListeners();
};

function updateCoordNormalizing()
{
    if (inCoords.get() == "Pixel")normalize = 0;
    else if (inCoords.get() == "-1 to 1")normalize = 1;
    else if (inCoords.get() == "0 to 1")normalize = 2;
    else if (inCoords.get() == "Pixel Display")normalize = 3;
}

function onMouseEnter(e)
{
    mouseDown.set(false);
    mouseOver.set(checkHovering(e));
}

function onMouseDown(e)
{
    if (!checkHovering(e)) return;
    mouseDown.set(true);
}

function onMouseUp(e)
{
    mouseDown.set(false);
}

function onClickRight(e)
{
    if (!checkHovering(e)) return;
    mouseClickRight.trigger();
    if (rightClickPrevDef.get()) e.preventDefault();
}

function onmouseclick(e)
{
    if (!checkHovering(e)) return;
    mouseClick.trigger();
}

function onMouseLeave(e)
{
    mouseDown.set(false);
    mouseOver.set(checkHovering(e));
}

function setCoords(e)
{
    let x = e.clientX;
    let y = e.clientY;

    if (area.get() != "Document")
    {
        x = e.offsetX;
        y = e.offsetY;
    }
    if (area.get() === "Canvas Area")
    {
        const r = sizeElement.getBoundingClientRect();
        x = e.clientX - r.left;
        y = e.clientY - r.top;
    }

    if (flipY.get()) y = sizeElement.clientHeight - y;

    setValue(x / cgl.pixelDensity, y / cgl.pixelDensity);
}

function onmousemove(e)
{
    mouseOver.set(checkHovering(e));
    setCoords(e);
}

function ontouchmove(e)
{
    if (event.touches && event.touches.length > 0) setCoords(e.touches[0]);
}

function ontouchstart(event)
{
    mouseDown.set(true);

    if (event.touches && event.touches.length > 0) onMouseDown(event.touches[0]);
}

function ontouchend(event)
{
    mouseDown.set(false);
    onMouseUp();
}

function removeListeners()
{
    if (!listenerElement) return;
    listenerElement.removeEventListener("touchend", ontouchend);
    listenerElement.removeEventListener("touchstart", ontouchstart);
    listenerElement.removeEventListener("touchmove", ontouchmove);

    listenerElement.removeEventListener("click", onmouseclick);
    listenerElement.removeEventListener("mousemove", onmousemove);
    listenerElement.removeEventListener("mouseleave", onMouseLeave);
    listenerElement.removeEventListener("mousedown", onMouseDown);
    listenerElement.removeEventListener("mouseup", onMouseUp);
    listenerElement.removeEventListener("mouseenter", onMouseEnter);
    listenerElement.removeEventListener("contextmenu", onClickRight);
    listenerElement = null;
}

function addListeners()
{
    if (listenerElement || !active.get())removeListeners();
    if (!active.get()) return;

    listenerElement = sizeElement = cgl.canvas;
    if (area.get() == "Canvas Area")
    {
        sizeElement = cgl.canvas.parentElement;
        listenerElement = document.body;
    }
    if (area.get() == "Document") sizeElement = listenerElement = document.body;
    if (area.get() == "Parent Element") listenerElement = sizeElement = cgl.canvas.parentElement;

    if (touchscreen.get())
    {
        listenerElement.addEventListener("touchend", ontouchend);
        listenerElement.addEventListener("touchstart", ontouchstart);
        listenerElement.addEventListener("touchmove", ontouchmove);
    }

    listenerElement.addEventListener("mousemove", onmousemove);
    listenerElement.addEventListener("mouseleave", onMouseLeave);
    listenerElement.addEventListener("mousedown", onMouseDown);
    listenerElement.addEventListener("mouseup", onMouseUp);
    listenerElement.addEventListener("mouseenter", onMouseEnter);
    listenerElement.addEventListener("contextmenu", onClickRight);
    listenerElement.addEventListener("click", onmouseclick);
}


};

Ops.Devices.Mouse.Mouse_v3.prototype = new CABLES.Op();
CABLES.OPS["6d1edbc0-088a-43d7-9156-918fb3d7f24b"]={f:Ops.Devices.Mouse.Mouse_v3,objName:"Ops.Devices.Mouse.Mouse_v3"};




// **************************************************************
// 
// Ops.Graphics.Intersection.IntersectWorld
// 
// **************************************************************

Ops.Graphics.Intersection.IntersectWorld = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    trigger = op.inTrigger("Trigger"),
    render = op.inBool("Render", true),
    inTextCol = op.inBool("Check Body Collisions", true),
    next = op.outTrigger("Next"),
    outNum = op.outNumber("Total Bodies"),
    outCollisions = op.outArray("Collisions", []);

trigger.onTriggered = doRender;

const cgl = op.patch.cgl;

function doRender()
{
    cgl.frameStore.collisionWorld = { "bodies": [] };
    next.trigger();

    outNum.set(cgl.frameStore.collisionWorld.bodies.length);

    if (inTextCol.get()) checkCollisions();

    if (render.get())renderBodies();
}

function renderBodies()
{
    if (!CABLES.UI) return;
    const collisions = [];
    const bodies = cgl.frameStore.collisionWorld.bodies;

    for (let i = 0; i < bodies.length; i++)
    {
        const body = bodies[i];

        if (body.type === 1)
        {
            cgl.pushModelMatrix();
            mat4.translate(cgl.mMatrix, cgl.mMatrix, body.pos);
            CABLES.GL_MARKER.drawSphere(op, body.radius);
            cgl.popModelMatrix();
        }
        else if (body.type === 2)
        {
            cgl.pushModelMatrix();
            mat4.translate(cgl.mMatrix, cgl.mMatrix, body.pos);
            CABLES.GL_MARKER.drawCube(op, body.size[0] / 2, body.size[1] / 2, body.size[2] / 2);
            cgl.popModelMatrix();
        }
        else console.warn("[intersectWorld] unknown col shape");
    }
}

function checkCollisions()
{
    const collisions = [];
    const bodies = cgl.frameStore.collisionWorld.bodies;

    for (let j = 0; j < bodies.length; j++)
    {
        for (let i = j + 1; i < bodies.length; i++)
        {
            if (i != j)
            {
                const bodyA = bodies[i];
                const bodyB = bodies[j];

                /// //////////
                // SPHERE vs SPHERE
                if (bodyA.type == 1 && bodyB.type == 1)
                {
                    const dist = vec3.distance(bodyA.pos, bodyB.pos);

                    if (dist < bodyA.radius + bodyB.radius)
                    {
                        collisions.push({
                            "body0": bodyA,
                            "name0": bodyA.name,
                            "body1": bodyB,
                            "name1": bodyB.name
                        });
                    }
                }
                else
                if ((bodyA.type == 1 && bodyB.type == 2) || (bodyA.type == 2 && bodyB.type == 1))
                {
                    let bBox = bodyA;
                    let bSphere = bodyB;
                    if (bodyB.type == 2)
                    {
                        bBox = bodyB;
                        bSphere = bodyA;
                    }

                    let r2 = bSphere.radius * bSphere.radius;
                    let dmin = 0;

                    let dist_squared = bSphere.radius * bSphere.radius;
                    /* assume bBox.minand C2 are element-wise sorted, if not, do that now */
                    if (bSphere.pos[0] < bBox.minX) dist_squared -= Math.pow(bSphere.pos[0] - bBox.minX, 2);
                    else if (bSphere.pos[0] > bBox.maxX) dist_squared -= Math.pow(bSphere.pos[0] - bBox.maxX, 2);
                    if (bSphere.pos[1] < bBox.minY) dist_squared -= Math.pow(bSphere.pos[1] - bBox.minY, 2);
                    else if (bSphere.pos[1] > bBox.maxY) dist_squared -= Math.pow(bSphere.pos[1] - bBox.maxY, 2);
                    if (bSphere.pos[2] < bBox.minZ) dist_squared -= Math.pow(bSphere.pos[2] - bBox.minZ, 2);
                    else if (bSphere.pos[2] > bBox.maxZ) dist_squared -= Math.pow(bSphere.pos[2] - bBox.maxZ, 2);

                    if (dist_squared > 0)
                    {
                        collisions.push(
                            {
                                "body0": bodyA,
                                "name0": bodyA.name,
                                "body1": bodyB,
                                "name1": bodyB.name
                            });
                    }
                }
                else
                {
                    console.warn("unknown collision pair...");
                }
            }
        }
    }
    outCollisions.setRef(collisions, []);
}


};

Ops.Graphics.Intersection.IntersectWorld.prototype = new CABLES.Op();
CABLES.OPS["6ebdec23-6e10-48c9-87cf-43d488e4290f"]={f:Ops.Graphics.Intersection.IntersectWorld,objName:"Ops.Graphics.Intersection.IntersectWorld"};




// **************************************************************
// 
// Ops.Graphics.Intersection.IntersectRaycast
// 
// **************************************************************

Ops.Graphics.Intersection.IntersectRaycast = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    trigger = op.inTrigger("Trigger"),
    inCoords = op.inSwitch("Coordinate Format", ["-1 to 1"], "-1 to 1"),
    inX = op.inValueFloat("X"),
    inY = op.inValueFloat("Y"),
    active = op.inBool("Active", true),
    inCursor = op.inBool("Change Cursor", true),
    next = op.outTrigger("Next"),
    outHasHit = op.outBoolNum("Has Hit", false),
    outName = op.outString("Hit Body Name", ""),
    outX = op.outNumber("Hit X"),
    outY = op.outNumber("Hit Y"),
    outZ = op.outNumber("Hit Z");

const cgl = op.patch.cgl;
const oc = vec3.create();
const mat = mat4.create();
const dir = vec3.create();
let didsetCursor = false;
let isScreenCoords = true;

op.toWorkPortsNeedToBeLinked(trigger);

trigger.onTriggered = doRender;

function doRender()
{
    next.trigger();

    if (cgl.frameStore.collisionWorld)
    {
        const x = inX.get();
        const y = inY.get();

        const origin = vec3.fromValues(x, y, -1);
        mat4.mul(mat, cgl.pMatrix, cgl.vMatrix);
        mat4.invert(mat, mat);

        vec3.transformMat4(origin, origin, mat);

        // -----------

        const to = vec3.fromValues(x, y, 1);
        mat4.mul(mat, cgl.pMatrix, cgl.vMatrix);
        mat4.invert(mat, mat);

        vec3.transformMat4(to, to, mat);

        vec3.sub(dir, to, origin);
        vec3.normalize(dir, dir);
        const a = vec3.dot(dir, dir);

        let found = false;
        const bodies = cgl.frameStore.collisionWorld.bodies;
        for (let i = 0; i < bodies.length; i++)
        {
            if (found) break;

            const body = bodies[i];
            if (body.type == 1) // sphere
            {
                vec3.sub(oc, origin, body.pos);
                const b = 2 * vec3.dot(oc, dir);
                const c = vec3.dot(oc, oc) - (body.radius * body.radius);
                const discriminant = b * b - 4 * a * c;

                if (discriminant > 0)
                {
                    found = true;
                    outName.set(body.name);
                    outHasHit.set(true);

                    const dist = (-b - Math.sqrt(discriminant)) / (2 + a);

                    vec3.mul(oc, dir, [dist, dist, dist]);
                    vec3.add(oc, oc, origin);

                    outX.set(oc[0]);
                    outY.set(oc[1]);
                    outZ.set(oc[2]);
                }
            }
            else if (body.type == 2) // aabb
            {
                const t1 = (body.minX - origin[0]) / dir[0];
                const t2 = (body.maxX - origin[0]) / dir[0];

                const t3 = (body.minY - origin[1]) / dir[1];
                const t4 = (body.maxY - origin[1]) / dir[1];

                const t5 = (body.minZ - origin[2]) / dir[2];
                const t6 = (body.maxZ - origin[2]) / dir[2];

                const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
                const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

                // // if tmax < 0, ray (line) is intersecting AABB, but whole AABB is behing us
                if (tmax < 0) continue;

                // if tmin > tmax, ray doesn't intersect AABB
                if (tmin > tmax) continue;

                found = true;
                outName.set(body.name);
                outHasHit.set(true);

                vec3.mul(oc, dir, [tmin, tmin, tmin]);
                vec3.add(oc, oc, origin);

                outX.set(oc[0]);
                outY.set(oc[1]);
                outZ.set(oc[2]);
            }
        }

        if (!found)
        {
            outName.set("");
            outHasHit.set(false);
            outX.set(0);
            outY.set(0);
            outZ.set(0);
        }
    }
}


};

Ops.Graphics.Intersection.IntersectRaycast.prototype = new CABLES.Op();
CABLES.OPS["dd5d9b39-75c2-40b1-98a4-7a0fdafdb5cb"]={f:Ops.Graphics.Intersection.IntersectRaycast,objName:"Ops.Graphics.Intersection.IntersectRaycast"};




// **************************************************************
// 
// Ops.Gl.Matrix.Translate
// 
// **************************************************************

Ops.Gl.Matrix.Translate = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    trigger = op.outTrigger("trigger"),
    x = op.inValue("x"),
    y = op.inValue("y"),
    z = op.inValue("z");

const vec = vec3.create();

render.onTriggered = function ()
{
    const cgl = op.patch.cg;

    vec3.set(vec, x.get(), y.get(), z.get());
    cgl.pushModelMatrix();
    mat4.translate(cgl.mMatrix, cgl.mMatrix, vec);
    trigger.trigger();
    cgl.popModelMatrix();
};


};

Ops.Gl.Matrix.Translate.prototype = new CABLES.Op();
CABLES.OPS["1f89ba0e-e7eb-46d7-8c66-7814b7c528b9"]={f:Ops.Gl.Matrix.Translate,objName:"Ops.Gl.Matrix.Translate"};




// **************************************************************
// 
// Ops.Graphics.Intersection.IntersectBody
// 
// **************************************************************

Ops.Graphics.Intersection.IntersectBody = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    shapes = ["Sphere", "BoxAA"],
    trigger = op.inTrigger("Trigger"),
    inArea = op.inSwitch("Shape", shapes, "Sphere"),
    inName = op.inString("Name", ""),
    inRadius = op.inFloat("Radius", 0.5),
    inSizeX = op.inFloat("Size X", 1),
    inSizeY = op.inFloat("Size Y", 1),
    inSizeZ = op.inFloat("Size Z", 1),
    inPositions = op.inArray("Positions", null, 3),
    inPosIndex = op.inBool("Append Index to name", true),
    next = op.outTrigger("Next");

op.setPortGroup("Array", [inPositions, inPosIndex]);

const cgl = op.patch.cgl;
const pos = vec3.create();
// const scale = vec3.create();
const empty = vec3.create();
updateUi();

let objs = [];
let obj =
{
    "name": "???",
    "type": 1,
};

trigger.onTriggered = render;

inArea.onChange = () =>
{
    obj.type = shapes.indexOf(inArea.get()) + 1;
    updateUi();
};

function updateUi()
{
    inRadius.setUiAttribs({ "greyout": inArea.get() != "Sphere" });
    inSizeX.setUiAttribs({ "greyout": inArea.get() != "BoxAA" });
    inSizeY.setUiAttribs({ "greyout": inArea.get() != "BoxAA" });
    inSizeZ.setUiAttribs({ "greyout": inArea.get() != "BoxAA" });
}

function setBox(o)
{
    o.minX = o.pos[0] - o.size[0] / 2;
    o.maxX = o.pos[0] + o.size[0] / 2;

    o.minY = o.pos[1] - o.size[1] / 2;
    o.maxY = o.pos[1] + o.size[1] / 2;

    o.minZ = o.pos[2] - o.size[2] / 2;
    o.maxZ = o.pos[2] + o.size[2] / 2;
}

function render()
{
    const cg = op.patch.cgl;

    // vec3.transformMat4(pos, empty, cg.mMatrix);
    // mat4.getScaling(scale, cg.mMatrix);

    const posArr = inPositions.get();
    const radius = inRadius.get();

    if (posArr && posArr.length > 0 && posArr.length % 3 == 0)
    {
        objs.length = posArr.length / 3;
        for (let i = 0; i < posArr.length; i += 3)
        {
            const o = objs[i / 3] || {};
            if (inPosIndex.get()) o.name = inName.get() + "." + i / 3;
            else o.name = inName.get();

            o.pos = [posArr[i + 0], posArr[i + 1], posArr[i + 2]];
            vec3.transformMat4(o.pos, o.pos, cg.mMatrix);

            // vec3.mul(o.pos, o.pos, scale);
            o.type = obj.type;
            o.size = [inSizeX.get(), inSizeY.get(), inSizeZ.get()];

            if (o.type == 2)setBox(o);
            if (o.type == 1)o.radius = radius;

            cgl.frameStore.collisionWorld.bodies.push(o);
        }
    }
    else
    {
        cgl.frameStore.collisionWorld.bodies.push(obj);
        obj.name = inName.get();
        obj.pos = [0, 0, 0];

        vec3.transformMat4(obj.pos, obj.pos, cg.mMatrix);

        obj.size = [inSizeX.get(), inSizeY.get(), inSizeZ.get()];

        if (obj.type == 2)setBox(obj);
        if (obj.type == 1)obj.radius = radius;
    }

    next.trigger();
}


};

Ops.Graphics.Intersection.IntersectBody.prototype = new CABLES.Op();
CABLES.OPS["b2e39096-8a02-4a50-b2f5-3e68f2c16ad7"]={f:Ops.Graphics.Intersection.IntersectBody,objName:"Ops.Graphics.Intersection.IntersectBody"};




// **************************************************************
// 
// Ops.Trigger.RouteTrigger
// 
// **************************************************************

Ops.Trigger.RouteTrigger = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const NUM_PORTS = 24;

const exePort = op.inTriggerButton("Execute");
const switchPort = op.inValueInt("Switch Value");
const nextTriggerPort = op.outTrigger("Next Trigger");
const valueOutPort = op.outNumber("Switched Value");
const triggerPorts = [];
for (let j = 0; j < NUM_PORTS; j++)
{
    triggerPorts[j] = op.outTrigger("Trigger " + j);
}
const defaultTriggerPort = op.outTrigger("Default Trigger");

// functions

function update()
{
    const index = Math.round(switchPort.get());
    if (index >= 0 && index < NUM_PORTS)
    {
        valueOutPort.set(index);
        triggerPorts[index].trigger();
    }
    else
    {
        valueOutPort.set(-1);
        defaultTriggerPort.trigger();
    }
    nextTriggerPort.trigger();
}

// change listeners / trigger events
exePort.onTriggered = update;


};

Ops.Trigger.RouteTrigger.prototype = new CABLES.Op();
CABLES.OPS["44ceb5d8-b040-4722-b189-a6fb8172517d"]={f:Ops.Trigger.RouteTrigger,objName:"Ops.Trigger.RouteTrigger"};




// **************************************************************
// 
// Ops.String.NumberSwitchByString
// 
// **************************************************************

Ops.String.NumberSwitchByString = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const inStr = op.inString("String", "default");
const outNum = op.outNumber("Result", 0);
const numberStrings = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

const strings = [];
const numbers = [];

inStr.onChange = update;

for (let i = 0; i < numberStrings.length; i++)
{
    const idx = i + 1;
    const istr = op.inString("String " + idx, numberStrings[i]);
    const inum = op.inFloat("Number " + idx, idx);

    strings.push(istr);
    numbers.push(inum);
}

function update()
{
    const s = inStr.get();

    for (let i = 0; i < numberStrings.length; i++)
    {
        if (strings[i].get() == s)outNum.set(numbers[i].get());
    }
}


};

Ops.String.NumberSwitchByString.prototype = new CABLES.Op();
CABLES.OPS["bb3f53ab-c4ad-4c07-81df-d9ca7ee976f2"]={f:Ops.String.NumberSwitchByString,objName:"Ops.String.NumberSwitchByString"};




// **************************************************************
// 
// Ops.String.GateString
// 
// **************************************************************

Ops.String.GateString = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    valueInPort = op.inString('String In', 'hello'),
    passThroughPort = op.inValueBool('Pass Through',false),
    valueOutPort = op.outString('String Out','');

valueInPort.onChange =
passThroughPort.onChange = update;

function update()
{
    if(passThroughPort.get())
    {
        valueOutPort.set(null);
        valueOutPort.set(valueInPort.get());
    }
        // else
        // valueOutPort.set('');
}

};

Ops.String.GateString.prototype = new CABLES.Op();
CABLES.OPS["0ce14933-2d91-4381-9d82-2304aae22c0e"]={f:Ops.String.GateString,objName:"Ops.String.GateString"};




// **************************************************************
// 
// Ops.Gl.Meshes.RectangleRounded_v2
// 
// **************************************************************

Ops.Gl.Meshes.RectangleRounded_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const render = op.inTrigger("render");
const inSegments = op.inValueInt("Segments", 24);
const trigger = op.outTrigger("trigger");
const sizeW = op.inValueFloat("width", 1);
const sizeH = op.inValueFloat("height", 1);
const borderRadius = op.inValueSlider("border radius", 0.5);

const geom = new CGL.Geometry("triangle");
const geomOut = op.outObject("geometry");

geomOut.ignoreValueSerialize = true;

op.toWorkPortsNeedToBeLinked(render);
op.setPortGroup("Size", [sizeW, sizeH, borderRadius, inSegments]);

const inTopLeftCorner = op.inValueBool("Top Left", true);
const inTopRightCorner = op.inValueBool("Top Right", true);
const inBottomLeftCorner = op.inValueBool("Bottom Left", true);
const inBottomRightCorner = op.inValueBool("Bottom Right", true);
const CORNER_PORTS = [inTopLeftCorner, inTopRightCorner, inBottomLeftCorner, inBottomRightCorner];
CORNER_PORTS.forEach((port) =>
{
    port.onChange = create;
});

op.setPortGroup("Round Corner", CORNER_PORTS);

const draw = op.inValueBool("Draw", true);
op.setPortGroup("Draw", [draw]);

const cgl = op.patch.cgl;
let mesh = null;
sizeW.onChange = create;
sizeH.onChange = create;
borderRadius.onChange = create;
inSegments.onChange = create;

create();

render.onTriggered = function ()
{
    if (draw.get()) mesh.render(cgl.getShader());
    trigger.trigger();
};

function create()
{
    const w = Math.abs(sizeW.get());
    const h = Math.abs(sizeH.get());

    const r = w < h ? (borderRadius.get() * w) / 2 : (borderRadius.get() * h) / 2;

    const wi = w - 2 * r;
    const hi = h - 2 * r;
    const wiHalf = wi / 2;
    const hiHalf = hi / 2;

    const segments = Math.abs(inSegments.get() || 1);

    const topLeftCircleMiddle = [-1 * wiHalf, hiHalf, 0];
    const bottomLeftCircleMiddle = [-1 * wiHalf, -1 * hiHalf, 0];
    const topRightCircleMiddle = [wiHalf, hiHalf, 0];
    const bottomRightCircleMiddle = [wiHalf, -1 * hiHalf, 0];

    const circleVerts = [];
    let lastX = 0;
    let lastY = 0;

    // top left circle
    if (inTopLeftCorner.get())
    {
        for (let i = 0; i <= segments; i += 1)
        {
            const x = topLeftCircleMiddle[0] + (0 - r * Math.cos((i * Math.PI) / 2 / segments));
            const y = topLeftCircleMiddle[1] + r * Math.sin((i * Math.PI) / 2 / segments);

            circleVerts.push(x, y, 0);

            if (i > 1)
            {
                circleVerts.push(lastX, lastY, 0);
            }

            if (i <= segments - 1) circleVerts.push(...topLeftCircleMiddle);

            lastX = x;
            lastY = y;
        }
    }
    else
    {
        circleVerts.push(...topLeftCircleMiddle);
        circleVerts.push(-wiHalf, hiHalf + r, 0);
        circleVerts.push(-wiHalf - r, hiHalf + r, 0);

        circleVerts.push(...topLeftCircleMiddle);
        circleVerts.push(-wiHalf - r, hiHalf + r, 0);
        circleVerts.push(-wiHalf - r, hiHalf, 0);
    }

    if (inTopRightCorner.get())
    {
    // top right circle
        for (let i = 0; i <= segments; i += 1)
        {
            const x = topRightCircleMiddle[0] + r * Math.cos((i * Math.PI) / 2 / segments);
            const y = topRightCircleMiddle[1] + r * Math.sin((i * Math.PI) / 2 / segments);

            if (i > 1)
            {
                circleVerts.push(...topRightCircleMiddle, lastX, lastY, 0);
            }

            circleVerts.push(x, y, 0);

            if (i === segments - 1) circleVerts.push(...topRightCircleMiddle);

            lastX = x;
            lastY = y;
        }
    }
    else
    {
        circleVerts.push(...topRightCircleMiddle);
        circleVerts.push(wiHalf + r, hiHalf, 0);
        circleVerts.push(wiHalf + r, hiHalf + r, 0);

        circleVerts.push(...topRightCircleMiddle);
        circleVerts.push(wiHalf + r, hiHalf + r, 0);
        circleVerts.push(wiHalf, hiHalf + r, 0);
    }

    if (inBottomRightCorner.get())
    {
    // bottom right circle
        for (let i = 0; i <= segments; i += 1)
        {
            const x = bottomRightCircleMiddle[0] + r * Math.cos((i * Math.PI) / 2 / segments);
            const y = bottomRightCircleMiddle[1] + r * -1 * Math.sin((i * Math.PI) / 2 / segments);

            circleVerts.push(x, y, 0);

            if (i > 1)
            {
                circleVerts.push(lastX, lastY, 0);
            }

            if (i <= segments - 1) circleVerts.push(...bottomRightCircleMiddle);

            lastX = x;
            lastY = y;
        }
    }
    else
    {
        circleVerts.push(...bottomRightCircleMiddle);
        circleVerts.push(wiHalf + r, -hiHalf - r, 0);
        circleVerts.push(wiHalf + r, -hiHalf, 0);

        circleVerts.push(...bottomRightCircleMiddle);
        circleVerts.push(wiHalf, -hiHalf - r, 0);
        circleVerts.push(wiHalf + r, -hiHalf - r, 0);
    }

    if (inBottomLeftCorner.get())
    {
    // bottom left circle
        for (let i = 0; i <= segments; i += 1)
        {
            const x = bottomLeftCircleMiddle[0] + r * -1 * Math.cos((i * Math.PI) / 2 / segments);
            const y = bottomLeftCircleMiddle[1] + r * -1 * Math.sin((i * Math.PI) / 2 / segments);

            if (i > 1)
            {
                circleVerts.push(lastX, lastY, 0);
            }

            circleVerts.push(x, y, 0);

            if (i <= segments - 1) circleVerts.push(...bottomLeftCircleMiddle);

            lastX = x;
            lastY = y;
        }
    }
    else
    {
        circleVerts.push(...bottomLeftCircleMiddle);
        circleVerts.push(-wiHalf - r, -hiHalf - r, 0);
        circleVerts.push(-wiHalf, -hiHalf - r, 0);

        circleVerts.push(...bottomLeftCircleMiddle);
        circleVerts.push(-wiHalf - r, -hiHalf, 0);
        circleVerts.push(-wiHalf - r, -hiHalf - r, 0);
    }

    geom.vertices = [
        // inner rectangle

        -1 * wiHalf, -hiHalf, 0,
        wiHalf, hiHalf, 0,
        -1 * wiHalf, hiHalf, 0,

        -1 * wiHalf, -1 * hiHalf, 0,
        wiHalf, -1 * hiHalf, 0,
        wiHalf, hiHalf, 0,

        // left rectangle

        -1 * wiHalf - r, -1 * hiHalf, 0,
        -1 * wiHalf, -1 * hiHalf, 0,
        -1 * wiHalf - r, hiHalf, 0,

        -1 * wiHalf - r, hiHalf, 0,
        -1 * wiHalf, -1 * hiHalf, 0,
        -1 * wiHalf, hiHalf, 0,

        // top rectangle

        -1 * wiHalf, hiHalf, 0,
        wiHalf, hiHalf + r, 0,
        -1 * wiHalf, hiHalf + r, 0,

        wiHalf, hiHalf + r, 0,
        -1 * wiHalf, hiHalf, 0,
        wiHalf, hiHalf, 0,

        // bottom rectangle
        -1 * wiHalf, -1 * hiHalf, 0,
        -1 * wiHalf, -1 * hiHalf - r, 0,
        wiHalf, -1 * hiHalf - r, 0,

        wiHalf, -1 * hiHalf, 0,
        -1 * wiHalf, -1 * hiHalf, 0,
        wiHalf, -1 * hiHalf - r, 0,

        // right rectangle

        wiHalf + r, hiHalf, 0,
        wiHalf, hiHalf, 0,
        wiHalf + r, -1 * hiHalf, 0,

        wiHalf + r, -1 * hiHalf, 0,
        wiHalf, hiHalf, 0,
        wiHalf, -1 * hiHalf, 0,
        ...circleVerts
    ];

    geom.texCoords = [];
    const wAbs = Math.abs(w);
    const hAbs = Math.abs(h);

    for (let i = 0; i < geom.vertices.length; i += 3)
    {
        geom.texCoords[(i / 3) * 2 + 0] = Math.abs(geom.vertices[i + 0] / -wAbs - 0.5);
        geom.texCoords[(i / 3) * 2 + 1] = Math.abs(geom.vertices[i + 1] / hAbs - 0.5);
    }

    geom.vertexNormals = geom.vertices.map((vert, i) => { return (i % 3 === 2 ? 1.0 : 0.0); });
    geom.tangents = geom.vertices.map((vert, i) => { return (i % 3 === 0 ? -1.0 : 0.0); });
    geom.biTangents = geom.vertices.map((vert, i) => { return (i % 3 === 1 ? -1.0 : 0.0); });

    if (geom.vertices.length == 0) return;
    if (mesh) mesh.dispose();
    mesh = null;
    mesh = new CGL.Mesh(cgl, geom);
    geomOut.set(null);
    geomOut.set(geom);
}


};

Ops.Gl.Meshes.RectangleRounded_v2.prototype = new CABLES.Op();
CABLES.OPS["86c99074-4929-44d0-a826-49e7f8bdf5c4"]={f:Ops.Gl.Meshes.RectangleRounded_v2,objName:"Ops.Gl.Meshes.RectangleRounded_v2"};




// **************************************************************
// 
// Ops.Gl.Meshes.TextMesh_v2
// 
// **************************************************************

Ops.Gl.Meshes.TextMesh_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"textmesh_frag":"UNI sampler2D tex;\n#ifdef DO_MULTEX\n    UNI sampler2D texMul;\n#endif\n#ifdef DO_MULTEX_MASK\n    UNI sampler2D texMulMask;\n#endif\nIN vec2 texCoord;\nIN vec2 texPos;\nUNI float r;\nUNI float g;\nUNI float b;\nUNI float a;\n\nvoid main()\n{\n    vec4 col=texture(tex,texCoord);\n    col.a=col.r;\n    col.r*=r;\n    col.g*=g;\n    col.b*=b;\n    col*=a;\n\n    if(col.a==0.0)discard;\n\n    #ifdef DO_MULTEX\n        col*=texture(texMul,texPos);\n    #endif\n\n    #ifdef DO_MULTEX_MASK\n        col*=texture(texMulMask,texPos).r;\n    #endif\n\n    outColor=col;\n}","textmesh_vert":"UNI sampler2D tex;\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\nUNI float scale;\nIN vec3 vPosition;\nIN vec2 attrTexCoord;\nIN mat4 instMat;\nIN vec2 attrTexOffsets;\nIN vec2 attrTexSize;\nIN vec2 attrTexPos;\nOUT vec2 texPos;\n\nOUT vec2 texCoord;\n\nvoid main()\n{\n    texCoord=(attrTexCoord*(attrTexSize)) + attrTexOffsets;\n    mat4 instMVMat=instMat;\n    instMVMat[3][0]*=scale;\n\n    texPos=attrTexPos;\n\n    vec4 vert=vec4( vPosition.x*(attrTexSize.x/attrTexSize.y)*scale,vPosition.y*scale,vPosition.z*scale, 1. );\n\n    mat4 mvMatrix=viewMatrix * modelMatrix * instMVMat;\n\n    gl_Position = projMatrix * mvMatrix * vert;\n}\n",};
const
    render = op.inTrigger("Render"),
    str = op.inString("Text", "cables"),
    scale = op.inValueFloat("Scale", 1),
    inFont = op.inString("Font", "Arial"),
    align = op.inValueSelect("align", ["left", "center", "right"], "center"),
    valign = op.inValueSelect("vertical align", ["Top", "Middle", "Bottom"], "Middle"),
    lineHeight = op.inValueFloat("Line Height", 1),
    letterSpace = op.inValueFloat("Letter Spacing"),

    tfilter = op.inSwitch("filter", ["nearest", "linear", "mipmap"], "mipmap"),
    aniso = op.inSwitch("Anisotropic", [0, 1, 2, 4, 8, 16], 0),

    inMulTex = op.inTexture("Texture Color"),
    inMulTexMask = op.inTexture("Texture Mask"),
    next = op.outTrigger("Next"),
    textureOut = op.outTexture("texture"),
    outLines = op.outNumber("Total Lines", 0),
    outWidth = op.outNumber("Width", 0),
    loaded = op.outBoolNum("Font Available", 0);

const cgl = op.patch.cgl;

op.toWorkPortsNeedToBeLinked(render);

op.setPortGroup("Masking", [inMulTex, inMulTexMask]);

const textureSize = 1024;
let fontLoaded = false;
let needUpdate = true;

align.onChange =
    str.onChange =
    lineHeight.onChange = generateMeshLater;

function generateMeshLater()
{
    needUpdate = true;
}

let canvasid = null;
CABLES.OpTextureMeshCanvas = {};
let valignMode = 0;

const geom = null;
let mesh = null;

let createMesh = true;
let createTexture = true;

aniso.onChange =
tfilter.onChange = () =>
{
    getFont().texture = null;
    createTexture = true;
};

inMulTexMask.onChange =
inMulTex.onChange = function ()
{
    shader.toggleDefine("DO_MULTEX", inMulTex.get());
    shader.toggleDefine("DO_MULTEX_MASK", inMulTexMask.get());
};

textureOut.set(null);
inFont.onChange = function ()
{
    createTexture = true;
    createMesh = true;
    checkFont();
};

op.patch.on("fontLoaded", (fontName) =>
{
    if (fontName == inFont.get())
    {
        createTexture = true;
        createMesh = true;
    }
});

function checkFont()
{
    const oldFontLoaded = fontLoaded;
    try
    {
        fontLoaded = document.fonts.check("20px \"" + inFont.get() + "\"");
    }
    catch (ex)
    {
        op.logError(ex);
    }

    if (!oldFontLoaded && fontLoaded)
    {
        loaded.set(true);
        createTexture = true;
        createMesh = true;
    }

    if (!fontLoaded) setTimeout(checkFont, 250);
}

valign.onChange = function ()
{
    if (valign.get() == "Middle")valignMode = 0;
    else if (valign.get() == "Top")valignMode = 1;
    else if (valign.get() == "Bottom")valignMode = 2;
};

function getFont()
{
    canvasid = "" + inFont.get();
    if (CABLES.OpTextureMeshCanvas.hasOwnProperty(canvasid))
        return CABLES.OpTextureMeshCanvas[canvasid];

    const fontImage = document.createElement("canvas");
    fontImage.dataset.font = inFont.get();
    fontImage.id = "texturetext_" + CABLES.generateUUID();
    fontImage.style.display = "none";
    const body = document.getElementsByTagName("body")[0];
    body.appendChild(fontImage);
    const _ctx = fontImage.getContext("2d");
    CABLES.OpTextureMeshCanvas[canvasid] =
        {
            "ctx": _ctx,
            "canvas": fontImage,
            "chars": {},
            "characters": "",
            "fontSize": 320
        };
    return CABLES.OpTextureMeshCanvas[canvasid];
}

op.onDelete = function ()
{
    if (canvasid && CABLES.OpTextureMeshCanvas[canvasid])
        CABLES.OpTextureMeshCanvas[canvasid].canvas.remove();
};

const shader = new CGL.Shader(cgl, "TextMesh");
shader.setSource(attachments.textmesh_vert, attachments.textmesh_frag);
const uniTex = new CGL.Uniform(shader, "t", "tex", 0);
const uniTexMul = new CGL.Uniform(shader, "t", "texMul", 1);
const uniTexMulMask = new CGL.Uniform(shader, "t", "texMulMask", 2);
const uniScale = new CGL.Uniform(shader, "f", "scale", scale);

const
    r = op.inValueSlider("r", 1),
    g = op.inValueSlider("g", 1),
    b = op.inValueSlider("b", 1),
    a = op.inValueSlider("a", 1),
    runiform = new CGL.Uniform(shader, "f", "r", r),
    guniform = new CGL.Uniform(shader, "f", "g", g),
    buniform = new CGL.Uniform(shader, "f", "b", b),
    auniform = new CGL.Uniform(shader, "f", "a", a);
r.setUiAttribs({ "colorPick": true });

op.setPortGroup("Display", [scale, inFont]);
op.setPortGroup("Alignment", [align, valign]);
op.setPortGroup("Color", [r, g, b, a]);

let height = 0;
const vec = vec3.create();
let lastTextureChange = -1;
let disabled = false;

render.onTriggered = function ()
{
    if (needUpdate)
    {
        generateMesh();
        needUpdate = false;
    }
    const font = getFont();
    if (font.lastChange != lastTextureChange)
    {
        createMesh = true;
        lastTextureChange = font.lastChange;
    }

    if (createTexture) generateTexture();
    if (createMesh)generateMesh();

    if (mesh && mesh.numInstances > 0)
    {
        cgl.pushBlendMode(CGL.BLEND_NORMAL, true);
        cgl.pushShader(shader);
        cgl.setTexture(0, textureOut.get().tex);

        const mulTex = inMulTex.get();
        if (mulTex)cgl.setTexture(1, mulTex.tex);

        const mulTexMask = inMulTexMask.get();
        if (mulTexMask)cgl.setTexture(2, mulTexMask.tex);

        if (valignMode === 2) vec3.set(vec, 0, height, 0);
        else if (valignMode === 1) vec3.set(vec, 0, 0, 0);
        else if (valignMode === 0) vec3.set(vec, 0, height / 2, 0);

        vec[1] -= lineHeight.get();
        cgl.pushModelMatrix();
        mat4.translate(cgl.mMatrix, cgl.mMatrix, vec);
        if (!disabled)mesh.render(cgl.getShader());

        cgl.popModelMatrix();

        cgl.setTexture(0, null);
        cgl.popShader();
        cgl.popBlendMode();
    }

    next.trigger();
};

letterSpace.onChange = function ()
{
    createMesh = true;
};

function generateMesh()
{
    const theString = String(str.get() + "");
    if (!textureOut.get()) return;

    const font = getFont();
    if (!font.geom)
    {
        font.geom = new CGL.Geometry("textmesh");

        font.geom.vertices = [
            1.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            1.0, 0.0, 0.0,
            0.0, 0.0, 0.0
        ];

        font.geom.texCoords = new Float32Array([
            1.0, 1.0,
            0.0, 1.0,
            1.0, 0.0,
            0.0, 0.0
        ]);

        font.geom.verticesIndices = [
            0, 1, 2,
            2, 1, 3
        ];
    }

    if (!mesh)mesh = new CGL.Mesh(cgl, font.geom);

    const strings = (theString).split("\n");
    outLines.set(strings.length);

    const transformations = [];
    const tcOffsets = [];// new Float32Array(str.get().length*2);
    const tcSize = [];// new Float32Array(str.get().length*2);
    const texPos = [];
    let charCounter = 0;
    createTexture = false;
    const m = mat4.create();

    let maxWidth = 0;

    for (let s = 0; s < strings.length; s++)
    {
        const txt = strings[s];
        const numChars = txt.length;

        let pos = 0;
        let offX = 0;
        let width = 0;

        for (let i = 0; i < numChars; i++)
        {
            const chStr = txt.substring(i, i + 1);
            const char = font.chars[String(chStr)];
            if (char)
            {
                width += (char.texCoordWidth / char.texCoordHeight);
                width += letterSpace.get();
            }
        }

        width -= letterSpace.get();

        height = 0;

        if (align.get() == "left") offX = 0;
        else if (align.get() == "right") offX = width;
        else if (align.get() == "center") offX = width / 2;

        height = (s + 1) * lineHeight.get();

        for (let i = 0; i < numChars; i++)
        {
            const chStr = txt.substring(i, i + 1);
            const char = font.chars[String(chStr)];

            if (!char)
            {
                createTexture = true;
                return;
            }
            else
            {
                texPos.push(pos / width * 0.99 + 0.005, (1.0 - (s / (strings.length - 1))) * 0.99 + 0.005);
                tcOffsets.push(char.texCoordX, 1 - char.texCoordY - char.texCoordHeight);
                tcSize.push(char.texCoordWidth, char.texCoordHeight);

                mat4.identity(m);
                mat4.translate(m, m, [pos - offX, 0 - s * lineHeight.get(), 0]);

                pos += (char.texCoordWidth / char.texCoordHeight) + letterSpace.get();
                maxWidth = Math.max(maxWidth, pos - offX);

                transformations.push(Array.prototype.slice.call(m));

                charCounter++;
            }
        }
    }

    const transMats = [].concat.apply([], transformations);

    disabled = false;
    if (transMats.length == 0)disabled = true;

    mesh.numInstances = transMats.length / 16;

    if (mesh.numInstances == 0)
    {
        disabled = true;
        return;
    }

    outWidth.set(maxWidth * scale.get());
    mesh.setAttribute("instMat", new Float32Array(transMats), 16, { "instanced": true });
    mesh.setAttribute("attrTexOffsets", new Float32Array(tcOffsets), 2, { "instanced": true });
    mesh.setAttribute("attrTexSize", new Float32Array(tcSize), 2, { "instanced": true });
    mesh.setAttribute("attrTexPos", new Float32Array(texPos), 2, { "instanced": true });

    createMesh = false;

    if (createTexture) generateTexture();
}

function printChars(fontSize, simulate)
{
    const font = getFont();
    if (!simulate) font.chars = {};

    const ctx = font.ctx;

    ctx.font = fontSize + "px " + inFont.get();
    ctx.textAlign = "left";

    let posy = 0;
    let posx = 0;
    const lineHeight = fontSize * 1.4;
    const result =
        {
            "fits": true
        };

    for (let i = 0; i < font.characters.length; i++)
    {
        const chStr = String(font.characters.substring(i, i + 1));
        const chWidth = (ctx.measureText(chStr).width);

        if (posx + chWidth >= textureSize)
        {
            posy += lineHeight + 2;
            posx = 0;
        }

        if (!simulate)
        {
            font.chars[chStr] =
                {
                    "str": chStr,
                    "texCoordX": posx / textureSize,
                    "texCoordY": posy / textureSize,
                    "texCoordWidth": chWidth / textureSize,
                    "texCoordHeight": lineHeight / textureSize,
                };

            ctx.fillText(chStr, posx, posy + fontSize);
        }

        posx += chWidth + 12;
    }

    if (posy > textureSize - lineHeight)
    {
        result.fits = false;
    }

    result.spaceLeft = textureSize - posy;

    return result;
}

function generateTexture()
{
    let filter = CGL.Texture.FILTER_LINEAR;
    if (tfilter.get() == "nearest") filter = CGL.Texture.FILTER_NEAREST;
    if (tfilter.get() == "mipmap") filter = CGL.Texture.FILTER_MIPMAP;

    const font = getFont();
    let string = String(str.get());
    if (string == null || string == undefined)string = "";
    for (let i = 0; i < string.length; i++)
    {
        const ch = string.substring(i, i + 1);
        if (font.characters.indexOf(ch) == -1)
        {
            font.characters += ch;
            createTexture = true;
        }
    }

    const ctx = font.ctx;
    font.canvas.width = font.canvas.height = textureSize;

    if (!font.texture)
        font.texture = CGL.Texture.createFromImage(cgl, font.canvas,
            {
                "filter": filter,
                "anisotropic": parseFloat(aniso.get())
            });

    font.texture.setSize(textureSize, textureSize);

    ctx.fillStyle = "transparent";
    ctx.clearRect(0, 0, textureSize, textureSize);
    ctx.fillStyle = "rgba(255,255,255,255)";

    let fontSize = font.fontSize + 40;
    let simu = printChars(fontSize, true);

    while (!simu.fits)
    {
        fontSize -= 5;
        simu = printChars(fontSize, true);
    }

    printChars(fontSize, false);

    ctx.restore();

    font.texture.initTexture(font.canvas, filter);
    font.texture.unpackAlpha = true;
    textureOut.set(font.texture);

    font.lastChange = CABLES.now();

    createMesh = true;
    createTexture = false;
}


};

Ops.Gl.Meshes.TextMesh_v2.prototype = new CABLES.Op();
CABLES.OPS["2390f6b3-2122-412e-8c8d-5c2f574e8bd1"]={f:Ops.Gl.Meshes.TextMesh_v2,objName:"Ops.Gl.Meshes.TextMesh_v2"};




// **************************************************************
// 
// Ops.Html.FontFile_v2
// 
// **************************************************************

Ops.Html.FontFile_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    filename = op.inUrl("file", [".otf", ".ttf", ".woff", ".woff2"]),
    fontname = op.inString("family"),
    outLoaded = op.outBoolNum("Loaded"),
    loadedTrigger = op.outTrigger("Loaded Trigger");

let loadingId = null;
let fontFaceObj;
let doc = null;

filename.onChange = function ()
{
    outLoaded.set(false);
    addStyle(null);
};

fontname.onChange = () =>
{
    addStyle(null);
};

op.patch.on("windowChanged",
    (win) =>
    {
        fontFaceObj = null;
        addStyle(win.document);
    });

function addStyle(_doc)
{
    doc = _doc || doc || op.patch.cgl.canvas.ownerDocument || document;

    if (filename.get() && fontname.get())
    {
        if (doc.fonts)
        {
            let url = "url(" + op.patch.getFilePath(String(filename.get())) + ")";
            fontFaceObj = new FontFace(fontname.get(), url);

            loadingId = op.patch.cgl.patch.loading.start("FontFile", filename.get(), op);
            // Add the FontFace to the FontFaceSet
            doc.fonts.add(fontFaceObj);

            // Get the current status of the FontFace
            // (should be 'unloaded')

            // Load the FontFace

            // Get the current status of the Fontface
            // (should be 'loading' or 'loaded' if cached)

            // Wait until the font has been loaded, log the current status.
            fontFaceObj.loaded.then((fontFace) =>
            {
                outLoaded.set(true);
                loadedTrigger.trigger();
                op.patch.cgl.patch.loading.finished(loadingId);

                op.patch.emitEvent("fontLoaded", fontname.get());

                // Throw an error if loading wasn't successful
            }, (fontFace) =>
            {
                op.setUiError("loadingerror", "Font loading error!" + fontFaceObj.status);
                op.patch.cgl.patch.loading.finished(loadingId);
                outLoaded.set(true);

                // op.logError("Font loading error! Current status", fontFaceObj.status);
            }).catch((f) =>
            {
                console.error("catch ", f);
            });

            fontFaceObj.load();
        }
        else
        { // font loading api not supported
            const fileUrl = op.patch.getFilePath(String(filename.get()));
            const styleStr = ""
                .endl() + "@font-face"
                .endl() + "{"
                .endl() + "  font-family: \"" + fontname.get() + "\";"
                .endl() + "  src: url(\"" + fileUrl + "\") format(\"truetype\");"
                .endl() + "}";

            const style = document.createElement("style");
            style.classList.add("cablesEle");
            style.type = "text/css";
            style.innerHTML = styleStr;
            document.getElementsByTagName("head")[document.getElementsByTagName("head").length - 1].appendChild(style);
            // TODO: Poll if font loaded
        }
    }
}


};

Ops.Html.FontFile_v2.prototype = new CABLES.Op();
CABLES.OPS["68177370-116e-4c76-aef3-3b10d68e7227"]={f:Ops.Html.FontFile_v2,objName:"Ops.Html.FontFile_v2"};




// **************************************************************
// 
// Ops.Gl.GLTF.GltfScene_v4
// 
// **************************************************************

Ops.Gl.GLTF.GltfScene_v4 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"inc_camera_js":"const gltfCamera = class\n{\n    constructor(gltf, node)\n    {\n        this.node = node;\n        this.name = node.name;\n        // console.log(gltf);\n        this.config = gltf.json.cameras[node.camera];\n\n        this.pos = vec3.create();\n        this.quat = quat.create();\n        this.vCenter = vec3.create();\n        this.vUp = vec3.create();\n        this.vMat = mat4.create();\n    }\n\n    updateAnim(time)\n    {\n        if (this.node && this.node._animTrans)\n        {\n            vec3.set(this.pos,\n                this.node._animTrans[0].getValue(time),\n                this.node._animTrans[1].getValue(time),\n                this.node._animTrans[2].getValue(time));\n\n            quat.set(this.quat,\n                this.node._animRot[0].getValue(time),\n                this.node._animRot[1].getValue(time),\n                this.node._animRot[2].getValue(time),\n                this.node._animRot[3].getValue(time));\n        }\n    }\n\n    start(time)\n    {\n        if (cgl.frameStore.shadowPass) return;\n\n        this.updateAnim(time);\n        const asp = cgl.getViewPort()[2] / cgl.getViewPort()[3];\n\n        cgl.pushPMatrix();\n        // mat4.perspective(\n        //     cgl.pMatrix,\n        //     this.config.perspective.yfov*0.5,\n        //     asp,\n        //     this.config.perspective.znear,\n        //     this.config.perspective.zfar);\n\n        cgl.pushViewMatrix();\n        // mat4.identity(cgl.vMatrix);\n\n        // if(this.node && this.node.parent)\n        // {\n        //     console.log(this.node.parent)\n        // vec3.add(this.pos,this.pos,this.node.parent._node.translation);\n        // vec3.sub(this.vCenter,this.vCenter,this.node.parent._node.translation);\n        // mat4.translate(cgl.vMatrix,cgl.vMatrix,\n        // [\n        //     -this.node.parent._node.translation[0],\n        //     -this.node.parent._node.translation[1],\n        //     -this.node.parent._node.translation[2]\n        // ])\n        // }\n\n        // vec3.set(this.vUp, 0, 1, 0);\n        // vec3.set(this.vCenter, 0, -1, 0);\n        // // vec3.set(this.vCenter, 0, 1, 0);\n        // vec3.transformQuat(this.vCenter, this.vCenter, this.quat);\n        // vec3.normalize(this.vCenter, this.vCenter);\n        // vec3.add(this.vCenter, this.vCenter, this.pos);\n\n        // mat4.lookAt(cgl.vMatrix, this.pos, this.vCenter, this.vUp);\n\n        let mv = mat4.create();\n        mat4.invert(mv, this.node.modelMatAbs());\n\n        // console.log(this.node.modelMatAbs());\n\n        this.vMat = mv;\n\n        mat4.identity(cgl.vMatrix);\n        // console.log(mv);\n        mat4.mul(cgl.vMatrix, cgl.vMatrix, mv);\n    }\n\n    end()\n    {\n        if (cgl.frameStore.shadowPass) return;\n        cgl.popPMatrix();\n        cgl.popViewMatrix();\n    }\n};\n","inc_gltf_js":"const le = true; // little endian\n\nconst Gltf = class\n{\n    constructor()\n    {\n        this.json = {};\n        this.accBuffers = [];\n        this.meshes = [];\n        this.nodes = [];\n        this.shaders = [];\n        this.timing = [];\n        this.cams = [];\n        this.startTime = performance.now();\n        this.bounds = new CABLES.CG.BoundingBox();\n        this.loaded = Date.now();\n        this.accBuffersDelete = [];\n    }\n\n    getNode(n)\n    {\n        for (let i = 0; i < this.nodes.length; i++)\n        {\n            if (this.nodes[i].name == n) return this.nodes[i];\n        }\n    }\n\n    unHideAll()\n    {\n        for (let i = 0; i < this.nodes.length; i++)\n        {\n            this.nodes[i].unHide();\n        }\n    }\n};\n\nfunction Utf8ArrayToStr(array)\n{\n    if (window.TextDecoder) return new TextDecoder(\"utf-8\").decode(array);\n\n    let out, i, len, c;\n    let char2, char3;\n\n    out = \"\";\n    len = array.length;\n    i = 0;\n    while (i < len)\n    {\n        c = array[i++];\n        switch (c >> 4)\n        {\n        case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:\n            // 0xxxxxxx\n            out += String.fromCharCode(c);\n            break;\n        case 12: case 13:\n            // 110x xxxx   10xx xxxx\n            char2 = array[i++];\n            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));\n            break;\n        case 14:\n            // 1110 xxxx  10xx xxxx  10xx xxxx\n            char2 = array[i++];\n            char3 = array[i++];\n            out += String.fromCharCode(((c & 0x0F) << 12) |\n                    ((char2 & 0x3F) << 6) |\n                    ((char3 & 0x3F) << 0));\n            break;\n        }\n    }\n\n    return out;\n}\n\nfunction readChunk(dv, bArr, arrayBuffer, offset)\n{\n    const chunk = {};\n\n    if (offset >= dv.byteLength)\n    {\n        op.log(\"could not read chunk...\");\n        return;\n    }\n    chunk.size = dv.getUint32(offset + 0, le);\n\n    // chunk.type = new TextDecoder(\"utf-8\").decode(bArr.subarray(offset+4, offset+4+4));\n    chunk.type = Utf8ArrayToStr(bArr.subarray(offset + 4, offset + 4 + 4));\n\n    if (chunk.type == \"BIN\\0\")\n    {\n        // console.log(chunk.size,arrayBuffer.length,offset);\n        // try\n        // {\n        chunk.dataView = new DataView(arrayBuffer, offset + 8, chunk.size);\n        // }\n        // catch(e)\n        // {\n        //     chunk.dataView = null;\n        //     console.log(e);\n        // }\n    }\n    else\n    if (chunk.type == \"JSON\")\n    {\n        const json = Utf8ArrayToStr(bArr.subarray(offset + 8, offset + 8 + chunk.size));\n\n        try\n        {\n            const obj = JSON.parse(json);\n            chunk.data = obj;\n            outGenerator.set(obj.asset.generator);\n        }\n        catch (e)\n        {\n        }\n    }\n    else\n    {\n        op.warn(\"unknown type\", chunk.type);\n    }\n\n    return chunk;\n}\n\nfunction loadAnims(gltf)\n{\n    const uniqueAnimNames = {};\n\n    for (let i = 0; i < gltf.json.animations.length; i++)\n    {\n        const an = gltf.json.animations[i];\n\n        an.name = an.name || \"unknown\";\n\n        for (let ia = 0; ia < an.channels.length; ia++)\n        {\n            const chan = an.channels[ia];\n\n            const node = gltf.nodes[chan.target.node];\n            const sampler = an.samplers[chan.sampler];\n\n            const acc = gltf.json.accessors[sampler.input];\n            const bufferIn = gltf.accBuffers[sampler.input];\n\n            const accOut = gltf.json.accessors[sampler.output];\n            const bufferOut = gltf.accBuffers[sampler.output];\n\n            gltf.accBuffersDelete.push(sampler.output, sampler.input);\n\n            if (bufferIn && bufferOut)\n            {\n                let numComps = 1;\n                if (accOut.type === \"VEC2\")numComps = 2;\n                else if (accOut.type === \"VEC3\")numComps = 3;\n                else if (accOut.type === \"VEC4\")numComps = 4;\n                else if (accOut.type === \"SCALAR\")\n                {\n                    numComps = bufferOut.length / bufferIn.length; // is this really the way to find out ? cant find any other way,except number of morph targets, but not really connected...\n                }\n                else op.log(\"[] UNKNOWN accOut.type\", accOut.type);\n\n                const anims = [];\n\n                uniqueAnimNames[an.name] = true;\n\n                for (let k = 0; k < numComps; k++)\n                {\n                    const newAnim = new CABLES.Anim();\n                    // newAnim.name=an.name;\n                    anims.push(newAnim);\n                }\n\n                if (sampler.interpolation === \"LINEAR\") {}\n                else if (sampler.interpolation === \"STEP\") for (let k = 0; k < numComps; k++) anims[k].defaultEasing = CABLES.EASING_ABSOLUTE;\n                else if (sampler.interpolation === \"CUBICSPLINE\") for (let k = 0; k < numComps; k++) anims[k].defaultEasing = CABLES.EASING_CUBICSPLINE;\n                else op.warn(\"unknown interpolation\", sampler.interpolation);\n\n                // console.log(bufferOut)\n\n                // if there is no keyframe for time 0 copy value of first keyframe at time 0\n                if (bufferIn[0] !== 0.0)\n                    for (let k = 0; k < numComps; k++)\n                        anims[k].setValue(0, bufferOut[0 * numComps + k]);\n\n                for (let j = 0; j < bufferIn.length; j++)\n                {\n                    maxTime = Math.max(bufferIn[j], maxTime);\n\n                    for (let k = 0; k < numComps; k++)\n                    {\n                        if (anims[k].defaultEasing === CABLES.EASING_CUBICSPLINE)\n                        {\n                            const idx = ((j * numComps) * 3 + k);\n\n                            const key = anims[k].setValue(bufferIn[j], bufferOut[idx + numComps]);\n                            key.bezTangIn = bufferOut[idx];\n                            key.bezTangOut = bufferOut[idx + (numComps * 2)];\n\n                            // console.log(an.name,k,bufferOut[idx+1]);\n                        }\n                        else\n                        {\n                            // console.log(an.name,k,bufferOut[j * numComps + k]);\n                            anims[k].setValue(bufferIn[j], bufferOut[j * numComps + k]);\n                        }\n                    }\n                }\n\n                node.setAnim(chan.target.path, an.name, anims);\n            }\n            else\n            {\n                op.warn(\"loadAmins bufferIn undefined \", bufferIn === undefined);\n                op.warn(\"loadAmins bufferOut undefined \", bufferOut === undefined);\n                op.warn(\"loadAmins \", sampler, accOut);\n                op.warn(\"loadAmins num accBuffers\", gltf.accBuffers.length);\n                op.warn(\"loadAmins num accessors\", gltf.json.accessors.length);\n            }\n        }\n    }\n\n    gltf.uniqueAnimNames = uniqueAnimNames;\n\n    outAnims.setRef(Object.keys(uniqueAnimNames));\n}\n\nfunction loadCams(gltf)\n{\n    if (!gltf || !gltf.json.cameras) return;\n\n    gltf.cameras = gltf.cameras || [];\n\n    for (let i = 0; i < gltf.nodes.length; i++)\n    {\n        if (gltf.nodes[i].hasOwnProperty(\"camera\"))\n        {\n            const cam = new gltfCamera(gltf, gltf.nodes[i]);\n            gltf.cameras.push(cam);\n        }\n    }\n}\n\nfunction loadAfterDraco()\n{\n    if (!window.DracoDecoder)\n    {\n        setTimeout(() =>\n        {\n            loadAfterDraco();\n        }, 100);\n    }\n\n    reloadSoon();\n}\n\nfunction parseGltf(arrayBuffer)\n{\n    const CHUNK_HEADER_SIZE = 8;\n\n    let j = 0, i = 0;\n\n    const gltf = new Gltf();\n    gltf.timing.push([\"Start parsing\", Math.round((performance.now() - gltf.startTime))]);\n\n    if (!arrayBuffer) return;\n    const byteArray = new Uint8Array(arrayBuffer);\n    let pos = 0;\n\n    // var string = new TextDecoder(\"utf-8\").decode(byteArray.subarray(pos, 4));\n    const string = Utf8ArrayToStr(byteArray.subarray(pos, 4));\n    pos += 4;\n    if (string != \"glTF\") return;\n\n    gltf.timing.push([\"dataview\", Math.round((performance.now() - gltf.startTime))]);\n\n    const dv = new DataView(arrayBuffer);\n    const version = dv.getUint32(pos, le);\n    pos += 4;\n    const size = dv.getUint32(pos, le);\n    pos += 4;\n\n    outVersion.set(version);\n\n    const chunks = [];\n    gltf.chunks = chunks;\n\n    chunks.push(readChunk(dv, byteArray, arrayBuffer, pos));\n    pos += chunks[0].size + CHUNK_HEADER_SIZE;\n    gltf.json = chunks[0].data;\n\n    gltf.cables = {\n        \"fileUrl\": inFile.get(),\n        \"shortFileName\": CABLES.basename(inFile.get())\n    };\n\n    outJson.setRef(gltf.json);\n    outExtensions.setRef(gltf.json.extensionsUsed || []);\n\n    let ch = readChunk(dv, byteArray, arrayBuffer, pos);\n    while (ch)\n    {\n        chunks.push(ch);\n        pos += ch.size + CHUNK_HEADER_SIZE;\n        ch = readChunk(dv, byteArray, arrayBuffer, pos);\n    }\n\n    gltf.chunks = chunks;\n\n    const views = chunks[0].data.bufferViews;\n    const accessors = chunks[0].data.accessors;\n\n    gltf.timing.push([\"Parse buffers\", Math.round((performance.now() - gltf.startTime))]);\n\n    if (gltf.json.extensionsUsed && gltf.json.extensionsUsed.indexOf(\"KHR_draco_mesh_compression\") > -1)\n    {\n        if (!window.DracoDecoder)\n        {\n            op.setUiError(\"gltfdraco\", \"GLTF draco compression lib not found / add draco op to your patch!\");\n\n            loadAfterDraco();\n            return gltf;\n        }\n        else\n        {\n            gltf.useDraco = true;\n        }\n    }\n\n    op.setUiError(\"gltfdraco\", null);\n    // let accPos = (view.byteOffset || 0) + (acc.byteOffset || 0);\n\n    if (views)\n    {\n        for (i = 0; i < accessors.length; i++)\n        {\n            const acc = accessors[i];\n            const view = views[acc.bufferView];\n\n            let numComps = 0;\n            if (acc.type == \"SCALAR\")numComps = 1;\n            else if (acc.type == \"VEC2\")numComps = 2;\n            else if (acc.type == \"VEC3\")numComps = 3;\n            else if (acc.type == \"VEC4\")numComps = 4;\n            else if (acc.type == \"MAT4\")numComps = 16;\n            else console.error(\"unknown accessor type\", acc.type);\n\n            //   const decoder = new decoderModule.Decoder();\n            //   const decodedGeometry = decodeDracoData(data, decoder);\n            //   // Encode mesh\n            //   encodeMeshToFile(decodedGeometry, decoder);\n\n            //   decoderModule.destroy(decoder);\n            //   decoderModule.destroy(decodedGeometry);\n\n            // 5120 (BYTE)\t1\n            // 5121 (UNSIGNED_BYTE)\t1\n            // 5122 (SHORT)\t2\n\n            if (chunks[1].dataView)\n            {\n                if (view)\n                {\n                    const num = acc.count * numComps;\n                    let accPos = (view.byteOffset || 0) + (acc.byteOffset || 0);\n                    let stride = view.byteStride || 0;\n                    let dataBuff = null;\n\n                    if (acc.componentType == 5126 || acc.componentType == 5125) // 4byte FLOAT or INT\n                    {\n                        stride = stride || 4;\n\n                        const isInt = acc.componentType == 5125;\n                        if (isInt)dataBuff = new Uint32Array(num);\n                        else dataBuff = new Float32Array(num);\n\n                        for (j = 0; j < num; j++)\n                        {\n                            if (isInt) dataBuff[j] = chunks[1].dataView.getUint32(accPos, le);\n                            else dataBuff[j] = chunks[1].dataView.getFloat32(accPos, le);\n\n                            if (stride != 4 && (j + 1) % numComps === 0)accPos += stride - (numComps * 4);\n                            accPos += 4;\n                        }\n                    }\n                    else if (acc.componentType == 5123) // UNSIGNED_SHORT\n                    {\n                        stride = stride || 2;\n\n                        dataBuff = new Uint16Array(num);\n\n                        for (j = 0; j < num; j++)\n                        {\n                            dataBuff[j] = chunks[1].dataView.getUint16(accPos, le);\n\n                            if (stride != 2 && (j + 1) % numComps === 0) accPos += stride - (numComps * 2);\n\n                            accPos += 2;\n                        }\n                    }\n                    else if (acc.componentType == 5121) // UNSIGNED_BYTE\n                    {\n                        stride = stride || 1;\n\n                        dataBuff = new Uint8Array(num);\n\n                        for (j = 0; j < num; j++)\n                        {\n                            dataBuff[j] = chunks[1].dataView.getUint8(accPos, le);\n\n                            if (stride != 1 && (j + 1) % numComps === 0) accPos += stride - (numComps * 1);\n\n                            accPos += 1;\n                        }\n                    }\n\n                    else\n                    {\n                        console.error(\"unknown component type\", acc.componentType);\n                    }\n\n                    gltf.accBuffers.push(dataBuff);\n                }\n                else\n                {\n                    // console.log(\"has no dataview\");\n                }\n            }\n        }\n    }\n\n    gltf.timing.push([\"Parse mesh groups\", Math.round((performance.now() - gltf.startTime))]);\n\n    gltf.json.meshes = gltf.json.meshes || [];\n\n    if (gltf.json.meshes)\n    {\n        for (i = 0; i < gltf.json.meshes.length; i++)\n        {\n            const mesh = new gltfMeshGroup(gltf, gltf.json.meshes[i]);\n            gltf.meshes.push(mesh);\n        }\n    }\n\n    gltf.timing.push([\"Parse nodes\", Math.round((performance.now() - gltf.startTime))]);\n\n    for (i = 0; i < gltf.json.nodes.length; i++)\n    {\n        if (gltf.json.nodes[i].children)\n            for (j = 0; j < gltf.json.nodes[i].children.length; j++)\n            {\n                gltf.json.nodes[gltf.json.nodes[i].children[j]].isChild = true;\n            }\n    }\n\n    for (i = 0; i < gltf.json.nodes.length; i++)\n    {\n        const node = new gltfNode(gltf.json.nodes[i], gltf);\n        gltf.nodes.push(node);\n    }\n\n    for (i = 0; i < gltf.nodes.length; i++)\n    {\n        const node = gltf.nodes[i];\n\n        if (!node.children) continue;\n        for (let j = 0; j < node.children.length; j++)\n        {\n            gltf.nodes[node.children[j]].parent = node;\n        }\n    }\n\n    for (i = 0; i < gltf.nodes.length; i++)\n    {\n        gltf.nodes[i].initSkin();\n    }\n\n    needsMatUpdate = true;\n\n    gltf.timing.push([\"load anims\", Math.round((performance.now() - gltf.startTime))]);\n\n    if (gltf.json.animations) loadAnims(gltf);\n\n    gltf.timing.push([\"load cameras\", Math.round((performance.now() - gltf.startTime))]);\n\n    if (gltf.json.cameras) loadCams(gltf);\n\n    gltf.timing.push([\"finished\", Math.round((performance.now() - gltf.startTime))]);\n    return gltf;\n}\n","inc_mesh_js":"let gltfMesh = class\n{\n    constructor(name, prim, gltf, finished)\n    {\n        this.POINTS = 0;\n        this.LINES = 1;\n        this.LINE_LOOP = 2;\n        this.LINE_STRIP = 3;\n        this.TRIANGLES = 4;\n        this.TRIANGLE_STRIP = 5;\n        this.TRIANGLE_FAN = 6;\n\n        this.test = 0;\n        this.name = name;\n        this.submeshIndex = 0;\n        this.material = prim.material;\n        // console.log(prim);\n        this.mesh = null;\n        this.geom = new CGL.Geometry(\"gltf_\" + this.name);\n        this.geom.verticesIndices = [];\n        this.bounds = null;\n        this.primitive = 4;\n        this.morphTargetsRenderMod = null;\n        this.weights = prim.weights;\n\n        if (prim.hasOwnProperty(\"mode\")) this.primitive = prim.mode;\n\n        if (prim.hasOwnProperty(\"indices\")) this.geom.verticesIndices = gltf.accBuffers[prim.indices];\n\n        gltf.loadingMeshes = gltf.loadingMeshes || 0;\n        gltf.loadingMeshes++;\n\n        this.materialJson =\n            this._matPbrMetalness =\n            this._matPbrRoughness =\n            this._matDiffuseColor = null;\n\n        if (gltf.json.materials)\n        {\n            if (this.material != -1) this.materialJson = gltf.json.materials[this.material];\n\n            if (this.materialJson && this.materialJson.pbrMetallicRoughness)\n            {\n                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty(\"baseColorFactor\"))\n                {\n                    this._matDiffuseColor = [1, 1, 1, 1];\n                }\n                else\n                {\n                    this._matDiffuseColor = this.materialJson.pbrMetallicRoughness.baseColorFactor;\n                }\n\n                this._matDiffuseColor = this.materialJson.pbrMetallicRoughness.baseColorFactor;\n\n                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty(\"metallicFactor\"))\n                {\n                    this._matPbrMetalness = 1.0;\n                }\n                else\n                {\n                    this._matPbrMetalness = this.materialJson.pbrMetallicRoughness.metallicFactor || null;\n                }\n\n                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty(\"roughnessFactor\"))\n                {\n                    this._matPbrRoughness = 1.0;\n                }\n                else\n                {\n                    this._matPbrRoughness = this.materialJson.pbrMetallicRoughness.roughnessFactor || null;\n                }\n            }\n        }\n\n        if (gltf.useDraco && prim.extensions.KHR_draco_mesh_compression)\n        {\n            const view = gltf.chunks[0].data.bufferViews[prim.extensions.KHR_draco_mesh_compression.bufferView];\n            const num = view.byteLength;\n            const dataBuff = new Int8Array(num);\n            let accPos = (view.byteOffset || 0);// + (acc.byteOffset || 0);\n            for (let j = 0; j < num; j++)\n            {\n                dataBuff[j] = gltf.chunks[1].dataView.getInt8(accPos, le);\n                accPos++;\n            }\n\n            const dracoDecoder = window.DracoDecoder;\n            dracoDecoder.decodeGeometry(dataBuff.buffer, (geometry) =>\n            {\n                const geom = new CGL.Geometry(\"draco mesh \" + name);\n\n                for (let i = 0; i < geometry.attributes.length; i++)\n                {\n                    const attr = geometry.attributes[i];\n\n                    if (attr.name === \"position\") geom.vertices = attr.array;\n                    else if (attr.name === \"normal\") geom.vertexNormals = attr.array;\n                    else if (attr.name === \"uv\") geom.texCoords = attr.array;\n                    else if (attr.name === \"color\") geom.vertexColors = this.calcVertexColors(attr.array);\n                    else if (attr.name === \"joints\") geom.setAttribute(\"attrJoints\", Array.from(attr.array), 4);\n                    else if (attr.name === \"weights\")\n                    {\n                        const arr4 = new Float32Array(attr.array.length / attr.itemSize * 4);\n\n                        for (let k = 0; k < attr.array.length / attr.itemSize; k++)\n                        {\n                            arr4[k * 4] = arr4[k * 4 + 1] = arr4[k * 4 + 2] = arr4[k * 4 + 3] = 0;\n                            for (let j = 0; j < attr.itemSize; j++)\n                                arr4[k * 4 + j] = attr.array[k * attr.itemSize + j];\n                        }\n                        geom.setAttribute(\"attrWeights\", arr4, 4);\n                    }\n                    else op.logWarn(\"unknown draco attrib\", attr);\n                }\n\n                geometry.attributes = null;\n                geom.verticesIndices = geometry.index.array;\n\n                this.setGeom(geom);\n\n                this.mesh = null;\n                gltf.loadingMeshes--;\n                gltf.timing.push([\"draco decode\", Math.round((performance.now() - gltf.startTime))]);\n\n                if (finished)finished(this);\n            }, (error) => { op.logError(error); });\n        }\n        else\n        {\n            gltf.loadingMeshes--;\n            this.fillGeomAttribs(gltf, this.geom, prim.attributes);\n\n            if (prim.targets)\n            {\n                for (let j = 0; j < prim.targets.length; j++)\n                {\n                    const tgeom = new CGL.Geometry(\"gltf_target_\" + j);\n\n                    // if (prim.hasOwnProperty(\"indices\")) tgeom.verticesIndices = gltf.accBuffers[prim.indices];\n\n                    this.fillGeomAttribs(gltf, tgeom, prim.targets[j], false);\n\n                    // { // calculate normals for final position of morphtarget for later...\n                    //     for (let i = 0; i < tgeom.vertices.length; i++) tgeom.vertices[i] += this.geom.vertices[i];\n                    //     tgeom.calculateNormals();\n                    //     for (let i = 0; i < tgeom.vertices.length; i++) tgeom.vertices[i] -= this.geom.vertices[i];\n                    // }\n\n                    this.geom.morphTargets.push(tgeom);\n                }\n            }\n            if (finished)finished(this);\n        }\n    }\n\n    _linearToSrgb(x)\n    {\n        if (x <= 0)\n            return 0;\n        else if (x >= 1)\n            return 1;\n        else if (x < 0.0031308)\n            return x * 12.92;\n        else\n            return x ** (1 / 2.2) * 1.055 - 0.055;\n    }\n\n    calcVertexColors(arr)\n    {\n        let vertexColors = null;\n        if (arr instanceof Float32Array)\n        {\n            let div = false;\n            for (let i = 0; i < arr.length; i++)\n            {\n                if (arr[i] > 1)\n                {\n                    div = true;\n                    continue;\n                }\n            }\n\n            if (div)\n                for (let i = 0; i < arr.length; i++) arr[i] /= 65535;\n\n            vertexColors = arr;\n        }\n\n        else if (arr instanceof Uint16Array)\n        {\n            const fb = new Float32Array(arr.length);\n            for (let i = 0; i < arr.length; i++) fb[i] = arr[i] / 65535;\n\n            vertexColors = fb;\n        }\n        else vertexColors = arr;\n\n        for (let i = 0; i < vertexColors.length; i++)\n        {\n            vertexColors[i] = this._linearToSrgb(vertexColors[i]);\n        }\n\n        return vertexColors;\n    }\n\n    fillGeomAttribs(gltf, tgeom, attribs, setGeom)\n    {\n        if (attribs.hasOwnProperty(\"POSITION\")) tgeom.vertices = gltf.accBuffers[attribs.POSITION];\n        if (attribs.hasOwnProperty(\"NORMAL\")) tgeom.vertexNormals = gltf.accBuffers[attribs.NORMAL];\n        if (attribs.hasOwnProperty(\"TANGENT\")) tgeom.tangents = gltf.accBuffers[attribs.TANGENT];\n\n        if (attribs.hasOwnProperty(\"COLOR_0\")) tgeom.vertexColors = this.calcVertexColors(gltf.accBuffers[attribs.COLOR_0]);\n        if (attribs.hasOwnProperty(\"COLOR_1\")) tgeom.setAttribute(\"attrVertColor1\", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_1]), 4);\n        if (attribs.hasOwnProperty(\"COLOR_2\")) tgeom.setAttribute(\"attrVertColor2\", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_2]), 4);\n        if (attribs.hasOwnProperty(\"COLOR_3\")) tgeom.setAttribute(\"attrVertColor3\", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_3]), 4);\n        if (attribs.hasOwnProperty(\"COLOR_4\")) tgeom.setAttribute(\"attrVertColor4\", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_4]), 4);\n\n        if (attribs.hasOwnProperty(\"TEXCOORD_0\")) tgeom.texCoords = gltf.accBuffers[attribs.TEXCOORD_0];\n        if (attribs.hasOwnProperty(\"TEXCOORD_1\")) tgeom.setAttribute(\"attrTexCoord1\", gltf.accBuffers[attribs.TEXCOORD_1], 2);\n        if (attribs.hasOwnProperty(\"TEXCOORD_2\")) tgeom.setAttribute(\"attrTexCoord2\", gltf.accBuffers[attribs.TEXCOORD_2], 2);\n        if (attribs.hasOwnProperty(\"TEXCOORD_3\")) tgeom.setAttribute(\"attrTexCoord3\", gltf.accBuffers[attribs.TEXCOORD_3], 2);\n        if (attribs.hasOwnProperty(\"TEXCOORD_4\")) tgeom.setAttribute(\"attrTexCoord4\", gltf.accBuffers[attribs.TEXCOORD_4], 2);\n\n        if (attribs.hasOwnProperty(\"WEIGHTS_0\"))\n        {\n            tgeom.setAttribute(\"attrWeights\", gltf.accBuffers[attribs.WEIGHTS_0], 4);\n        }\n        if (attribs.hasOwnProperty(\"JOINTS_0\"))\n        {\n            if (!gltf.accBuffers[attribs.JOINTS_0])console.log(\"no !gltf.accBuffers[attribs.JOINTS_0]\");\n            tgeom.setAttribute(\"attrJoints\", gltf.accBuffers[attribs.JOINTS_0], 4);\n        }\n\n        if (attribs.hasOwnProperty(\"POSITION\")) gltf.accBuffersDelete.push(attribs.POSITION);\n        if (attribs.hasOwnProperty(\"NORMAL\")) gltf.accBuffersDelete.push(attribs.NORMAL);\n        if (attribs.hasOwnProperty(\"TEXCOORD_0\")) gltf.accBuffersDelete.push(attribs.TEXCOORD_0);\n        if (attribs.hasOwnProperty(\"TANGENT\")) gltf.accBuffersDelete.push(attribs.TANGENT);\n        if (attribs.hasOwnProperty(\"COLOR_0\"))gltf.accBuffersDelete.push(attribs.COLOR_0);\n        if (attribs.hasOwnProperty(\"COLOR_0\"))gltf.accBuffersDelete.push(attribs.COLOR_0);\n        if (attribs.hasOwnProperty(\"COLOR_1\"))gltf.accBuffersDelete.push(attribs.COLOR_1);\n        if (attribs.hasOwnProperty(\"COLOR_2\"))gltf.accBuffersDelete.push(attribs.COLOR_2);\n        if (attribs.hasOwnProperty(\"COLOR_3\"))gltf.accBuffersDelete.push(attribs.COLOR_3);\n\n        if (attribs.hasOwnProperty(\"TEXCOORD_1\")) gltf.accBuffersDelete.push(attribs.TEXCOORD_1);\n        if (attribs.hasOwnProperty(\"TEXCOORD_2\")) gltf.accBuffersDelete.push(attribs.TEXCOORD_2);\n        if (attribs.hasOwnProperty(\"TEXCOORD_3\")) gltf.accBuffersDelete.push(attribs.TEXCOORD_3);\n        if (attribs.hasOwnProperty(\"TEXCOORD_4\")) gltf.accBuffersDelete.push(attribs.TEXCOORD_4);\n\n        if (setGeom !== false) if (tgeom && tgeom.verticesIndices) this.setGeom(tgeom);\n    }\n\n    setGeom(geom)\n    {\n        if (inNormFormat.get() == \"X-ZY\")\n        {\n            for (let i = 0; i < geom.vertexNormals.length; i += 3)\n            {\n                let t = geom.vertexNormals[i + 2];\n                geom.vertexNormals[i + 2] = geom.vertexNormals[i + 1];\n                geom.vertexNormals[i + 1] = -t;\n            }\n        }\n\n        if (inVertFormat.get() == \"XZ-Y\")\n        {\n            for (let i = 0; i < geom.vertices.length; i += 3)\n            {\n                let t = geom.vertices[i + 2];\n                geom.vertices[i + 2] = -geom.vertices[i + 1];\n                geom.vertices[i + 1] = t;\n            }\n        }\n\n        if (this.primitive == this.TRIANGLES)\n        {\n            if (inCalcNormals.get() == \"Force Smooth\") geom.calculateNormals();\n            else if (!geom.vertexNormals.length && inCalcNormals.get() == \"Auto\") geom.calculateNormals({ \"smooth\": false });\n\n            if ((!geom.biTangents || geom.biTangents.length == 0) && geom.tangents)\n            {\n                const bitan = vec3.create();\n                const tan = vec3.create();\n\n                const tangents = geom.tangents;\n                geom.tangents = new Float32Array(tangents.length / 4 * 3);\n                geom.biTangents = new Float32Array(tangents.length / 4 * 3);\n\n                for (let i = 0; i < tangents.length; i += 4)\n                {\n                    const idx = i / 4 * 3;\n\n                    vec3.cross(\n                        bitan,\n                        [geom.vertexNormals[idx], geom.vertexNormals[idx + 1], geom.vertexNormals[idx + 2]],\n                        [tangents[i], tangents[i + 1], tangents[i + 2]]\n                    );\n\n                    vec3.div(bitan, bitan, [tangents[i + 3], tangents[i + 3], tangents[i + 3]]);\n                    vec3.normalize(bitan, bitan);\n\n                    geom.biTangents[idx + 0] = bitan[0];\n                    geom.biTangents[idx + 1] = bitan[1];\n                    geom.biTangents[idx + 2] = bitan[2];\n\n                    geom.tangents[idx + 0] = tangents[i + 0];\n                    geom.tangents[idx + 1] = tangents[i + 1];\n                    geom.tangents[idx + 2] = tangents[i + 2];\n                }\n            }\n\n            if (geom.tangents.length === 0 || inCalcNormals.get() != \"Never\")\n            {\n                // console.log(\"[gltf ]no tangents... calculating tangents...\");\n                geom.calcTangentsBitangents();\n            }\n        }\n\n        this.geom = geom;\n\n        this.bounds = geom.getBounds();\n    }\n\n    render(cgl, ignoreMaterial, skinRenderer)\n    {\n        if (!this.mesh && this.geom && this.geom.verticesIndices)\n        {\n            let g = this.geom;\n            if (this.geom.vertices.length / 3 > 64000)\n            {\n                g = this.geom.copy();\n                g.unIndex(false, true);\n            }\n\n            let glprim;\n            if (this.primitive == this.TRIANGLES)glprim = cgl.gl.TRIANGLES;\n            else if (this.primitive == this.LINES)glprim = cgl.gl.LINES;\n            else if (this.primitive == this.LINE_STRIP)glprim = cgl.gl.LINE_STRIP;\n            else if (this.primitive == this.POINTS)glprim = cgl.gl.POINTS;\n            else\n            {\n                op.logWarn(\"unknown primitive type\", this);\n            }\n\n            this.mesh = op.patch.cg.createMesh(g, glprim);\n            // this.mesh = new CGL.Mesh(cgl, g, glprim);\n        }\n        else\n        {\n            // update morphTargets\n            if (this.geom && this.geom.morphTargets.length && !this.morphTargetsRenderMod)\n            {\n                this.mesh.addVertexNumbers = true;\n                this.morphTargetsRenderMod = new GltfTargetsRenderer(this);\n            }\n\n            let useMat = !ignoreMaterial && this.material != -1 && gltf.shaders[this.material];\n            if (skinRenderer)useMat = false;\n\n            if (useMat) cgl.pushShader(gltf.shaders[this.material]);\n\n            const currentShader = cgl.getShader() || {};\n            const uniDiff = currentShader.uniformColorDiffuse;\n\n            const uniPbrMetalness = currentShader.uniformPbrMetalness;\n            const uniPbrRoughness = currentShader.uniformPbrRoughness;\n\n            if (!gltf.shaders[this.material] && inUseMatProps.get())\n            {\n                if (uniDiff && this._matDiffuseColor)\n                {\n                    this._matDiffuseColorOrig = [uniDiff.getValue()[0], uniDiff.getValue()[1], uniDiff.getValue()[2], uniDiff.getValue()[3]];\n                    uniDiff.setValue(this._matDiffuseColor);\n                }\n\n                if (uniPbrMetalness)\n                    if (this._matPbrMetalness != null)\n                    {\n                        this._matPbrMetalnessOrig = uniPbrMetalness.getValue();\n                        uniPbrMetalness.setValue(this._matPbrMetalness);\n                    }\n                    else\n                        uniPbrMetalness.setValue(0);\n\n                if (uniPbrRoughness)\n                    if (this._matPbrRoughness != null)\n                    {\n                        this._matPbrRoughnessOrig = uniPbrRoughness.getValue();\n                        uniPbrRoughness.setValue(this._matPbrRoughness);\n                    }\n                    else\n                    {\n                        uniPbrRoughness.setValue(0);\n                    }\n            }\n\n            if (this.morphTargetsRenderMod) this.morphTargetsRenderMod.renderStart(cgl, 0);\n            if (this.mesh)\n            {\n                // console.log(this.mesh)\n                // this.mesh.lastMaterial=0;\n                this.mesh.render(cgl.getShader(), ignoreMaterial);\n            }\n            if (this.morphTargetsRenderMod) this.morphTargetsRenderMod.renderFinish(cgl);\n\n            if (inUseMatProps.get())\n            {\n                if (uniDiff && this._matDiffuseColor) uniDiff.setValue(this._matDiffuseColorOrig);\n                if (uniPbrMetalness && this._matPbrMetalnessOrig != undefined) uniPbrMetalness.setValue(this._matPbrMetalnessOrig);\n                if (uniPbrRoughness && this._matPbrRoughnessOrig != undefined) uniPbrRoughness.setValue(this._matPbrRoughnessOrig);\n            }\n\n            if (useMat) cgl.popShader();\n        }\n    }\n};\n","inc_meshGroup_js":"const gltfMeshGroup = class\n{\n    constructor(gltf, m)\n    {\n        this.bounds = new CABLES.CG.BoundingBox();\n        this.meshes = [];\n        this.name = m.name;\n        const prims = m.primitives;\n\n        for (let i = 0; i < prims.length; i++)\n        {\n            const mesh = new gltfMesh(this.name, prims[i], gltf,\n                (mesh) =>\n                {\n                    mesh.extras = m.extras;\n                    this.bounds.apply(mesh.bounds);\n                });\n\n            mesh.submeshIndex = i;\n            this.meshes.push(mesh);\n        }\n    }\n\n    render(cgl, ignoreMat, skinRenderer, _time, weights)\n    {\n        for (let i = 0; i < this.meshes.length; i++)\n        {\n            const useMat = gltf.shaders[this.meshes[i].material];\n\n            if (!ignoreMat && useMat) cgl.pushShader(gltf.shaders[this.meshes[i].material]);\n            // console.log(gltf.shaders[this.meshes[i].material],this.meshes[i].material)\n            if (skinRenderer)skinRenderer.renderStart(cgl, _time);\n            if (weights) this.meshes[i].weights = weights;\n            this.meshes[i].render(cgl, ignoreMat, skinRenderer, _time);\n            if (skinRenderer)skinRenderer.renderFinish(cgl);\n            if (!ignoreMat && useMat) cgl.popShader();\n        }\n    }\n};\n","inc_node_js":"const gltfNode = class\n{\n    constructor(node, gltf)\n    {\n        this.isChild = node.isChild || false;\n        this.name = node.name;\n        if (node.hasOwnProperty(\"camera\")) this.camera = node.camera;\n        this.hidden = false;\n        this.mat = mat4.create();\n        this._animActions = {};\n        this.animWeights = [];\n        this._animMat = mat4.create();\n        this._tempMat = mat4.create();\n        this._tempQuat = quat.create();\n        this._tempRotmat = mat4.create();\n        this.mesh = null;\n        this.children = [];\n        this._node = node;\n        this._gltf = gltf;\n        this.absMat = mat4.create();\n        this.addTranslate = null;\n        this._tempAnimScale = null;\n        this.addMulMat = null;\n        this.updateMatrix();\n        this.skinRenderer = null;\n        this.copies = [];\n    }\n\n    get skin()\n    {\n        if (this._node.hasOwnProperty(\"skin\")) return this._node.skin;\n        else return -1;\n    }\n\n    copy()\n    {\n        this.isCopy = true;\n        const n = new gltfNode(this._node, this._gltf);\n        n.copyOf = this;\n\n        n._animActions = this._animActions;\n        n.children = this.children;\n        if (this.skin) n.skinRenderer = new GltfSkin(this);\n\n        this.updateMatrix();\n        return n;\n    }\n\n    hasSkin()\n    {\n        if (this._node.hasOwnProperty(\"skin\")) return this._gltf.json.skins[this._node.skin].name || \"unknown\";\n        return false;\n    }\n\n    initSkin()\n    {\n        if (this.skin > -1)\n        {\n            this.skinRenderer = new GltfSkin(this);\n        }\n    }\n\n    updateMatrix()\n    {\n        mat4.identity(this.mat);\n        if (this._node.translation) mat4.translate(this.mat, this.mat, this._node.translation);\n\n        if (this._node.rotation)\n        {\n            const rotmat = mat4.create();\n            this._rot = this._node.rotation;\n\n            mat4.fromQuat(rotmat, this._node.rotation);\n            mat4.mul(this.mat, this.mat, rotmat);\n        }\n\n        if (this._node.scale)\n        {\n            this._scale = this._node.scale;\n            mat4.scale(this.mat, this.mat, this._scale);\n        }\n\n        if (this._node.hasOwnProperty(\"mesh\"))\n        {\n            this.mesh = this._gltf.meshes[this._node.mesh];\n            if (this.isCopy)\n            {\n                // console.log(this.mesh);\n            }\n        }\n\n        if (this._node.children)\n        {\n            for (let i = 0; i < this._node.children.length; i++)\n            {\n                this._gltf.json.nodes[i].isChild = true;\n                if (this._gltf.nodes[this._node.children[i]]) this._gltf.nodes[this._node.children[i]].isChild = true;\n                this.children.push(this._node.children[i]);\n            }\n        }\n    }\n\n    unHide()\n    {\n        this.hidden = false;\n        for (let i = 0; i < this.children.length; i++)\n            if (this.children[i].unHide) this.children[i].unHide();\n    }\n\n    calcBounds(gltf, mat, bounds)\n    {\n        const localMat = mat4.create();\n\n        if (mat) mat4.copy(localMat, mat);\n        if (this.mat) mat4.mul(localMat, localMat, this.mat);\n\n        if (this.mesh)\n        {\n            const bb = this.mesh.bounds.copy();\n            bb.mulMat4(localMat);\n            bounds.apply(bb);\n\n            if (bounds.changed)\n            {\n                boundingPoints.push(\n                    bb._min[0] || 0, bb._min[1] || 0, bb._min[2] || 0,\n                    bb._max[0] || 0, bb._max[1] || 0, bb._max[2] || 0);\n            }\n        }\n\n        for (let i = 0; i < this.children.length; i++)\n        {\n            if (gltf.nodes[this.children[i]] && gltf.nodes[this.children[i]].calcBounds)\n            {\n                const b = gltf.nodes[this.children[i]].calcBounds(gltf, localMat, bounds);\n\n                bounds.apply(b);\n            }\n        }\n\n        if (bounds.changed) return bounds;\n        else return null;\n    }\n\n    setAnimAction(name)\n    {\n        // console.log(\"setAnimAction:\", name);\n        if (!name) return;\n\n        this._currentAnimaction = name;\n\n        if (name && !this._animActions[name])\n        {\n            // console.log(\"no action found:\", name,this._animActions);\n            return null;\n        }\n\n        // else console.log(\"YES action found:\", name);\n        // console.log(this._animActions);\n\n        for (let path in this._animActions[name])\n        {\n            if (path == \"translation\") this._animTrans = this._animActions[name][path];\n            else if (path == \"rotation\") this._animRot = this._animActions[name][path];\n            else if (path == \"scale\") this._animScale = this._animActions[name][path];\n            else if (path == \"weights\") this.animWeights = this._animActions[name][path];\n            else console.log(\"[gltfNode] unknown anim path\", path, this._animActions[name][path]);\n        }\n    }\n\n    setAnim(path, name, anims)\n    {\n        if (!path || !name || !anims) return;\n\n        // console.log(\"setanim\", this._node.name, path, name, anims);\n\n        this._animActions[name] = this._animActions[name] || {};\n\n        // console.log(this._animActions);\n        // debugger;\n\n        // for (let i = 0; i < this.copies.length; i++) this.copies[i]._animActions = this._animActions;\n\n        if (this._animActions[name][path]) op.log(\"[gltfNode] animation action path already exists\", name, path, this._animActions[name][path]);\n\n        this._animActions[name][path] = anims;\n\n        if (path == \"translation\") this._animTrans = anims;\n        else if (path == \"rotation\") this._animRot = anims;\n        else if (path == \"scale\") this._animScale = anims;\n        else if (path == \"weights\")\n        {\n            // console.log(\"weights\",name,path,anims)\n            this.animWeights = this._animActions[name][path];\n            // console.log(this.animWeights);\n        }\n        else console.warn(\"unknown anim path\", path, anims);\n    }\n\n    modelMatLocal()\n    {\n        return this._animMat || this.mat;\n    }\n\n    modelMatAbs()\n    {\n        return this.absMat;\n    }\n\n    transform(cgl, _time)\n    {\n        if (!_time && _time != 0)_time = time;\n\n        this._lastTimeTrans = _time;\n\n        // console.log(this._rot)\n\n        gltfTransforms++;\n\n        if (!this._animTrans && !this._animRot && !this._animScale)\n        {\n            mat4.mul(cgl.mMatrix, cgl.mMatrix, this.mat);\n            this._animMat = null;\n        }\n        else\n        {\n            this._animMat = this._animMat || mat4.create();\n            mat4.identity(this._animMat);\n\n            const playAnims = true;\n\n            if (playAnims && this._animTrans)\n            {\n                mat4.translate(this._animMat, this._animMat, [\n                    this._animTrans[0].getValue(_time),\n                    this._animTrans[1].getValue(_time),\n                    this._animTrans[2].getValue(_time)]);\n            }\n            else\n            if (this._node.translation) mat4.translate(this._animMat, this._animMat, this._node.translation);\n\n            if (playAnims && this._animRot)\n            {\n                if (this._animRot[0].defaultEasing == CABLES.EASING_LINEAR) CABLES.Anim.slerpQuaternion(_time, this._tempQuat, this._animRot[0], this._animRot[1], this._animRot[2], this._animRot[3]);\n                else if (this._animRot[0].defaultEasing == CABLES.EASING_ABSOLUTE)\n                {\n                    this._tempQuat[0] = this._animRot[0].getValue(_time);\n                    this._tempQuat[1] = this._animRot[1].getValue(_time);\n                    this._tempQuat[2] = this._animRot[2].getValue(_time);\n                    this._tempQuat[3] = this._animRot[3].getValue(_time);\n                }\n                else if (this._animRot[0].defaultEasing == CABLES.EASING_CUBICSPLINE)\n                {\n                    CABLES.Anim.slerpQuaternion(_time, this._tempQuat, this._animRot[0], this._animRot[1], this._animRot[2], this._animRot[3]);\n                }\n\n                mat4.fromQuat(this._tempMat, this._tempQuat);\n                mat4.mul(this._animMat, this._animMat, this._tempMat);\n            }\n            else if (this._rot)\n            {\n                mat4.fromQuat(this._tempRotmat, this._rot);\n                mat4.mul(this._animMat, this._animMat, this._tempRotmat);\n            }\n\n            if (playAnims && this._animScale)\n            {\n                if (!this._tempAnimScale) this._tempAnimScale = [1, 1, 1];\n                this._tempAnimScale[0] = this._animScale[0].getValue(_time);\n                this._tempAnimScale[1] = this._animScale[1].getValue(_time);\n                this._tempAnimScale[2] = this._animScale[2].getValue(_time);\n                mat4.scale(this._animMat, this._animMat, this._tempAnimScale);\n            }\n            else if (this._scale) mat4.scale(this._animMat, this._animMat, this._scale);\n\n            mat4.mul(cgl.mMatrix, cgl.mMatrix, this._animMat);\n        }\n\n        if (this.animWeights)\n        {\n            this.weights = this.weights || [];\n\n            let str = \"\";\n            for (let i = 0; i < this.animWeights.length; i++)\n            {\n                this.weights[i] = this.animWeights[i].getValue(_time);\n                str += this.weights[i] + \"/\";\n            }\n\n            // console.log(str);\n            // this.mesh.weights=this.animWeights.get(_time);\n            // console.log(this.animWeights);\n        }\n\n        if (this.addTranslate) mat4.translate(cgl.mMatrix, cgl.mMatrix, this.addTranslate);\n\n        if (this.addMulMat) mat4.mul(cgl.mMatrix, cgl.mMatrix, this.addMulMat);\n\n        mat4.copy(this.absMat, cgl.mMatrix);\n    }\n\n    render(cgl, dontTransform, dontDrawMesh, ignoreMaterial, ignoreChilds, drawHidden, _time)\n    {\n        if (!dontTransform) cgl.pushModelMatrix();\n\n        if (_time === undefined) _time = gltf.time;\n\n        if (!dontTransform || this.skinRenderer) this.transform(cgl, _time);\n\n        if (this.hidden && !drawHidden)\n        {\n        }\n        else\n        {\n            if (this.skinRenderer)\n            {\n                this.skinRenderer.time = _time;\n                if (!dontDrawMesh)\n                    this.mesh.render(cgl, ignoreMaterial, this.skinRenderer, _time, this.weights);\n            }\n            else\n            {\n                if (this.mesh && !dontDrawMesh)\n                    this.mesh.render(cgl, ignoreMaterial, null, _time, this.weights);\n            }\n        }\n\n        if (!ignoreChilds && !this.hidden)\n            for (let i = 0; i < this.children.length; i++)\n                if (gltf.nodes[this.children[i]])\n                    gltf.nodes[this.children[i]].render(cgl, dontTransform, dontDrawMesh, ignoreMaterial, ignoreChilds, drawHidden, _time);\n\n        if (!dontTransform)cgl.popModelMatrix();\n    }\n};\n","inc_print_js":"let tab = null;\n\nfunction closeTab()\n{\n    if (tab)gui.mainTabs.closeTab(tab.id);\n    tab = null;\n}\n\nfunction formatVec(arr)\n{\n    const nums = [];\n    for (let i = 0; i < arr.length; i++)\n    {\n        nums.push(Math.round(arr[i] * 1000) / 1000);\n    }\n\n    return nums.join(\",\");\n}\n\nfunction printNode(html, node, level)\n{\n    if (!gltf) return;\n\n    html += \"<tr class=\\\"row\\\">\";\n\n    let ident = \"\";\n    let identSpace = \"\";\n\n    for (let i = 1; i < level; i++)\n    {\n        identSpace += \"&nbsp;&nbsp;&nbsp;\";\n        let identClass = \"identBg\";\n        if (i == 1)identClass = \"identBgLevel0\";\n        ident += \"<td class=\\\"ident \" + identClass + \"\\\" ><div style=\\\"\\\"></div></td>\";\n    }\n    let id = CABLES.uuid();\n    html += ident;\n    html += \"<td colspan=\\\"\" + (21 - level) + \"\\\">\";\n\n    if (node.mesh && node.mesh.meshes.length)html += \"<span class=\\\"icon icon-cube\\\"></span>&nbsp;\";\n    else html += \"<span class=\\\"icon icon-box-select\\\"></span> &nbsp;\";\n\n    html += node.name + \"</td><td></td>\";\n\n    if (node.mesh)\n    {\n        html += \"<td>\";\n        for (let i = 0; i < node.mesh.meshes.length; i++)\n        {\n            if (i > 0)html += \", \";\n            html += node.mesh.meshes[i].name;\n        }\n\n        html += \"</td>\";\n\n        html += \"<td>\";\n        html += node.hasSkin() || \"-\";\n        html += \"</td>\";\n\n        html += \"<td>\";\n        let countMats = 0;\n        for (let i = 0; i < node.mesh.meshes.length; i++)\n        {\n            if (countMats > 0)html += \", \";\n            if (gltf.json.materials && node.mesh.meshes[i].hasOwnProperty(\"material\"))\n            {\n                if (gltf.json.materials[node.mesh.meshes[i].material])\n                {\n                    html += gltf.json.materials[node.mesh.meshes[i].material].name;\n                    countMats++;\n                }\n            }\n        }\n        if (countMats == 0)html += \"none\";\n        html += \"</td>\";\n    }\n    else\n    {\n        html += \"<td>-</td><td>-</td><td>-</td>\";\n    }\n\n    html += \"<td>\";\n\n    if (node._node.translation || node._node.rotation || node._node.scale)\n    {\n        let info = \"\";\n\n        if (node._node.translation)info += \"Translate: `\" + formatVec(node._node.translation) + \"` || \";\n        if (node._node.rotation)info += \"Rotation: `\" + formatVec(node._node.rotation) + \"` || \";\n        if (node._node.scale)info += \"Scale: `\" + formatVec(node._node.scale) + \"` || \";\n\n        html += \"<span class=\\\"icon icon-gizmo info\\\" data-info=\\\"\" + info + \"\\\"></span> &nbsp;\";\n    }\n\n    if (node._animRot || node._animScale || node._animTrans)\n    {\n        let info = \"Animated: \";\n        if (node._animRot) info += \"Rot \";\n        if (node._animScale) info += \"Scale \";\n        if (node._animTrans) info += \"Trans \";\n\n        html += \"<span class=\\\"icon icon-clock info\\\" data-info=\\\"\" + info + \"\\\"></span>&nbsp;\";\n    }\n\n    if (!node._node.translation && !node._node.rotation && !node._node.scale && !node._animRot && !node._animScale && !node._animTrans) html += \"-\";\n\n    html += \"</td>\";\n\n    html += \"<td>\";\n    let hideclass = \"\";\n    if (node.hidden)hideclass = \"node-hidden\";\n\n    // html+='';\n    html += \"<a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeNode('\" + node.name + \"','transform')\\\" class=\\\"treebutton\\\">Transform</a>\";\n    html += \" <a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeNode('\" + node.name + \"','hierarchy')\\\" class=\\\"treebutton\\\">Hierarchy</a>\";\n    html += \" <a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeNode('\" + node.name + \"')\\\" class=\\\"treebutton\\\">Node</a>\";\n\n    if (node.hasSkin())\n        html += \" <a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeNode('\" + node.name + \"',false,{skin:true});\\\" class=\\\"treebutton\\\">Skin</a>\";\n\n    html += \"</td><td>\";\n    html += \"&nbsp;<span class=\\\"icon iconhover icon-eye \" + hideclass + \"\\\" onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').toggleNodeVisibility('\" + node.name + \"');this.classList.toggle('node-hidden');\\\"></span>\";\n    html += \"</td>\";\n\n    html += \"</tr>\";\n\n    if (node.children)\n    {\n        for (let i = 0; i < node.children.length; i++)\n            html = printNode(html, gltf.nodes[node.children[i]], level + 1);\n    }\n\n    return html;\n}\n\nfunction printMaterial(mat, idx)\n{\n    let html = \"<tr>\";\n    html += \" <td>\" + idx + \"</td>\";\n    html += \" <td>\" + mat.name + \"</td>\";\n\n    html += \" <td>\";\n\n    const info = JSON.stringify(mat, null, 4).replaceAll(\"\\\"\", \"\").replaceAll(\"\\n\", \"<br/>\");\n\n    html += \"<span class=\\\"icon icon-info\\\" onclick=\\\"new CABLES.UI.ModalDialog({ 'html': '<pre>\" + info + \"</pre>', 'title': '\" + mat.name + \"' });\\\"></span>&nbsp;\";\n\n    if (mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorFactor)\n    {\n        let rgb = \"\";\n        rgb += \"\" + Math.round(mat.pbrMetallicRoughness.baseColorFactor[0] * 255);\n        rgb += \",\" + Math.round(mat.pbrMetallicRoughness.baseColorFactor[1] * 255);\n        rgb += \",\" + Math.round(mat.pbrMetallicRoughness.baseColorFactor[2] * 255);\n\n        html += \"<div style=\\\"width:15px;height:15px;background-color:rgb(\" + rgb + \");display:inline-block\\\">&nbsp;</a>\";\n    }\n    html += \" <td style=\\\"\\\">\" + (gltf.shaders[idx] ? \"-\" : \"<a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').assignMaterial('\" + mat.name + \"')\\\" class=\\\"treebutton\\\">Assign</a>\") + \"<td>\";\n    html += \"<td>\";\n\n    html += \"</tr>\";\n    return html;\n}\n\nfunction printInfo()\n{\n    if (!gltf) return;\n\n    const startTime = performance.now();\n    const sizes = {};\n    let html = \"<div style=\\\"overflow:scroll;width:100%;height:100%\\\">\";\n\n    html += \"File: <a href=\\\"\" + CABLES.sandbox.getCablesUrl() + \"/asset/patches/?filename=\" + inFile.get() + \"\\\" target=\\\"_blank\\\">\" + CABLES.basename(inFile.get()) + \"</a><br/>\";\n\n    html += \"Generator:\" + gltf.json.asset.generator;\n\n    let numNodes = 0;\n    if (gltf.json.nodes)numNodes = gltf.json.nodes.length;\n    html += \"<div id=\\\"groupNodes\\\">Nodes (\" + numNodes + \")</div>\";\n\n    html += \"<table id=\\\"sectionNodes\\\" class=\\\"table treetable\\\">\";\n\n    html += \"<tr>\";\n    html += \" <th colspan=\\\"21\\\">Name</th>\";\n    html += \" <th>Mesh</th>\";\n    html += \" <th>Skin</th>\";\n    html += \" <th>Material</th>\";\n    html += \" <th>Transform</th>\";\n    html += \" <th>Expose</th>\";\n    html += \" <th></th>\";\n    html += \"</tr>\";\n\n    for (let i = 0; i < gltf.nodes.length; i++)\n    {\n        if (!gltf.nodes[i].isChild)\n            html = printNode(html, gltf.nodes[i], 1);\n    }\n    html += \"</table>\";\n\n    // / //////////////////\n\n    let numMaterials = 0;\n    if (gltf.json.materials)numMaterials = gltf.json.materials.length;\n    html += \"<div id=\\\"groupMaterials\\\">Materials (\" + numMaterials + \")</div>\";\n\n    if (!gltf.json.materials || gltf.json.materials.length == 0)\n    {\n    }\n    else\n    {\n        html += \"<table id=\\\"materialtable\\\"  class=\\\"table treetable\\\">\";\n        html += \"<tr>\";\n        html += \" <th>Index</th>\";\n        html += \" <th>Name</th>\";\n        html += \" <th>Color</th>\";\n        html += \" <th>Function</th>\";\n        html += \" <th></th>\";\n        html += \"</tr>\";\n        for (let i = 0; i < gltf.json.materials.length; i++)\n        {\n            html += printMaterial(gltf.json.materials[i], i);\n        }\n        html += \"</table>\";\n    }\n\n    // / ///////////////////////\n\n    html += \"<div id=\\\"groupMeshes\\\">Meshes (\" + gltf.json.meshes.length + \")</div>\";\n\n    html += \"<table id=\\\"meshestable\\\"  class=\\\"table treetable\\\">\";\n    html += \"<tr>\";\n    html += \" <th>Name</th>\";\n    html += \" <th>Node</th>\";\n    html += \" <th>Material</th>\";\n    html += \" <th>Vertices</th>\";\n    html += \" <th>Attributes</th>\";\n    html += \"</tr>\";\n\n    let sizeBufferViews = [];\n    sizes.meshes = 0;\n    sizes.meshTargets = 0;\n\n    for (let i = 0; i < gltf.json.meshes.length; i++)\n    {\n        html += \"<tr>\";\n        html += \"<td>\" + gltf.json.meshes[i].name + \"</td>\";\n\n        html += \"<td>\";\n        let count = 0;\n        let nodename = \"\";\n        for (let j = 0; j < gltf.json.nodes.length; j++)\n        {\n            if (gltf.json.nodes[j].mesh == i)\n            {\n                count++;\n                if (count == 1)\n                {\n                    nodename = gltf.json.nodes[j].name;\n                }\n            }\n        }\n        if (count > 1) html += (count) + \" nodes (\" + nodename + \" ...)\";\n        else html += nodename;\n        html += \"</td>\";\n\n        // -------\n\n        html += \"<td>\";\n        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)\n        {\n            if (gltf.json.meshes[i].primitives[j].hasOwnProperty(\"material\"))\n            {\n                if (gltf.json.materials[gltf.json.meshes[i]])\n                {\n                    html += gltf.json.materials[gltf.json.meshes[i].primitives[j].material].name + \" \";\n                }\n            }\n            else html += \"None\";\n        }\n        html += \"</td>\";\n\n        html += \"<td>\";\n        let numVerts = 0;\n        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)\n        {\n            if (gltf.json.meshes[i].primitives[j].attributes.POSITION != undefined)\n            {\n                let v = parseInt(gltf.json.accessors[gltf.json.meshes[i].primitives[j].attributes.POSITION].count);\n                numVerts += v;\n                html += \"\" + v + \"<br/>\";\n            }\n            else html += \"-<br/>\";\n        }\n\n        if (gltf.json.meshes[i].primitives.length > 1)\n            html += \"=\" + numVerts;\n        html += \"</td>\";\n\n        html += \"<td>\";\n        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)\n        {\n            html += Object.keys(gltf.json.meshes[i].primitives[j].attributes);\n            html += \" <a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeGeom('\" + gltf.json.meshes[i].name + \"',\" + j + \")\\\" class=\\\"treebutton\\\">Geometry</a>\";\n            html += \"<br/>\";\n\n            if (gltf.json.meshes[i].primitives[j].targets)\n            {\n                html += gltf.json.meshes[i].primitives[j].targets.length + \" targets<br/>\";\n\n                if (gltf.json.meshes[i].extras && gltf.json.meshes[i].extras.targetNames)\n                    html += \"Targetnames:<br/>\" + gltf.json.meshes[i].extras.targetNames.join(\"<br/>\");\n\n                html += \"<br/>\";\n            }\n        }\n\n        html += \"</td>\";\n        html += \"</tr>\";\n\n        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)\n        {\n            const accessor = gltf.json.accessors[gltf.json.meshes[i].primitives[j].indices];\n            if (accessor)\n            {\n                let bufView = accessor.bufferView;\n\n                if (sizeBufferViews.indexOf(bufView) == -1)\n                {\n                    sizeBufferViews.push(bufView);\n                    if (gltf.json.bufferViews[bufView])sizes.meshes += gltf.json.bufferViews[bufView].byteLength;\n                }\n            }\n\n            for (let k in gltf.json.meshes[i].primitives[j].attributes)\n            {\n                const attr = gltf.json.meshes[i].primitives[j].attributes[k];\n                const bufView2 = gltf.json.accessors[attr].bufferView;\n\n                if (sizeBufferViews.indexOf(bufView2) == -1)\n                {\n                    sizeBufferViews.push(bufView2);\n                    if (gltf.json.bufferViews[bufView2])sizes.meshes += gltf.json.bufferViews[bufView2].byteLength;\n                }\n            }\n\n            if (gltf.json.meshes[i].primitives[j].targets)\n                for (let k = 0; k < gltf.json.meshes[i].primitives[j].targets.length; k++)\n                {\n                    for (let l in gltf.json.meshes[i].primitives[j].targets[k])\n                    {\n                        const accessorIdx = gltf.json.meshes[i].primitives[j].targets[k][l];\n                        const accessor = gltf.json.accessors[accessorIdx];\n                        const bufView2 = accessor.bufferView;\n                        console.log(\"accessor\", accessor);\n                        if (sizeBufferViews.indexOf(bufView2) == -1)\n                            if (gltf.json.bufferViews[bufView2])\n                            {\n                                sizeBufferViews.push(bufView2);\n                                sizes.meshTargets += gltf.json.bufferViews[bufView2].byteLength;\n                            }\n                    }\n                }\n        }\n    }\n    html += \"</table>\";\n\n    // / //////////////////////////////////\n\n    let numSamplers = 0;\n    let numAnims = 0;\n    let numKeyframes = 0;\n\n    if (gltf.json.animations)\n    {\n        numAnims = gltf.json.animations.length;\n        for (let i = 0; i < gltf.json.animations.length; i++)\n        {\n            numSamplers += gltf.json.animations[i].samplers.length;\n        }\n    }\n\n    html += \"<div id=\\\"groupAnims\\\">Animations (\" + numAnims + \"/\" + numSamplers + \")</div>\";\n\n    if (gltf.json.animations)\n    {\n        html += \"<table id=\\\"sectionAnim\\\" class=\\\"table treetable\\\">\";\n        html += \"<tr>\";\n        html += \"  <th>Name</th>\";\n        html += \"  <th>Target node</th>\";\n        html += \"  <th>Path</th>\";\n        html += \"  <th>Interpolation</th>\";\n        html += \"  <th>Keys</th>\";\n        html += \"</tr>\";\n\n\n        sizes.animations = 0;\n\n        for (let i = 0; i < gltf.json.animations.length; i++)\n        {\n            for (let j = 0; j < gltf.json.animations[i].samplers.length; j++)\n            {\n                let bufView = gltf.json.accessors[gltf.json.animations[i].samplers[j].input].bufferView;\n                if (sizeBufferViews.indexOf(bufView) == -1)\n                {\n                    sizeBufferViews.push(bufView);\n                    sizes.animations += gltf.json.bufferViews[bufView].byteLength;\n                }\n\n                bufView = gltf.json.accessors[gltf.json.animations[i].samplers[j].output].bufferView;\n                if (sizeBufferViews.indexOf(bufView) == -1)\n                {\n                    sizeBufferViews.push(bufView);\n                    sizes.animations += gltf.json.bufferViews[bufView].byteLength;\n                }\n            }\n\n            for (let j = 0; j < gltf.json.animations[i].channels.length; j++)\n            {\n                html += \"<tr>\";\n                html += \"  <td> Anim \" + i + \": \" + gltf.json.animations[i].name + \"</td>\";\n\n                html += \"  <td>\" + gltf.nodes[gltf.json.animations[i].channels[j].target.node].name + \"</td>\";\n                html += \"  <td>\";\n                html += gltf.json.animations[i].channels[j].target.path + \" \";\n                html += \"  </td>\";\n\n                const smplidx = gltf.json.animations[i].channels[j].sampler;\n                const smplr = gltf.json.animations[i].samplers[smplidx];\n\n                html += \"  <td>\" + smplr.interpolation + \"</td>\";\n\n                html += \"  <td>\" + gltf.json.accessors[smplr.output].count;\n                numKeyframes += gltf.json.accessors[smplr.output].count;\n\n                // html += \"&nbsp;&nbsp;<a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').showAnim('\" + i + \"','\" + j + \"')\\\" class=\\\"icon icon-search\\\"></a>\";\n\n                html += \"</td>\";\n\n                html += \"</tr>\";\n            }\n        }\n\n        html += \"<tr>\";\n        html += \"  <td></td>\";\n        html += \"  <td></td>\";\n        html += \"  <td></td>\";\n        html += \"  <td></td>\";\n        html += \"  <td>\" + numKeyframes + \" total</td>\";\n        html += \"</tr>\";\n        html += \"</table>\";\n    }\n    else\n    {\n\n    }\n\n    // / ///////////////////\n\n    let numImages = 0;\n    if (gltf.json.images)numImages = gltf.json.images.length;\n    html += \"<div id=\\\"groupImages\\\">Images (\" + numImages + \")</div>\";\n\n    if (gltf.json.images)\n    {\n        html += \"<table id=\\\"sectionImages\\\" class=\\\"table treetable\\\">\";\n\n        html += \"<tr>\";\n        html += \"  <th>name</th>\";\n        html += \"  <th>type</th>\";\n        html += \"  <th>func</th>\";\n        html += \"</tr>\";\n\n        sizes.images = 0;\n\n        for (let i = 0; i < gltf.json.images.length; i++)\n        {\n            if (gltf.json.images[i].hasOwnProperty(\"bufferView\"))\n            {\n                // if (sizeBufferViews.indexOf(gltf.json.images[i].hasOwnProperty(\"bufferView\")) == -1)console.log(\"image bufferview already there?!\");\n                // else\n                sizes.images += gltf.json.bufferViews[gltf.json.images[i].bufferView].byteLength;\n            }\n            else console.log(\"image has no bufferview?!\");\n\n            html += \"<tr>\";\n            html += \"<td>\" + gltf.json.images[i].name + \"</td>\";\n            html += \"<td>\" + gltf.json.images[i].mimeType + \"</td>\";\n            html += \"<td>\";\n\n            let name = gltf.json.images[i].name;\n            if (name === undefined)name = gltf.json.images[i].bufferView;\n\n            html += \"<a onclick=\\\"gui.corePatch().getOpById('\" + op.id + \"').exposeTexture('\" + name + \"')\\\" class=\\\"treebutton\\\">Expose</a>\";\n            html += \"</td>\";\n\n            html += \"<tr>\";\n        }\n        html += \"</table>\";\n    }\n\n    // / ///////////////////////\n\n    let numCameras = 0;\n    if (gltf.json.cameras)numCameras = gltf.json.cameras.length;\n    html += \"<div id=\\\"groupCameras\\\">Cameras (\" + numCameras + \")</div>\";\n\n    if (gltf.json.cameras)\n    {\n        html += \"<table id=\\\"sectionCameras\\\" class=\\\"table treetable\\\">\";\n\n        html += \"<tr>\";\n        html += \"  <th>name</th>\";\n        html += \"  <th>type</th>\";\n        html += \"  <th>info</th>\";\n        html += \"</tr>\";\n\n        for (let i = 0; i < gltf.json.cameras.length; i++)\n        {\n            html += \"<tr>\";\n            html += \"<td>\" + gltf.json.cameras[i].name + \"</td>\";\n            html += \"<td>\" + gltf.json.cameras[i].type + \"</td>\";\n            html += \"<td>\";\n\n            if (gltf.json.cameras[i].perspective)\n            {\n                html += \"yfov: \" + Math.round(gltf.json.cameras[i].perspective.yfov * 100) / 100;\n                html += \", \";\n                html += \"zfar: \" + Math.round(gltf.json.cameras[i].perspective.zfar * 100) / 100;\n                html += \", \";\n                html += \"znear: \" + Math.round(gltf.json.cameras[i].perspective.znear * 100) / 100;\n            }\n            html += \"</td>\";\n\n            html += \"<tr>\";\n        }\n        html += \"</table>\";\n    }\n\n    // / ////////////////////////////////////\n\n    let numSkins = 0;\n    if (gltf.json.skins)numSkins = gltf.json.skins.length;\n    html += \"<div id=\\\"groupSkins\\\">Skins (\" + numSkins + \")</div>\";\n\n    if (gltf.json.skins)\n    {\n        // html += \"<h3>Skins (\" + gltf.json.skins.length + \")</h3>\";\n        html += \"<table id=\\\"sectionSkins\\\" class=\\\"table treetable\\\">\";\n\n        html += \"<tr>\";\n        html += \"  <th>name</th>\";\n        html += \"  <th></th>\";\n        html += \"  <th>total joints</th>\";\n        html += \"</tr>\";\n\n        for (let i = 0; i < gltf.json.skins.length; i++)\n        {\n            html += \"<tr>\";\n            html += \"<td>\" + gltf.json.skins[i].name + \"</td>\";\n            html += \"<td>\" + \"</td>\";\n            html += \"<td>\" + gltf.json.skins[i].joints.length + \"</td>\";\n            html += \"<td>\";\n            html += \"</td>\";\n            html += \"<tr>\";\n        }\n        html += \"</table>\";\n    }\n\n    // / ////////////////////////////////////\n\n    if (gltf.timing)\n    {\n        html += \"<div id=\\\"groupTiming\\\">Debug Loading Timing </div>\";\n\n        html += \"<table id=\\\"sectionTiming\\\" class=\\\"table treetable\\\">\";\n\n        html += \"<tr>\";\n        html += \"  <th>task</th>\";\n        html += \"  <th>time used</th>\";\n        html += \"</tr>\";\n\n        let lt = 0;\n        for (let i = 0; i < gltf.timing.length - 1; i++)\n        {\n            html += \"<tr>\";\n            html += \"  <td>\" + gltf.timing[i][0] + \"</td>\";\n            html += \"  <td>\" + (gltf.timing[i + 1][1] - gltf.timing[i][1]) + \" ms</td>\";\n            html += \"</tr>\";\n            // lt = gltf.timing[i][1];\n        }\n        html += \"</table>\";\n    }\n\n    // / //////////////////////////\n\n    let sizeBin = 0;\n    if (gltf.json.buffers)\n        sizeBin = gltf.json.buffers[0].byteLength;\n\n    html += \"<div id=\\\"groupBinary\\\">File Size Allocation (\" + Math.round(sizeBin / 1024) + \"k )</div>\";\n\n    html += \"<table id=\\\"sectionBinary\\\" class=\\\"table treetable\\\">\";\n    html += \"<tr>\";\n    html += \"  <th>name</th>\";\n    html += \"  <th>size</th>\";\n    html += \"  <th>%</th>\";\n    html += \"</tr>\";\n    let sizeUnknown = sizeBin;\n    for (let i in sizes)\n    {\n        // html+=i+':'+Math.round(sizes[i]/1024);\n        html += \"<tr>\";\n        html += \"<td>\" + i + \"</td>\";\n        html += \"<td>\" + readableSize(sizes[i]) + \" </td>\";\n        html += \"<td>\" + Math.round(sizes[i] / sizeBin * 100) + \"% </td>\";\n        html += \"<tr>\";\n        sizeUnknown -= sizes[i];\n    }\n\n    if (sizeUnknown != 0)\n    {\n        html += \"<tr>\";\n        html += \"<td>unknown</td>\";\n        html += \"<td>\" + readableSize(sizeUnknown) + \" </td>\";\n        html += \"<td>\" + Math.round(sizeUnknown / sizeBin * 100) + \"% </td>\";\n        html += \"<tr>\";\n    }\n\n    html += \"</table>\";\n    html += \"</div>\";\n\n    tab = new CABLES.UI.Tab(\"GLTF \" + CABLES.basename(inFile.get()), { \"icon\": \"cube\", \"infotext\": \"tab_gltf\", \"padding\": true, \"singleton\": true });\n    gui.mainTabs.addTab(tab, true);\n\n    tab.addEventListener(\"close\", closeTab);\n    tab.html(html);\n\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupNodes\"), ele.byId(\"sectionNodes\"), false);\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupMaterials\"), ele.byId(\"materialtable\"), true);\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupAnims\"), ele.byId(\"sectionAnim\"), true);\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupMeshes\"), ele.byId(\"meshestable\"), true);\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupCameras\"), ele.byId(\"sectionCameras\"), true);\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupImages\"), ele.byId(\"sectionImages\"), true);\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupSkins\"), ele.byId(\"sectionSkins\"), true);\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupBinary\"), ele.byId(\"sectionBinary\"), true);\n    CABLES.UI.Collapsable.setup(ele.byId(\"groupTiming\"), ele.byId(\"sectionTiming\"), true);\n\n    gui.maintabPanel.show(true);\n}\n\nfunction readableSize(n)\n{\n    if (n > 1024) return Math.round(n / 1024) + \" kb\";\n    if (n > 1024 * 500) return Math.round(n / 1024) + \" mb\";\n    else return n + \" bytes\";\n}\n","inc_skin_js":"const GltfSkin = class\n{\n    constructor(node)\n    {\n        this._mod = null;\n        this._node = node;\n        this._lastTime = 0;\n        this._matArr = [];\n        this._m = mat4.create();\n        this._invBindMatrix = mat4.create();\n        this.identity = true;\n    }\n\n    renderFinish(cgl)\n    {\n        cgl.popModelMatrix();\n        this._mod.unbind();\n    }\n\n    renderStart(cgl, time)\n    {\n        if (!this._mod)\n        {\n            this._mod = new CGL.ShaderModifier(cgl, op.name + this._node.name);\n\n            this._mod.addModule({\n                \"priority\": -2,\n                \"name\": \"MODULE_VERTEX_POSITION\",\n                \"srcHeadVert\": attachments.skin_head_vert || \"\",\n                \"srcBodyVert\": attachments.skin_vert || \"\"\n            });\n\n            this._mod.addUniformVert(\"m4[]\", \"MOD_boneMats\", []);// bohnenmatze\n            const tr = vec3.create();\n        }\n\n        const skinIdx = this._node.skin;\n        const arrLength = gltf.json.skins[skinIdx].joints.length * 16;\n\n        // if (this._lastTime != time || !time)\n        {\n            // this._lastTime=inTime.get();\n            if (this._matArr.length != arrLength) this._matArr.length = arrLength;\n\n            for (let i = 0; i < gltf.json.skins[skinIdx].joints.length; i++)\n            {\n                const i16 = i * 16;\n                const jointIdx = gltf.json.skins[skinIdx].joints[i];\n                const nodeJoint = gltf.nodes[jointIdx];\n\n                for (let j = 0; j < 16; j++)\n                    this._invBindMatrix[j] = gltf.accBuffers[gltf.json.skins[skinIdx].inverseBindMatrices][i16 + j];\n\n                mat4.mul(this._m, nodeJoint.modelMatAbs(), this._invBindMatrix);\n\n                for (let j = 0; j < this._m.length; j++) this._matArr[i16 + j] = this._m[j];\n            }\n\n            this._mod.setUniformValue(\"MOD_boneMats\", this._matArr);\n            this._lastTime = time;\n        }\n\n        this._mod.define(\"SKIN_NUM_BONES\", gltf.json.skins[skinIdx].joints.length);\n        this._mod.bind();\n\n        // draw mesh...\n        cgl.pushModelMatrix();\n        if (this.identity)mat4.identity(cgl.mMatrix);\n    }\n};\n","inc_targets_js":"const GltfTargetsRenderer = class\n{\n    constructor(mesh)\n    {\n        this.mesh = mesh;\n        this.tex = null;\n        this.numRowsPerTarget = 0;\n\n        this.makeTex(mesh.geom);\n    }\n\n    renderFinish(cgl)\n    {\n        cgl.popModelMatrix();\n        this._mod.unbind();\n    }\n\n    renderStart(cgl, time)\n    {\n        if (!this._mod)\n        {\n            this._mod = new CGL.ShaderModifier(cgl, \"gltftarget\");\n\n            this._mod.addModule({\n                \"priority\": -2,\n                \"name\": \"MODULE_VERTEX_POSITION\",\n                \"srcHeadVert\": attachments.targets_head_vert || \"\",\n                \"srcBodyVert\": attachments.targets_vert || \"\"\n            });\n\n            this._mod.addUniformVert(\"4f\", \"MOD_targetTexInfo\", [0, 0, 0, 0]);\n            this._mod.addUniformVert(\"t\", \"MOD_targetTex\", 1);\n            this._mod.addUniformVert(\"f[]\", \"MOD_weights\", []);\n\n            const tr = vec3.create();\n        }\n\n        this._mod.pushTexture(\"MOD_targetTex\", this.tex);\n        if (this.tex && this.mesh.weights)\n        {\n            this._mod.setUniformValue(\"MOD_weights\", this.mesh.weights);\n            this._mod.setUniformValue(\"MOD_targetTexInfo\", [this.tex.width, this.tex.height, this.numRowsPerTarget, this.mesh.weights.length]);\n\n            this._mod.define(\"MOD_NUM_WEIGHTS\", Math.max(1, this.mesh.weights.length));\n        }\n        else\n        {\n            this._mod.define(\"MOD_NUM_WEIGHTS\", 1);\n        }\n        this._mod.bind();\n\n        // draw mesh...\n        cgl.pushModelMatrix();\n        if (this.identity)mat4.identity(cgl.mMatrix);\n    }\n\n    makeTex(geom)\n    {\n        if (!geom.morphTargets || !geom.morphTargets.length) return;\n\n        let w = geom.morphTargets[0].vertices.length / 3;\n        let h = 0;\n        this.numRowsPerTarget = 0;\n\n        if (geom.morphTargets[0].vertices && geom.morphTargets[0].vertices.length) this.numRowsPerTarget++;\n        if (geom.morphTargets[0].vertexNormals && geom.morphTargets[0].vertexNormals.length) this.numRowsPerTarget++;\n        if (geom.morphTargets[0].tangents && geom.morphTargets[0].tangents.length) this.numRowsPerTarget++;\n        if (geom.morphTargets[0].bitangents && geom.morphTargets[0].bitangents.length) this.numRowsPerTarget++;\n\n        h = geom.morphTargets.length * this.numRowsPerTarget;\n\n        // console.log(\"this.numRowsPerTarget\", this.numRowsPerTarget);\n\n        const pixels = new Float32Array(w * h * 4);\n        let row = 0;\n\n        for (let i = 0; i < geom.morphTargets.length; i++)\n        {\n            if (geom.morphTargets[i].vertices && geom.morphTargets[i].vertices.length)\n            {\n                for (let j = 0; j < geom.morphTargets[i].vertices.length; j += 3)\n                {\n                    pixels[((row * w) + (j / 3)) * 4 + 0] = geom.morphTargets[i].vertices[j + 0];\n                    pixels[((row * w) + (j / 3)) * 4 + 1] = geom.morphTargets[i].vertices[j + 1];\n                    pixels[((row * w) + (j / 3)) * 4 + 2] = geom.morphTargets[i].vertices[j + 2];\n                    pixels[((row * w) + (j / 3)) * 4 + 3] = 1;\n                }\n                row++;\n            }\n\n            if (geom.morphTargets[i].vertexNormals && geom.morphTargets[i].vertexNormals.length)\n            {\n                for (let j = 0; j < geom.morphTargets[i].vertexNormals.length; j += 3)\n                {\n                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].vertexNormals[j + 0];\n                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].vertexNormals[j + 1];\n                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].vertexNormals[j + 2];\n                    pixels[(row * w + j / 3) * 4 + 3] = 1;\n                }\n\n                row++;\n            }\n\n            if (geom.morphTargets[i].tangents && geom.morphTargets[i].tangents.length)\n            {\n                for (let j = 0; j < geom.morphTargets[i].tangents.length; j += 3)\n                {\n                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].tangents[j + 0];\n                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].tangents[j + 1];\n                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].tangents[j + 2];\n                    pixels[(row * w + j / 3) * 4 + 3] = 1;\n                }\n                row++;\n            }\n\n            if (geom.morphTargets[i].bitangents && geom.morphTargets[i].bitangents.length)\n            {\n                for (let j = 0; j < geom.morphTargets[i].bitangents.length; j += 3)\n                {\n                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].bitangents[j + 0];\n                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].bitangents[j + 1];\n                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].bitangents[j + 2];\n                    pixels[(row * w + j / 3) * 4 + 3] = 1;\n                }\n                row++;\n            }\n        }\n\n        this.tex = new CGL.Texture(cgl, { \"isFloatingPointTexture\": true, \"name\": \"targetsTexture\" });\n\n        this.tex.initFromData(pixels, w, h, CGL.Texture.FILTER_LINEAR, CGL.Texture.WRAP_REPEAT);\n\n        // console.log(\"morphTargets generated texture\", w, h);\n    }\n};\n","skin_vert":"int index=int(attrJoints.x);\nvec4 newPos = (MOD_boneMats[index] * pos) * attrWeights.x;\nvec3 newNorm = (vec4((MOD_boneMats[index] * vec4(norm.xyz, 0.0)) * attrWeights.x).xyz);\n\nindex=int(attrJoints.y);\nnewPos += (MOD_boneMats[index] * pos) * attrWeights.y;\nnewNorm = (vec4((MOD_boneMats[index] * vec4(norm.xyz, 0.0)) * attrWeights.y).xyz)+newNorm;\n\nindex=int(attrJoints.z);\nnewPos += (MOD_boneMats[index] * pos) * attrWeights.z;\nnewNorm = (vec4((MOD_boneMats[index] * vec4(norm.xyz, 0.0)) * attrWeights.z).xyz)+newNorm;\n\nindex=int(attrJoints.w);\nnewPos += (MOD_boneMats[index] * pos) * attrWeights.w ;\nnewNorm = (vec4((MOD_boneMats[index] * vec4(norm.xyz, 0.0)) * attrWeights.w).xyz)+newNorm;\n\npos=newPos;\n\nnorm=normalize(newNorm.xyz);\n\n\n","skin_head_vert":"\nIN vec4 attrWeights;\nIN vec4 attrJoints;\nUNI mat4 MOD_boneMats[SKIN_NUM_BONES];\n","targets_vert":"\n\nfloat MOD_width=MOD_targetTexInfo.x;\nfloat MOD_height=MOD_targetTexInfo.y;\nfloat MOD_numTargets=MOD_targetTexInfo.w;\nfloat MOD_numLinesPerTarget=MOD_height/MOD_numTargets;\n\nfloat halfpix=(1.0/MOD_width)*0.5;\nfloat halfpixy=(1.0/MOD_height)*0.5;\n\nfloat x=(attrVertIndex)/MOD_width+halfpix;\n\nvec3 off=vec3(0.0);\n\nfor(float i=0.0;i<MOD_numTargets;i+=1.0)\n{\n    float y=1.0-((MOD_numLinesPerTarget*i)/MOD_height+halfpixy);\n    vec2 coord=vec2(x,y);\n    vec3 targetXYZ = texture(MOD_targetTex,coord).xyz;\n\n    off+=(targetXYZ*MOD_weights[int(i)]);\n\n\n\n    coord.y+=1.0/MOD_height; // normals are in next row\n    vec3 targetNormal = texture(MOD_targetTex,coord).xyz;\n    norm+=targetNormal*MOD_weights[int(i)];\n\n\n}\n\n// norm=normalize(norm);\npos.xyz+=off;\n","targets_head_vert":"\nUNI float MOD_weights[MOD_NUM_WEIGHTS];\n",};
const gltfCamera = class
{
    constructor(gltf, node)
    {
        this.node = node;
        this.name = node.name;
        // console.log(gltf);
        this.config = gltf.json.cameras[node.camera];

        this.pos = vec3.create();
        this.quat = quat.create();
        this.vCenter = vec3.create();
        this.vUp = vec3.create();
        this.vMat = mat4.create();
    }

    updateAnim(time)
    {
        if (this.node && this.node._animTrans)
        {
            vec3.set(this.pos,
                this.node._animTrans[0].getValue(time),
                this.node._animTrans[1].getValue(time),
                this.node._animTrans[2].getValue(time));

            quat.set(this.quat,
                this.node._animRot[0].getValue(time),
                this.node._animRot[1].getValue(time),
                this.node._animRot[2].getValue(time),
                this.node._animRot[3].getValue(time));
        }
    }

    start(time)
    {
        if (cgl.frameStore.shadowPass) return;

        this.updateAnim(time);
        const asp = cgl.getViewPort()[2] / cgl.getViewPort()[3];

        cgl.pushPMatrix();
        // mat4.perspective(
        //     cgl.pMatrix,
        //     this.config.perspective.yfov*0.5,
        //     asp,
        //     this.config.perspective.znear,
        //     this.config.perspective.zfar);

        cgl.pushViewMatrix();
        // mat4.identity(cgl.vMatrix);

        // if(this.node && this.node.parent)
        // {
        //     console.log(this.node.parent)
        // vec3.add(this.pos,this.pos,this.node.parent._node.translation);
        // vec3.sub(this.vCenter,this.vCenter,this.node.parent._node.translation);
        // mat4.translate(cgl.vMatrix,cgl.vMatrix,
        // [
        //     -this.node.parent._node.translation[0],
        //     -this.node.parent._node.translation[1],
        //     -this.node.parent._node.translation[2]
        // ])
        // }

        // vec3.set(this.vUp, 0, 1, 0);
        // vec3.set(this.vCenter, 0, -1, 0);
        // // vec3.set(this.vCenter, 0, 1, 0);
        // vec3.transformQuat(this.vCenter, this.vCenter, this.quat);
        // vec3.normalize(this.vCenter, this.vCenter);
        // vec3.add(this.vCenter, this.vCenter, this.pos);

        // mat4.lookAt(cgl.vMatrix, this.pos, this.vCenter, this.vUp);

        let mv = mat4.create();
        mat4.invert(mv, this.node.modelMatAbs());

        // console.log(this.node.modelMatAbs());

        this.vMat = mv;

        mat4.identity(cgl.vMatrix);
        // console.log(mv);
        mat4.mul(cgl.vMatrix, cgl.vMatrix, mv);
    }

    end()
    {
        if (cgl.frameStore.shadowPass) return;
        cgl.popPMatrix();
        cgl.popViewMatrix();
    }
};
const le = true; // little endian

const Gltf = class
{
    constructor()
    {
        this.json = {};
        this.accBuffers = [];
        this.meshes = [];
        this.nodes = [];
        this.shaders = [];
        this.timing = [];
        this.cams = [];
        this.startTime = performance.now();
        this.bounds = new CABLES.CG.BoundingBox();
        this.loaded = Date.now();
        this.accBuffersDelete = [];
    }

    getNode(n)
    {
        for (let i = 0; i < this.nodes.length; i++)
        {
            if (this.nodes[i].name == n) return this.nodes[i];
        }
    }

    unHideAll()
    {
        for (let i = 0; i < this.nodes.length; i++)
        {
            this.nodes[i].unHide();
        }
    }
};

function Utf8ArrayToStr(array)
{
    if (window.TextDecoder) return new TextDecoder("utf-8").decode(array);

    let out, i, len, c;
    let char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while (i < len)
    {
        c = array[i++];
        switch (c >> 4)
        {
        case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
        case 12: case 13:
            // 110x xxxx   10xx xxxx
            char2 = array[i++];
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
        case 14:
            // 1110 xxxx  10xx xxxx  10xx xxxx
            char2 = array[i++];
            char3 = array[i++];
            out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
            break;
        }
    }

    return out;
}

function readChunk(dv, bArr, arrayBuffer, offset)
{
    const chunk = {};

    if (offset >= dv.byteLength)
    {
        op.log("could not read chunk...");
        return;
    }
    chunk.size = dv.getUint32(offset + 0, le);

    // chunk.type = new TextDecoder("utf-8").decode(bArr.subarray(offset+4, offset+4+4));
    chunk.type = Utf8ArrayToStr(bArr.subarray(offset + 4, offset + 4 + 4));

    if (chunk.type == "BIN\0")
    {
        // console.log(chunk.size,arrayBuffer.length,offset);
        // try
        // {
        chunk.dataView = new DataView(arrayBuffer, offset + 8, chunk.size);
        // }
        // catch(e)
        // {
        //     chunk.dataView = null;
        //     console.log(e);
        // }
    }
    else
    if (chunk.type == "JSON")
    {
        const json = Utf8ArrayToStr(bArr.subarray(offset + 8, offset + 8 + chunk.size));

        try
        {
            const obj = JSON.parse(json);
            chunk.data = obj;
            outGenerator.set(obj.asset.generator);
        }
        catch (e)
        {
        }
    }
    else
    {
        op.warn("unknown type", chunk.type);
    }

    return chunk;
}

function loadAnims(gltf)
{
    const uniqueAnimNames = {};

    for (let i = 0; i < gltf.json.animations.length; i++)
    {
        const an = gltf.json.animations[i];

        an.name = an.name || "unknown";

        for (let ia = 0; ia < an.channels.length; ia++)
        {
            const chan = an.channels[ia];

            const node = gltf.nodes[chan.target.node];
            const sampler = an.samplers[chan.sampler];

            const acc = gltf.json.accessors[sampler.input];
            const bufferIn = gltf.accBuffers[sampler.input];

            const accOut = gltf.json.accessors[sampler.output];
            const bufferOut = gltf.accBuffers[sampler.output];

            gltf.accBuffersDelete.push(sampler.output, sampler.input);

            if (bufferIn && bufferOut)
            {
                let numComps = 1;
                if (accOut.type === "VEC2")numComps = 2;
                else if (accOut.type === "VEC3")numComps = 3;
                else if (accOut.type === "VEC4")numComps = 4;
                else if (accOut.type === "SCALAR")
                {
                    numComps = bufferOut.length / bufferIn.length; // is this really the way to find out ? cant find any other way,except number of morph targets, but not really connected...
                }
                else op.log("[] UNKNOWN accOut.type", accOut.type);

                const anims = [];

                uniqueAnimNames[an.name] = true;

                for (let k = 0; k < numComps; k++)
                {
                    const newAnim = new CABLES.Anim();
                    // newAnim.name=an.name;
                    anims.push(newAnim);
                }

                if (sampler.interpolation === "LINEAR") {}
                else if (sampler.interpolation === "STEP") for (let k = 0; k < numComps; k++) anims[k].defaultEasing = CABLES.EASING_ABSOLUTE;
                else if (sampler.interpolation === "CUBICSPLINE") for (let k = 0; k < numComps; k++) anims[k].defaultEasing = CABLES.EASING_CUBICSPLINE;
                else op.warn("unknown interpolation", sampler.interpolation);

                // console.log(bufferOut)

                // if there is no keyframe for time 0 copy value of first keyframe at time 0
                if (bufferIn[0] !== 0.0)
                    for (let k = 0; k < numComps; k++)
                        anims[k].setValue(0, bufferOut[0 * numComps + k]);

                for (let j = 0; j < bufferIn.length; j++)
                {
                    maxTime = Math.max(bufferIn[j], maxTime);

                    for (let k = 0; k < numComps; k++)
                    {
                        if (anims[k].defaultEasing === CABLES.EASING_CUBICSPLINE)
                        {
                            const idx = ((j * numComps) * 3 + k);

                            const key = anims[k].setValue(bufferIn[j], bufferOut[idx + numComps]);
                            key.bezTangIn = bufferOut[idx];
                            key.bezTangOut = bufferOut[idx + (numComps * 2)];

                            // console.log(an.name,k,bufferOut[idx+1]);
                        }
                        else
                        {
                            // console.log(an.name,k,bufferOut[j * numComps + k]);
                            anims[k].setValue(bufferIn[j], bufferOut[j * numComps + k]);
                        }
                    }
                }

                node.setAnim(chan.target.path, an.name, anims);
            }
            else
            {
                op.warn("loadAmins bufferIn undefined ", bufferIn === undefined);
                op.warn("loadAmins bufferOut undefined ", bufferOut === undefined);
                op.warn("loadAmins ", sampler, accOut);
                op.warn("loadAmins num accBuffers", gltf.accBuffers.length);
                op.warn("loadAmins num accessors", gltf.json.accessors.length);
            }
        }
    }

    gltf.uniqueAnimNames = uniqueAnimNames;

    outAnims.setRef(Object.keys(uniqueAnimNames));
}

function loadCams(gltf)
{
    if (!gltf || !gltf.json.cameras) return;

    gltf.cameras = gltf.cameras || [];

    for (let i = 0; i < gltf.nodes.length; i++)
    {
        if (gltf.nodes[i].hasOwnProperty("camera"))
        {
            const cam = new gltfCamera(gltf, gltf.nodes[i]);
            gltf.cameras.push(cam);
        }
    }
}

function loadAfterDraco()
{
    if (!window.DracoDecoder)
    {
        setTimeout(() =>
        {
            loadAfterDraco();
        }, 100);
    }

    reloadSoon();
}

function parseGltf(arrayBuffer)
{
    const CHUNK_HEADER_SIZE = 8;

    let j = 0, i = 0;

    const gltf = new Gltf();
    gltf.timing.push(["Start parsing", Math.round((performance.now() - gltf.startTime))]);

    if (!arrayBuffer) return;
    const byteArray = new Uint8Array(arrayBuffer);
    let pos = 0;

    // var string = new TextDecoder("utf-8").decode(byteArray.subarray(pos, 4));
    const string = Utf8ArrayToStr(byteArray.subarray(pos, 4));
    pos += 4;
    if (string != "glTF") return;

    gltf.timing.push(["dataview", Math.round((performance.now() - gltf.startTime))]);

    const dv = new DataView(arrayBuffer);
    const version = dv.getUint32(pos, le);
    pos += 4;
    const size = dv.getUint32(pos, le);
    pos += 4;

    outVersion.set(version);

    const chunks = [];
    gltf.chunks = chunks;

    chunks.push(readChunk(dv, byteArray, arrayBuffer, pos));
    pos += chunks[0].size + CHUNK_HEADER_SIZE;
    gltf.json = chunks[0].data;

    gltf.cables = {
        "fileUrl": inFile.get(),
        "shortFileName": CABLES.basename(inFile.get())
    };

    outJson.setRef(gltf.json);
    outExtensions.setRef(gltf.json.extensionsUsed || []);

    let ch = readChunk(dv, byteArray, arrayBuffer, pos);
    while (ch)
    {
        chunks.push(ch);
        pos += ch.size + CHUNK_HEADER_SIZE;
        ch = readChunk(dv, byteArray, arrayBuffer, pos);
    }

    gltf.chunks = chunks;

    const views = chunks[0].data.bufferViews;
    const accessors = chunks[0].data.accessors;

    gltf.timing.push(["Parse buffers", Math.round((performance.now() - gltf.startTime))]);

    if (gltf.json.extensionsUsed && gltf.json.extensionsUsed.indexOf("KHR_draco_mesh_compression") > -1)
    {
        if (!window.DracoDecoder)
        {
            op.setUiError("gltfdraco", "GLTF draco compression lib not found / add draco op to your patch!");

            loadAfterDraco();
            return gltf;
        }
        else
        {
            gltf.useDraco = true;
        }
    }

    op.setUiError("gltfdraco", null);
    // let accPos = (view.byteOffset || 0) + (acc.byteOffset || 0);

    if (views)
    {
        for (i = 0; i < accessors.length; i++)
        {
            const acc = accessors[i];
            const view = views[acc.bufferView];

            let numComps = 0;
            if (acc.type == "SCALAR")numComps = 1;
            else if (acc.type == "VEC2")numComps = 2;
            else if (acc.type == "VEC3")numComps = 3;
            else if (acc.type == "VEC4")numComps = 4;
            else if (acc.type == "MAT4")numComps = 16;
            else console.error("unknown accessor type", acc.type);

            //   const decoder = new decoderModule.Decoder();
            //   const decodedGeometry = decodeDracoData(data, decoder);
            //   // Encode mesh
            //   encodeMeshToFile(decodedGeometry, decoder);

            //   decoderModule.destroy(decoder);
            //   decoderModule.destroy(decodedGeometry);

            // 5120 (BYTE)	1
            // 5121 (UNSIGNED_BYTE)	1
            // 5122 (SHORT)	2

            if (chunks[1].dataView)
            {
                if (view)
                {
                    const num = acc.count * numComps;
                    let accPos = (view.byteOffset || 0) + (acc.byteOffset || 0);
                    let stride = view.byteStride || 0;
                    let dataBuff = null;

                    if (acc.componentType == 5126 || acc.componentType == 5125) // 4byte FLOAT or INT
                    {
                        stride = stride || 4;

                        const isInt = acc.componentType == 5125;
                        if (isInt)dataBuff = new Uint32Array(num);
                        else dataBuff = new Float32Array(num);

                        for (j = 0; j < num; j++)
                        {
                            if (isInt) dataBuff[j] = chunks[1].dataView.getUint32(accPos, le);
                            else dataBuff[j] = chunks[1].dataView.getFloat32(accPos, le);

                            if (stride != 4 && (j + 1) % numComps === 0)accPos += stride - (numComps * 4);
                            accPos += 4;
                        }
                    }
                    else if (acc.componentType == 5123) // UNSIGNED_SHORT
                    {
                        stride = stride || 2;

                        dataBuff = new Uint16Array(num);

                        for (j = 0; j < num; j++)
                        {
                            dataBuff[j] = chunks[1].dataView.getUint16(accPos, le);

                            if (stride != 2 && (j + 1) % numComps === 0) accPos += stride - (numComps * 2);

                            accPos += 2;
                        }
                    }
                    else if (acc.componentType == 5121) // UNSIGNED_BYTE
                    {
                        stride = stride || 1;

                        dataBuff = new Uint8Array(num);

                        for (j = 0; j < num; j++)
                        {
                            dataBuff[j] = chunks[1].dataView.getUint8(accPos, le);

                            if (stride != 1 && (j + 1) % numComps === 0) accPos += stride - (numComps * 1);

                            accPos += 1;
                        }
                    }

                    else
                    {
                        console.error("unknown component type", acc.componentType);
                    }

                    gltf.accBuffers.push(dataBuff);
                }
                else
                {
                    // console.log("has no dataview");
                }
            }
        }
    }

    gltf.timing.push(["Parse mesh groups", Math.round((performance.now() - gltf.startTime))]);

    gltf.json.meshes = gltf.json.meshes || [];

    if (gltf.json.meshes)
    {
        for (i = 0; i < gltf.json.meshes.length; i++)
        {
            const mesh = new gltfMeshGroup(gltf, gltf.json.meshes[i]);
            gltf.meshes.push(mesh);
        }
    }

    gltf.timing.push(["Parse nodes", Math.round((performance.now() - gltf.startTime))]);

    for (i = 0; i < gltf.json.nodes.length; i++)
    {
        if (gltf.json.nodes[i].children)
            for (j = 0; j < gltf.json.nodes[i].children.length; j++)
            {
                gltf.json.nodes[gltf.json.nodes[i].children[j]].isChild = true;
            }
    }

    for (i = 0; i < gltf.json.nodes.length; i++)
    {
        const node = new gltfNode(gltf.json.nodes[i], gltf);
        gltf.nodes.push(node);
    }

    for (i = 0; i < gltf.nodes.length; i++)
    {
        const node = gltf.nodes[i];

        if (!node.children) continue;
        for (let j = 0; j < node.children.length; j++)
        {
            gltf.nodes[node.children[j]].parent = node;
        }
    }

    for (i = 0; i < gltf.nodes.length; i++)
    {
        gltf.nodes[i].initSkin();
    }

    needsMatUpdate = true;

    gltf.timing.push(["load anims", Math.round((performance.now() - gltf.startTime))]);

    if (gltf.json.animations) loadAnims(gltf);

    gltf.timing.push(["load cameras", Math.round((performance.now() - gltf.startTime))]);

    if (gltf.json.cameras) loadCams(gltf);

    gltf.timing.push(["finished", Math.round((performance.now() - gltf.startTime))]);
    return gltf;
}
let gltfMesh = class
{
    constructor(name, prim, gltf, finished)
    {
        this.POINTS = 0;
        this.LINES = 1;
        this.LINE_LOOP = 2;
        this.LINE_STRIP = 3;
        this.TRIANGLES = 4;
        this.TRIANGLE_STRIP = 5;
        this.TRIANGLE_FAN = 6;

        this.test = 0;
        this.name = name;
        this.submeshIndex = 0;
        this.material = prim.material;
        // console.log(prim);
        this.mesh = null;
        this.geom = new CGL.Geometry("gltf_" + this.name);
        this.geom.verticesIndices = [];
        this.bounds = null;
        this.primitive = 4;
        this.morphTargetsRenderMod = null;
        this.weights = prim.weights;

        if (prim.hasOwnProperty("mode")) this.primitive = prim.mode;

        if (prim.hasOwnProperty("indices")) this.geom.verticesIndices = gltf.accBuffers[prim.indices];

        gltf.loadingMeshes = gltf.loadingMeshes || 0;
        gltf.loadingMeshes++;

        this.materialJson =
            this._matPbrMetalness =
            this._matPbrRoughness =
            this._matDiffuseColor = null;

        if (gltf.json.materials)
        {
            if (this.material != -1) this.materialJson = gltf.json.materials[this.material];

            if (this.materialJson && this.materialJson.pbrMetallicRoughness)
            {
                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty("baseColorFactor"))
                {
                    this._matDiffuseColor = [1, 1, 1, 1];
                }
                else
                {
                    this._matDiffuseColor = this.materialJson.pbrMetallicRoughness.baseColorFactor;
                }

                this._matDiffuseColor = this.materialJson.pbrMetallicRoughness.baseColorFactor;

                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty("metallicFactor"))
                {
                    this._matPbrMetalness = 1.0;
                }
                else
                {
                    this._matPbrMetalness = this.materialJson.pbrMetallicRoughness.metallicFactor || null;
                }

                if (!this.materialJson.pbrMetallicRoughness.hasOwnProperty("roughnessFactor"))
                {
                    this._matPbrRoughness = 1.0;
                }
                else
                {
                    this._matPbrRoughness = this.materialJson.pbrMetallicRoughness.roughnessFactor || null;
                }
            }
        }

        if (gltf.useDraco && prim.extensions.KHR_draco_mesh_compression)
        {
            const view = gltf.chunks[0].data.bufferViews[prim.extensions.KHR_draco_mesh_compression.bufferView];
            const num = view.byteLength;
            const dataBuff = new Int8Array(num);
            let accPos = (view.byteOffset || 0);// + (acc.byteOffset || 0);
            for (let j = 0; j < num; j++)
            {
                dataBuff[j] = gltf.chunks[1].dataView.getInt8(accPos, le);
                accPos++;
            }

            const dracoDecoder = window.DracoDecoder;
            dracoDecoder.decodeGeometry(dataBuff.buffer, (geometry) =>
            {
                const geom = new CGL.Geometry("draco mesh " + name);

                for (let i = 0; i < geometry.attributes.length; i++)
                {
                    const attr = geometry.attributes[i];

                    if (attr.name === "position") geom.vertices = attr.array;
                    else if (attr.name === "normal") geom.vertexNormals = attr.array;
                    else if (attr.name === "uv") geom.texCoords = attr.array;
                    else if (attr.name === "color") geom.vertexColors = this.calcVertexColors(attr.array);
                    else if (attr.name === "joints") geom.setAttribute("attrJoints", Array.from(attr.array), 4);
                    else if (attr.name === "weights")
                    {
                        const arr4 = new Float32Array(attr.array.length / attr.itemSize * 4);

                        for (let k = 0; k < attr.array.length / attr.itemSize; k++)
                        {
                            arr4[k * 4] = arr4[k * 4 + 1] = arr4[k * 4 + 2] = arr4[k * 4 + 3] = 0;
                            for (let j = 0; j < attr.itemSize; j++)
                                arr4[k * 4 + j] = attr.array[k * attr.itemSize + j];
                        }
                        geom.setAttribute("attrWeights", arr4, 4);
                    }
                    else op.logWarn("unknown draco attrib", attr);
                }

                geometry.attributes = null;
                geom.verticesIndices = geometry.index.array;

                this.setGeom(geom);

                this.mesh = null;
                gltf.loadingMeshes--;
                gltf.timing.push(["draco decode", Math.round((performance.now() - gltf.startTime))]);

                if (finished)finished(this);
            }, (error) => { op.logError(error); });
        }
        else
        {
            gltf.loadingMeshes--;
            this.fillGeomAttribs(gltf, this.geom, prim.attributes);

            if (prim.targets)
            {
                for (let j = 0; j < prim.targets.length; j++)
                {
                    const tgeom = new CGL.Geometry("gltf_target_" + j);

                    // if (prim.hasOwnProperty("indices")) tgeom.verticesIndices = gltf.accBuffers[prim.indices];

                    this.fillGeomAttribs(gltf, tgeom, prim.targets[j], false);

                    // { // calculate normals for final position of morphtarget for later...
                    //     for (let i = 0; i < tgeom.vertices.length; i++) tgeom.vertices[i] += this.geom.vertices[i];
                    //     tgeom.calculateNormals();
                    //     for (let i = 0; i < tgeom.vertices.length; i++) tgeom.vertices[i] -= this.geom.vertices[i];
                    // }

                    this.geom.morphTargets.push(tgeom);
                }
            }
            if (finished)finished(this);
        }
    }

    _linearToSrgb(x)
    {
        if (x <= 0)
            return 0;
        else if (x >= 1)
            return 1;
        else if (x < 0.0031308)
            return x * 12.92;
        else
            return x ** (1 / 2.2) * 1.055 - 0.055;
    }

    calcVertexColors(arr)
    {
        let vertexColors = null;
        if (arr instanceof Float32Array)
        {
            let div = false;
            for (let i = 0; i < arr.length; i++)
            {
                if (arr[i] > 1)
                {
                    div = true;
                    continue;
                }
            }

            if (div)
                for (let i = 0; i < arr.length; i++) arr[i] /= 65535;

            vertexColors = arr;
        }

        else if (arr instanceof Uint16Array)
        {
            const fb = new Float32Array(arr.length);
            for (let i = 0; i < arr.length; i++) fb[i] = arr[i] / 65535;

            vertexColors = fb;
        }
        else vertexColors = arr;

        for (let i = 0; i < vertexColors.length; i++)
        {
            vertexColors[i] = this._linearToSrgb(vertexColors[i]);
        }

        return vertexColors;
    }

    fillGeomAttribs(gltf, tgeom, attribs, setGeom)
    {
        if (attribs.hasOwnProperty("POSITION")) tgeom.vertices = gltf.accBuffers[attribs.POSITION];
        if (attribs.hasOwnProperty("NORMAL")) tgeom.vertexNormals = gltf.accBuffers[attribs.NORMAL];
        if (attribs.hasOwnProperty("TANGENT")) tgeom.tangents = gltf.accBuffers[attribs.TANGENT];

        if (attribs.hasOwnProperty("COLOR_0")) tgeom.vertexColors = this.calcVertexColors(gltf.accBuffers[attribs.COLOR_0]);
        if (attribs.hasOwnProperty("COLOR_1")) tgeom.setAttribute("attrVertColor1", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_1]), 4);
        if (attribs.hasOwnProperty("COLOR_2")) tgeom.setAttribute("attrVertColor2", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_2]), 4);
        if (attribs.hasOwnProperty("COLOR_3")) tgeom.setAttribute("attrVertColor3", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_3]), 4);
        if (attribs.hasOwnProperty("COLOR_4")) tgeom.setAttribute("attrVertColor4", this.calcVertexColors(gltf.accBuffers[attribs.COLOR_4]), 4);

        if (attribs.hasOwnProperty("TEXCOORD_0")) tgeom.texCoords = gltf.accBuffers[attribs.TEXCOORD_0];
        if (attribs.hasOwnProperty("TEXCOORD_1")) tgeom.setAttribute("attrTexCoord1", gltf.accBuffers[attribs.TEXCOORD_1], 2);
        if (attribs.hasOwnProperty("TEXCOORD_2")) tgeom.setAttribute("attrTexCoord2", gltf.accBuffers[attribs.TEXCOORD_2], 2);
        if (attribs.hasOwnProperty("TEXCOORD_3")) tgeom.setAttribute("attrTexCoord3", gltf.accBuffers[attribs.TEXCOORD_3], 2);
        if (attribs.hasOwnProperty("TEXCOORD_4")) tgeom.setAttribute("attrTexCoord4", gltf.accBuffers[attribs.TEXCOORD_4], 2);

        if (attribs.hasOwnProperty("WEIGHTS_0"))
        {
            tgeom.setAttribute("attrWeights", gltf.accBuffers[attribs.WEIGHTS_0], 4);
        }
        if (attribs.hasOwnProperty("JOINTS_0"))
        {
            if (!gltf.accBuffers[attribs.JOINTS_0])console.log("no !gltf.accBuffers[attribs.JOINTS_0]");
            tgeom.setAttribute("attrJoints", gltf.accBuffers[attribs.JOINTS_0], 4);
        }

        if (attribs.hasOwnProperty("POSITION")) gltf.accBuffersDelete.push(attribs.POSITION);
        if (attribs.hasOwnProperty("NORMAL")) gltf.accBuffersDelete.push(attribs.NORMAL);
        if (attribs.hasOwnProperty("TEXCOORD_0")) gltf.accBuffersDelete.push(attribs.TEXCOORD_0);
        if (attribs.hasOwnProperty("TANGENT")) gltf.accBuffersDelete.push(attribs.TANGENT);
        if (attribs.hasOwnProperty("COLOR_0"))gltf.accBuffersDelete.push(attribs.COLOR_0);
        if (attribs.hasOwnProperty("COLOR_0"))gltf.accBuffersDelete.push(attribs.COLOR_0);
        if (attribs.hasOwnProperty("COLOR_1"))gltf.accBuffersDelete.push(attribs.COLOR_1);
        if (attribs.hasOwnProperty("COLOR_2"))gltf.accBuffersDelete.push(attribs.COLOR_2);
        if (attribs.hasOwnProperty("COLOR_3"))gltf.accBuffersDelete.push(attribs.COLOR_3);

        if (attribs.hasOwnProperty("TEXCOORD_1")) gltf.accBuffersDelete.push(attribs.TEXCOORD_1);
        if (attribs.hasOwnProperty("TEXCOORD_2")) gltf.accBuffersDelete.push(attribs.TEXCOORD_2);
        if (attribs.hasOwnProperty("TEXCOORD_3")) gltf.accBuffersDelete.push(attribs.TEXCOORD_3);
        if (attribs.hasOwnProperty("TEXCOORD_4")) gltf.accBuffersDelete.push(attribs.TEXCOORD_4);

        if (setGeom !== false) if (tgeom && tgeom.verticesIndices) this.setGeom(tgeom);
    }

    setGeom(geom)
    {
        if (inNormFormat.get() == "X-ZY")
        {
            for (let i = 0; i < geom.vertexNormals.length; i += 3)
            {
                let t = geom.vertexNormals[i + 2];
                geom.vertexNormals[i + 2] = geom.vertexNormals[i + 1];
                geom.vertexNormals[i + 1] = -t;
            }
        }

        if (inVertFormat.get() == "XZ-Y")
        {
            for (let i = 0; i < geom.vertices.length; i += 3)
            {
                let t = geom.vertices[i + 2];
                geom.vertices[i + 2] = -geom.vertices[i + 1];
                geom.vertices[i + 1] = t;
            }
        }

        if (this.primitive == this.TRIANGLES)
        {
            if (inCalcNormals.get() == "Force Smooth") geom.calculateNormals();
            else if (!geom.vertexNormals.length && inCalcNormals.get() == "Auto") geom.calculateNormals({ "smooth": false });

            if ((!geom.biTangents || geom.biTangents.length == 0) && geom.tangents)
            {
                const bitan = vec3.create();
                const tan = vec3.create();

                const tangents = geom.tangents;
                geom.tangents = new Float32Array(tangents.length / 4 * 3);
                geom.biTangents = new Float32Array(tangents.length / 4 * 3);

                for (let i = 0; i < tangents.length; i += 4)
                {
                    const idx = i / 4 * 3;

                    vec3.cross(
                        bitan,
                        [geom.vertexNormals[idx], geom.vertexNormals[idx + 1], geom.vertexNormals[idx + 2]],
                        [tangents[i], tangents[i + 1], tangents[i + 2]]
                    );

                    vec3.div(bitan, bitan, [tangents[i + 3], tangents[i + 3], tangents[i + 3]]);
                    vec3.normalize(bitan, bitan);

                    geom.biTangents[idx + 0] = bitan[0];
                    geom.biTangents[idx + 1] = bitan[1];
                    geom.biTangents[idx + 2] = bitan[2];

                    geom.tangents[idx + 0] = tangents[i + 0];
                    geom.tangents[idx + 1] = tangents[i + 1];
                    geom.tangents[idx + 2] = tangents[i + 2];
                }
            }

            if (geom.tangents.length === 0 || inCalcNormals.get() != "Never")
            {
                // console.log("[gltf ]no tangents... calculating tangents...");
                geom.calcTangentsBitangents();
            }
        }

        this.geom = geom;

        this.bounds = geom.getBounds();
    }

    render(cgl, ignoreMaterial, skinRenderer)
    {
        if (!this.mesh && this.geom && this.geom.verticesIndices)
        {
            let g = this.geom;
            if (this.geom.vertices.length / 3 > 64000)
            {
                g = this.geom.copy();
                g.unIndex(false, true);
            }

            let glprim;
            if (this.primitive == this.TRIANGLES)glprim = cgl.gl.TRIANGLES;
            else if (this.primitive == this.LINES)glprim = cgl.gl.LINES;
            else if (this.primitive == this.LINE_STRIP)glprim = cgl.gl.LINE_STRIP;
            else if (this.primitive == this.POINTS)glprim = cgl.gl.POINTS;
            else
            {
                op.logWarn("unknown primitive type", this);
            }

            this.mesh = op.patch.cg.createMesh(g, glprim);
            // this.mesh = new CGL.Mesh(cgl, g, glprim);
        }
        else
        {
            // update morphTargets
            if (this.geom && this.geom.morphTargets.length && !this.morphTargetsRenderMod)
            {
                this.mesh.addVertexNumbers = true;
                this.morphTargetsRenderMod = new GltfTargetsRenderer(this);
            }

            let useMat = !ignoreMaterial && this.material != -1 && gltf.shaders[this.material];
            if (skinRenderer)useMat = false;

            if (useMat) cgl.pushShader(gltf.shaders[this.material]);

            const currentShader = cgl.getShader() || {};
            const uniDiff = currentShader.uniformColorDiffuse;

            const uniPbrMetalness = currentShader.uniformPbrMetalness;
            const uniPbrRoughness = currentShader.uniformPbrRoughness;

            if (!gltf.shaders[this.material] && inUseMatProps.get())
            {
                if (uniDiff && this._matDiffuseColor)
                {
                    this._matDiffuseColorOrig = [uniDiff.getValue()[0], uniDiff.getValue()[1], uniDiff.getValue()[2], uniDiff.getValue()[3]];
                    uniDiff.setValue(this._matDiffuseColor);
                }

                if (uniPbrMetalness)
                    if (this._matPbrMetalness != null)
                    {
                        this._matPbrMetalnessOrig = uniPbrMetalness.getValue();
                        uniPbrMetalness.setValue(this._matPbrMetalness);
                    }
                    else
                        uniPbrMetalness.setValue(0);

                if (uniPbrRoughness)
                    if (this._matPbrRoughness != null)
                    {
                        this._matPbrRoughnessOrig = uniPbrRoughness.getValue();
                        uniPbrRoughness.setValue(this._matPbrRoughness);
                    }
                    else
                    {
                        uniPbrRoughness.setValue(0);
                    }
            }

            if (this.morphTargetsRenderMod) this.morphTargetsRenderMod.renderStart(cgl, 0);
            if (this.mesh)
            {
                // console.log(this.mesh)
                // this.mesh.lastMaterial=0;
                this.mesh.render(cgl.getShader(), ignoreMaterial);
            }
            if (this.morphTargetsRenderMod) this.morphTargetsRenderMod.renderFinish(cgl);

            if (inUseMatProps.get())
            {
                if (uniDiff && this._matDiffuseColor) uniDiff.setValue(this._matDiffuseColorOrig);
                if (uniPbrMetalness && this._matPbrMetalnessOrig != undefined) uniPbrMetalness.setValue(this._matPbrMetalnessOrig);
                if (uniPbrRoughness && this._matPbrRoughnessOrig != undefined) uniPbrRoughness.setValue(this._matPbrRoughnessOrig);
            }

            if (useMat) cgl.popShader();
        }
    }
};
const gltfMeshGroup = class
{
    constructor(gltf, m)
    {
        this.bounds = new CABLES.CG.BoundingBox();
        this.meshes = [];
        this.name = m.name;
        const prims = m.primitives;

        for (let i = 0; i < prims.length; i++)
        {
            const mesh = new gltfMesh(this.name, prims[i], gltf,
                (mesh) =>
                {
                    mesh.extras = m.extras;
                    this.bounds.apply(mesh.bounds);
                });

            mesh.submeshIndex = i;
            this.meshes.push(mesh);
        }
    }

    render(cgl, ignoreMat, skinRenderer, _time, weights)
    {
        for (let i = 0; i < this.meshes.length; i++)
        {
            const useMat = gltf.shaders[this.meshes[i].material];

            if (!ignoreMat && useMat) cgl.pushShader(gltf.shaders[this.meshes[i].material]);
            // console.log(gltf.shaders[this.meshes[i].material],this.meshes[i].material)
            if (skinRenderer)skinRenderer.renderStart(cgl, _time);
            if (weights) this.meshes[i].weights = weights;
            this.meshes[i].render(cgl, ignoreMat, skinRenderer, _time);
            if (skinRenderer)skinRenderer.renderFinish(cgl);
            if (!ignoreMat && useMat) cgl.popShader();
        }
    }
};
const gltfNode = class
{
    constructor(node, gltf)
    {
        this.isChild = node.isChild || false;
        this.name = node.name;
        if (node.hasOwnProperty("camera")) this.camera = node.camera;
        this.hidden = false;
        this.mat = mat4.create();
        this._animActions = {};
        this.animWeights = [];
        this._animMat = mat4.create();
        this._tempMat = mat4.create();
        this._tempQuat = quat.create();
        this._tempRotmat = mat4.create();
        this.mesh = null;
        this.children = [];
        this._node = node;
        this._gltf = gltf;
        this.absMat = mat4.create();
        this.addTranslate = null;
        this._tempAnimScale = null;
        this.addMulMat = null;
        this.updateMatrix();
        this.skinRenderer = null;
        this.copies = [];
    }

    get skin()
    {
        if (this._node.hasOwnProperty("skin")) return this._node.skin;
        else return -1;
    }

    copy()
    {
        this.isCopy = true;
        const n = new gltfNode(this._node, this._gltf);
        n.copyOf = this;

        n._animActions = this._animActions;
        n.children = this.children;
        if (this.skin) n.skinRenderer = new GltfSkin(this);

        this.updateMatrix();
        return n;
    }

    hasSkin()
    {
        if (this._node.hasOwnProperty("skin")) return this._gltf.json.skins[this._node.skin].name || "unknown";
        return false;
    }

    initSkin()
    {
        if (this.skin > -1)
        {
            this.skinRenderer = new GltfSkin(this);
        }
    }

    updateMatrix()
    {
        mat4.identity(this.mat);
        if (this._node.translation) mat4.translate(this.mat, this.mat, this._node.translation);

        if (this._node.rotation)
        {
            const rotmat = mat4.create();
            this._rot = this._node.rotation;

            mat4.fromQuat(rotmat, this._node.rotation);
            mat4.mul(this.mat, this.mat, rotmat);
        }

        if (this._node.scale)
        {
            this._scale = this._node.scale;
            mat4.scale(this.mat, this.mat, this._scale);
        }

        if (this._node.hasOwnProperty("mesh"))
        {
            this.mesh = this._gltf.meshes[this._node.mesh];
            if (this.isCopy)
            {
                // console.log(this.mesh);
            }
        }

        if (this._node.children)
        {
            for (let i = 0; i < this._node.children.length; i++)
            {
                this._gltf.json.nodes[i].isChild = true;
                if (this._gltf.nodes[this._node.children[i]]) this._gltf.nodes[this._node.children[i]].isChild = true;
                this.children.push(this._node.children[i]);
            }
        }
    }

    unHide()
    {
        this.hidden = false;
        for (let i = 0; i < this.children.length; i++)
            if (this.children[i].unHide) this.children[i].unHide();
    }

    calcBounds(gltf, mat, bounds)
    {
        const localMat = mat4.create();

        if (mat) mat4.copy(localMat, mat);
        if (this.mat) mat4.mul(localMat, localMat, this.mat);

        if (this.mesh)
        {
            const bb = this.mesh.bounds.copy();
            bb.mulMat4(localMat);
            bounds.apply(bb);

            if (bounds.changed)
            {
                boundingPoints.push(
                    bb._min[0] || 0, bb._min[1] || 0, bb._min[2] || 0,
                    bb._max[0] || 0, bb._max[1] || 0, bb._max[2] || 0);
            }
        }

        for (let i = 0; i < this.children.length; i++)
        {
            if (gltf.nodes[this.children[i]] && gltf.nodes[this.children[i]].calcBounds)
            {
                const b = gltf.nodes[this.children[i]].calcBounds(gltf, localMat, bounds);

                bounds.apply(b);
            }
        }

        if (bounds.changed) return bounds;
        else return null;
    }

    setAnimAction(name)
    {
        // console.log("setAnimAction:", name);
        if (!name) return;

        this._currentAnimaction = name;

        if (name && !this._animActions[name])
        {
            // console.log("no action found:", name,this._animActions);
            return null;
        }

        // else console.log("YES action found:", name);
        // console.log(this._animActions);

        for (let path in this._animActions[name])
        {
            if (path == "translation") this._animTrans = this._animActions[name][path];
            else if (path == "rotation") this._animRot = this._animActions[name][path];
            else if (path == "scale") this._animScale = this._animActions[name][path];
            else if (path == "weights") this.animWeights = this._animActions[name][path];
            else console.log("[gltfNode] unknown anim path", path, this._animActions[name][path]);
        }
    }

    setAnim(path, name, anims)
    {
        if (!path || !name || !anims) return;

        // console.log("setanim", this._node.name, path, name, anims);

        this._animActions[name] = this._animActions[name] || {};

        // console.log(this._animActions);
        // debugger;

        // for (let i = 0; i < this.copies.length; i++) this.copies[i]._animActions = this._animActions;

        if (this._animActions[name][path]) op.log("[gltfNode] animation action path already exists", name, path, this._animActions[name][path]);

        this._animActions[name][path] = anims;

        if (path == "translation") this._animTrans = anims;
        else if (path == "rotation") this._animRot = anims;
        else if (path == "scale") this._animScale = anims;
        else if (path == "weights")
        {
            // console.log("weights",name,path,anims)
            this.animWeights = this._animActions[name][path];
            // console.log(this.animWeights);
        }
        else console.warn("unknown anim path", path, anims);
    }

    modelMatLocal()
    {
        return this._animMat || this.mat;
    }

    modelMatAbs()
    {
        return this.absMat;
    }

    transform(cgl, _time)
    {
        if (!_time && _time != 0)_time = time;

        this._lastTimeTrans = _time;

        // console.log(this._rot)

        gltfTransforms++;

        if (!this._animTrans && !this._animRot && !this._animScale)
        {
            mat4.mul(cgl.mMatrix, cgl.mMatrix, this.mat);
            this._animMat = null;
        }
        else
        {
            this._animMat = this._animMat || mat4.create();
            mat4.identity(this._animMat);

            const playAnims = true;

            if (playAnims && this._animTrans)
            {
                mat4.translate(this._animMat, this._animMat, [
                    this._animTrans[0].getValue(_time),
                    this._animTrans[1].getValue(_time),
                    this._animTrans[2].getValue(_time)]);
            }
            else
            if (this._node.translation) mat4.translate(this._animMat, this._animMat, this._node.translation);

            if (playAnims && this._animRot)
            {
                if (this._animRot[0].defaultEasing == CABLES.EASING_LINEAR) CABLES.Anim.slerpQuaternion(_time, this._tempQuat, this._animRot[0], this._animRot[1], this._animRot[2], this._animRot[3]);
                else if (this._animRot[0].defaultEasing == CABLES.EASING_ABSOLUTE)
                {
                    this._tempQuat[0] = this._animRot[0].getValue(_time);
                    this._tempQuat[1] = this._animRot[1].getValue(_time);
                    this._tempQuat[2] = this._animRot[2].getValue(_time);
                    this._tempQuat[3] = this._animRot[3].getValue(_time);
                }
                else if (this._animRot[0].defaultEasing == CABLES.EASING_CUBICSPLINE)
                {
                    CABLES.Anim.slerpQuaternion(_time, this._tempQuat, this._animRot[0], this._animRot[1], this._animRot[2], this._animRot[3]);
                }

                mat4.fromQuat(this._tempMat, this._tempQuat);
                mat4.mul(this._animMat, this._animMat, this._tempMat);
            }
            else if (this._rot)
            {
                mat4.fromQuat(this._tempRotmat, this._rot);
                mat4.mul(this._animMat, this._animMat, this._tempRotmat);
            }

            if (playAnims && this._animScale)
            {
                if (!this._tempAnimScale) this._tempAnimScale = [1, 1, 1];
                this._tempAnimScale[0] = this._animScale[0].getValue(_time);
                this._tempAnimScale[1] = this._animScale[1].getValue(_time);
                this._tempAnimScale[2] = this._animScale[2].getValue(_time);
                mat4.scale(this._animMat, this._animMat, this._tempAnimScale);
            }
            else if (this._scale) mat4.scale(this._animMat, this._animMat, this._scale);

            mat4.mul(cgl.mMatrix, cgl.mMatrix, this._animMat);
        }

        if (this.animWeights)
        {
            this.weights = this.weights || [];

            let str = "";
            for (let i = 0; i < this.animWeights.length; i++)
            {
                this.weights[i] = this.animWeights[i].getValue(_time);
                str += this.weights[i] + "/";
            }

            // console.log(str);
            // this.mesh.weights=this.animWeights.get(_time);
            // console.log(this.animWeights);
        }

        if (this.addTranslate) mat4.translate(cgl.mMatrix, cgl.mMatrix, this.addTranslate);

        if (this.addMulMat) mat4.mul(cgl.mMatrix, cgl.mMatrix, this.addMulMat);

        mat4.copy(this.absMat, cgl.mMatrix);
    }

    render(cgl, dontTransform, dontDrawMesh, ignoreMaterial, ignoreChilds, drawHidden, _time)
    {
        if (!dontTransform) cgl.pushModelMatrix();

        if (_time === undefined) _time = gltf.time;

        if (!dontTransform || this.skinRenderer) this.transform(cgl, _time);

        if (this.hidden && !drawHidden)
        {
        }
        else
        {
            if (this.skinRenderer)
            {
                this.skinRenderer.time = _time;
                if (!dontDrawMesh)
                    this.mesh.render(cgl, ignoreMaterial, this.skinRenderer, _time, this.weights);
            }
            else
            {
                if (this.mesh && !dontDrawMesh)
                    this.mesh.render(cgl, ignoreMaterial, null, _time, this.weights);
            }
        }

        if (!ignoreChilds && !this.hidden)
            for (let i = 0; i < this.children.length; i++)
                if (gltf.nodes[this.children[i]])
                    gltf.nodes[this.children[i]].render(cgl, dontTransform, dontDrawMesh, ignoreMaterial, ignoreChilds, drawHidden, _time);

        if (!dontTransform)cgl.popModelMatrix();
    }
};
let tab = null;

function closeTab()
{
    if (tab)gui.mainTabs.closeTab(tab.id);
    tab = null;
}

function formatVec(arr)
{
    const nums = [];
    for (let i = 0; i < arr.length; i++)
    {
        nums.push(Math.round(arr[i] * 1000) / 1000);
    }

    return nums.join(",");
}

function printNode(html, node, level)
{
    if (!gltf) return;

    html += "<tr class=\"row\">";

    let ident = "";
    let identSpace = "";

    for (let i = 1; i < level; i++)
    {
        identSpace += "&nbsp;&nbsp;&nbsp;";
        let identClass = "identBg";
        if (i == 1)identClass = "identBgLevel0";
        ident += "<td class=\"ident " + identClass + "\" ><div style=\"\"></div></td>";
    }
    let id = CABLES.uuid();
    html += ident;
    html += "<td colspan=\"" + (21 - level) + "\">";

    if (node.mesh && node.mesh.meshes.length)html += "<span class=\"icon icon-cube\"></span>&nbsp;";
    else html += "<span class=\"icon icon-box-select\"></span> &nbsp;";

    html += node.name + "</td><td></td>";

    if (node.mesh)
    {
        html += "<td>";
        for (let i = 0; i < node.mesh.meshes.length; i++)
        {
            if (i > 0)html += ", ";
            html += node.mesh.meshes[i].name;
        }

        html += "</td>";

        html += "<td>";
        html += node.hasSkin() || "-";
        html += "</td>";

        html += "<td>";
        let countMats = 0;
        for (let i = 0; i < node.mesh.meshes.length; i++)
        {
            if (countMats > 0)html += ", ";
            if (gltf.json.materials && node.mesh.meshes[i].hasOwnProperty("material"))
            {
                if (gltf.json.materials[node.mesh.meshes[i].material])
                {
                    html += gltf.json.materials[node.mesh.meshes[i].material].name;
                    countMats++;
                }
            }
        }
        if (countMats == 0)html += "none";
        html += "</td>";
    }
    else
    {
        html += "<td>-</td><td>-</td><td>-</td>";
    }

    html += "<td>";

    if (node._node.translation || node._node.rotation || node._node.scale)
    {
        let info = "";

        if (node._node.translation)info += "Translate: `" + formatVec(node._node.translation) + "` || ";
        if (node._node.rotation)info += "Rotation: `" + formatVec(node._node.rotation) + "` || ";
        if (node._node.scale)info += "Scale: `" + formatVec(node._node.scale) + "` || ";

        html += "<span class=\"icon icon-gizmo info\" data-info=\"" + info + "\"></span> &nbsp;";
    }

    if (node._animRot || node._animScale || node._animTrans)
    {
        let info = "Animated: ";
        if (node._animRot) info += "Rot ";
        if (node._animScale) info += "Scale ";
        if (node._animTrans) info += "Trans ";

        html += "<span class=\"icon icon-clock info\" data-info=\"" + info + "\"></span>&nbsp;";
    }

    if (!node._node.translation && !node._node.rotation && !node._node.scale && !node._animRot && !node._animScale && !node._animTrans) html += "-";

    html += "</td>";

    html += "<td>";
    let hideclass = "";
    if (node.hidden)hideclass = "node-hidden";

    // html+='';
    html += "<a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeNode('" + node.name + "','transform')\" class=\"treebutton\">Transform</a>";
    html += " <a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeNode('" + node.name + "','hierarchy')\" class=\"treebutton\">Hierarchy</a>";
    html += " <a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeNode('" + node.name + "')\" class=\"treebutton\">Node</a>";

    if (node.hasSkin())
        html += " <a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeNode('" + node.name + "',false,{skin:true});\" class=\"treebutton\">Skin</a>";

    html += "</td><td>";
    html += "&nbsp;<span class=\"icon iconhover icon-eye " + hideclass + "\" onclick=\"gui.corePatch().getOpById('" + op.id + "').toggleNodeVisibility('" + node.name + "');this.classList.toggle('node-hidden');\"></span>";
    html += "</td>";

    html += "</tr>";

    if (node.children)
    {
        for (let i = 0; i < node.children.length; i++)
            html = printNode(html, gltf.nodes[node.children[i]], level + 1);
    }

    return html;
}

function printMaterial(mat, idx)
{
    let html = "<tr>";
    html += " <td>" + idx + "</td>";
    html += " <td>" + mat.name + "</td>";

    html += " <td>";

    const info = JSON.stringify(mat, null, 4).replaceAll("\"", "").replaceAll("\n", "<br/>");

    html += "<span class=\"icon icon-info\" onclick=\"new CABLES.UI.ModalDialog({ 'html': '<pre>" + info + "</pre>', 'title': '" + mat.name + "' });\"></span>&nbsp;";

    if (mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorFactor)
    {
        let rgb = "";
        rgb += "" + Math.round(mat.pbrMetallicRoughness.baseColorFactor[0] * 255);
        rgb += "," + Math.round(mat.pbrMetallicRoughness.baseColorFactor[1] * 255);
        rgb += "," + Math.round(mat.pbrMetallicRoughness.baseColorFactor[2] * 255);

        html += "<div style=\"width:15px;height:15px;background-color:rgb(" + rgb + ");display:inline-block\">&nbsp;</a>";
    }
    html += " <td style=\"\">" + (gltf.shaders[idx] ? "-" : "<a onclick=\"gui.corePatch().getOpById('" + op.id + "').assignMaterial('" + mat.name + "')\" class=\"treebutton\">Assign</a>") + "<td>";
    html += "<td>";

    html += "</tr>";
    return html;
}

function printInfo()
{
    if (!gltf) return;

    const startTime = performance.now();
    const sizes = {};
    let html = "<div style=\"overflow:scroll;width:100%;height:100%\">";

    html += "File: <a href=\"" + CABLES.sandbox.getCablesUrl() + "/asset/patches/?filename=" + inFile.get() + "\" target=\"_blank\">" + CABLES.basename(inFile.get()) + "</a><br/>";

    html += "Generator:" + gltf.json.asset.generator;

    let numNodes = 0;
    if (gltf.json.nodes)numNodes = gltf.json.nodes.length;
    html += "<div id=\"groupNodes\">Nodes (" + numNodes + ")</div>";

    html += "<table id=\"sectionNodes\" class=\"table treetable\">";

    html += "<tr>";
    html += " <th colspan=\"21\">Name</th>";
    html += " <th>Mesh</th>";
    html += " <th>Skin</th>";
    html += " <th>Material</th>";
    html += " <th>Transform</th>";
    html += " <th>Expose</th>";
    html += " <th></th>";
    html += "</tr>";

    for (let i = 0; i < gltf.nodes.length; i++)
    {
        if (!gltf.nodes[i].isChild)
            html = printNode(html, gltf.nodes[i], 1);
    }
    html += "</table>";

    // / //////////////////

    let numMaterials = 0;
    if (gltf.json.materials)numMaterials = gltf.json.materials.length;
    html += "<div id=\"groupMaterials\">Materials (" + numMaterials + ")</div>";

    if (!gltf.json.materials || gltf.json.materials.length == 0)
    {
    }
    else
    {
        html += "<table id=\"materialtable\"  class=\"table treetable\">";
        html += "<tr>";
        html += " <th>Index</th>";
        html += " <th>Name</th>";
        html += " <th>Color</th>";
        html += " <th>Function</th>";
        html += " <th></th>";
        html += "</tr>";
        for (let i = 0; i < gltf.json.materials.length; i++)
        {
            html += printMaterial(gltf.json.materials[i], i);
        }
        html += "</table>";
    }

    // / ///////////////////////

    html += "<div id=\"groupMeshes\">Meshes (" + gltf.json.meshes.length + ")</div>";

    html += "<table id=\"meshestable\"  class=\"table treetable\">";
    html += "<tr>";
    html += " <th>Name</th>";
    html += " <th>Node</th>";
    html += " <th>Material</th>";
    html += " <th>Vertices</th>";
    html += " <th>Attributes</th>";
    html += "</tr>";

    let sizeBufferViews = [];
    sizes.meshes = 0;
    sizes.meshTargets = 0;

    for (let i = 0; i < gltf.json.meshes.length; i++)
    {
        html += "<tr>";
        html += "<td>" + gltf.json.meshes[i].name + "</td>";

        html += "<td>";
        let count = 0;
        let nodename = "";
        for (let j = 0; j < gltf.json.nodes.length; j++)
        {
            if (gltf.json.nodes[j].mesh == i)
            {
                count++;
                if (count == 1)
                {
                    nodename = gltf.json.nodes[j].name;
                }
            }
        }
        if (count > 1) html += (count) + " nodes (" + nodename + " ...)";
        else html += nodename;
        html += "</td>";

        // -------

        html += "<td>";
        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)
        {
            if (gltf.json.meshes[i].primitives[j].hasOwnProperty("material"))
            {
                if (gltf.json.materials[gltf.json.meshes[i]])
                {
                    html += gltf.json.materials[gltf.json.meshes[i].primitives[j].material].name + " ";
                }
            }
            else html += "None";
        }
        html += "</td>";

        html += "<td>";
        let numVerts = 0;
        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)
        {
            if (gltf.json.meshes[i].primitives[j].attributes.POSITION != undefined)
            {
                let v = parseInt(gltf.json.accessors[gltf.json.meshes[i].primitives[j].attributes.POSITION].count);
                numVerts += v;
                html += "" + v + "<br/>";
            }
            else html += "-<br/>";
        }

        if (gltf.json.meshes[i].primitives.length > 1)
            html += "=" + numVerts;
        html += "</td>";

        html += "<td>";
        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)
        {
            html += Object.keys(gltf.json.meshes[i].primitives[j].attributes);
            html += " <a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeGeom('" + gltf.json.meshes[i].name + "'," + j + ")\" class=\"treebutton\">Geometry</a>";
            html += "<br/>";

            if (gltf.json.meshes[i].primitives[j].targets)
            {
                html += gltf.json.meshes[i].primitives[j].targets.length + " targets<br/>";

                if (gltf.json.meshes[i].extras && gltf.json.meshes[i].extras.targetNames)
                    html += "Targetnames:<br/>" + gltf.json.meshes[i].extras.targetNames.join("<br/>");

                html += "<br/>";
            }
        }

        html += "</td>";
        html += "</tr>";

        for (let j = 0; j < gltf.json.meshes[i].primitives.length; j++)
        {
            const accessor = gltf.json.accessors[gltf.json.meshes[i].primitives[j].indices];
            if (accessor)
            {
                let bufView = accessor.bufferView;

                if (sizeBufferViews.indexOf(bufView) == -1)
                {
                    sizeBufferViews.push(bufView);
                    if (gltf.json.bufferViews[bufView])sizes.meshes += gltf.json.bufferViews[bufView].byteLength;
                }
            }

            for (let k in gltf.json.meshes[i].primitives[j].attributes)
            {
                const attr = gltf.json.meshes[i].primitives[j].attributes[k];
                const bufView2 = gltf.json.accessors[attr].bufferView;

                if (sizeBufferViews.indexOf(bufView2) == -1)
                {
                    sizeBufferViews.push(bufView2);
                    if (gltf.json.bufferViews[bufView2])sizes.meshes += gltf.json.bufferViews[bufView2].byteLength;
                }
            }

            if (gltf.json.meshes[i].primitives[j].targets)
                for (let k = 0; k < gltf.json.meshes[i].primitives[j].targets.length; k++)
                {
                    for (let l in gltf.json.meshes[i].primitives[j].targets[k])
                    {
                        const accessorIdx = gltf.json.meshes[i].primitives[j].targets[k][l];
                        const accessor = gltf.json.accessors[accessorIdx];
                        const bufView2 = accessor.bufferView;
                        console.log("accessor", accessor);
                        if (sizeBufferViews.indexOf(bufView2) == -1)
                            if (gltf.json.bufferViews[bufView2])
                            {
                                sizeBufferViews.push(bufView2);
                                sizes.meshTargets += gltf.json.bufferViews[bufView2].byteLength;
                            }
                    }
                }
        }
    }
    html += "</table>";

    // / //////////////////////////////////

    let numSamplers = 0;
    let numAnims = 0;
    let numKeyframes = 0;

    if (gltf.json.animations)
    {
        numAnims = gltf.json.animations.length;
        for (let i = 0; i < gltf.json.animations.length; i++)
        {
            numSamplers += gltf.json.animations[i].samplers.length;
        }
    }

    html += "<div id=\"groupAnims\">Animations (" + numAnims + "/" + numSamplers + ")</div>";

    if (gltf.json.animations)
    {
        html += "<table id=\"sectionAnim\" class=\"table treetable\">";
        html += "<tr>";
        html += "  <th>Name</th>";
        html += "  <th>Target node</th>";
        html += "  <th>Path</th>";
        html += "  <th>Interpolation</th>";
        html += "  <th>Keys</th>";
        html += "</tr>";


        sizes.animations = 0;

        for (let i = 0; i < gltf.json.animations.length; i++)
        {
            for (let j = 0; j < gltf.json.animations[i].samplers.length; j++)
            {
                let bufView = gltf.json.accessors[gltf.json.animations[i].samplers[j].input].bufferView;
                if (sizeBufferViews.indexOf(bufView) == -1)
                {
                    sizeBufferViews.push(bufView);
                    sizes.animations += gltf.json.bufferViews[bufView].byteLength;
                }

                bufView = gltf.json.accessors[gltf.json.animations[i].samplers[j].output].bufferView;
                if (sizeBufferViews.indexOf(bufView) == -1)
                {
                    sizeBufferViews.push(bufView);
                    sizes.animations += gltf.json.bufferViews[bufView].byteLength;
                }
            }

            for (let j = 0; j < gltf.json.animations[i].channels.length; j++)
            {
                html += "<tr>";
                html += "  <td> Anim " + i + ": " + gltf.json.animations[i].name + "</td>";

                html += "  <td>" + gltf.nodes[gltf.json.animations[i].channels[j].target.node].name + "</td>";
                html += "  <td>";
                html += gltf.json.animations[i].channels[j].target.path + " ";
                html += "  </td>";

                const smplidx = gltf.json.animations[i].channels[j].sampler;
                const smplr = gltf.json.animations[i].samplers[smplidx];

                html += "  <td>" + smplr.interpolation + "</td>";

                html += "  <td>" + gltf.json.accessors[smplr.output].count;
                numKeyframes += gltf.json.accessors[smplr.output].count;

                // html += "&nbsp;&nbsp;<a onclick=\"gui.corePatch().getOpById('" + op.id + "').showAnim('" + i + "','" + j + "')\" class=\"icon icon-search\"></a>";

                html += "</td>";

                html += "</tr>";
            }
        }

        html += "<tr>";
        html += "  <td></td>";
        html += "  <td></td>";
        html += "  <td></td>";
        html += "  <td></td>";
        html += "  <td>" + numKeyframes + " total</td>";
        html += "</tr>";
        html += "</table>";
    }
    else
    {

    }

    // / ///////////////////

    let numImages = 0;
    if (gltf.json.images)numImages = gltf.json.images.length;
    html += "<div id=\"groupImages\">Images (" + numImages + ")</div>";

    if (gltf.json.images)
    {
        html += "<table id=\"sectionImages\" class=\"table treetable\">";

        html += "<tr>";
        html += "  <th>name</th>";
        html += "  <th>type</th>";
        html += "  <th>func</th>";
        html += "</tr>";

        sizes.images = 0;

        for (let i = 0; i < gltf.json.images.length; i++)
        {
            if (gltf.json.images[i].hasOwnProperty("bufferView"))
            {
                // if (sizeBufferViews.indexOf(gltf.json.images[i].hasOwnProperty("bufferView")) == -1)console.log("image bufferview already there?!");
                // else
                sizes.images += gltf.json.bufferViews[gltf.json.images[i].bufferView].byteLength;
            }
            else console.log("image has no bufferview?!");

            html += "<tr>";
            html += "<td>" + gltf.json.images[i].name + "</td>";
            html += "<td>" + gltf.json.images[i].mimeType + "</td>";
            html += "<td>";

            let name = gltf.json.images[i].name;
            if (name === undefined)name = gltf.json.images[i].bufferView;

            html += "<a onclick=\"gui.corePatch().getOpById('" + op.id + "').exposeTexture('" + name + "')\" class=\"treebutton\">Expose</a>";
            html += "</td>";

            html += "<tr>";
        }
        html += "</table>";
    }

    // / ///////////////////////

    let numCameras = 0;
    if (gltf.json.cameras)numCameras = gltf.json.cameras.length;
    html += "<div id=\"groupCameras\">Cameras (" + numCameras + ")</div>";

    if (gltf.json.cameras)
    {
        html += "<table id=\"sectionCameras\" class=\"table treetable\">";

        html += "<tr>";
        html += "  <th>name</th>";
        html += "  <th>type</th>";
        html += "  <th>info</th>";
        html += "</tr>";

        for (let i = 0; i < gltf.json.cameras.length; i++)
        {
            html += "<tr>";
            html += "<td>" + gltf.json.cameras[i].name + "</td>";
            html += "<td>" + gltf.json.cameras[i].type + "</td>";
            html += "<td>";

            if (gltf.json.cameras[i].perspective)
            {
                html += "yfov: " + Math.round(gltf.json.cameras[i].perspective.yfov * 100) / 100;
                html += ", ";
                html += "zfar: " + Math.round(gltf.json.cameras[i].perspective.zfar * 100) / 100;
                html += ", ";
                html += "znear: " + Math.round(gltf.json.cameras[i].perspective.znear * 100) / 100;
            }
            html += "</td>";

            html += "<tr>";
        }
        html += "</table>";
    }

    // / ////////////////////////////////////

    let numSkins = 0;
    if (gltf.json.skins)numSkins = gltf.json.skins.length;
    html += "<div id=\"groupSkins\">Skins (" + numSkins + ")</div>";

    if (gltf.json.skins)
    {
        // html += "<h3>Skins (" + gltf.json.skins.length + ")</h3>";
        html += "<table id=\"sectionSkins\" class=\"table treetable\">";

        html += "<tr>";
        html += "  <th>name</th>";
        html += "  <th></th>";
        html += "  <th>total joints</th>";
        html += "</tr>";

        for (let i = 0; i < gltf.json.skins.length; i++)
        {
            html += "<tr>";
            html += "<td>" + gltf.json.skins[i].name + "</td>";
            html += "<td>" + "</td>";
            html += "<td>" + gltf.json.skins[i].joints.length + "</td>";
            html += "<td>";
            html += "</td>";
            html += "<tr>";
        }
        html += "</table>";
    }

    // / ////////////////////////////////////

    if (gltf.timing)
    {
        html += "<div id=\"groupTiming\">Debug Loading Timing </div>";

        html += "<table id=\"sectionTiming\" class=\"table treetable\">";

        html += "<tr>";
        html += "  <th>task</th>";
        html += "  <th>time used</th>";
        html += "</tr>";

        let lt = 0;
        for (let i = 0; i < gltf.timing.length - 1; i++)
        {
            html += "<tr>";
            html += "  <td>" + gltf.timing[i][0] + "</td>";
            html += "  <td>" + (gltf.timing[i + 1][1] - gltf.timing[i][1]) + " ms</td>";
            html += "</tr>";
            // lt = gltf.timing[i][1];
        }
        html += "</table>";
    }

    // / //////////////////////////

    let sizeBin = 0;
    if (gltf.json.buffers)
        sizeBin = gltf.json.buffers[0].byteLength;

    html += "<div id=\"groupBinary\">File Size Allocation (" + Math.round(sizeBin / 1024) + "k )</div>";

    html += "<table id=\"sectionBinary\" class=\"table treetable\">";
    html += "<tr>";
    html += "  <th>name</th>";
    html += "  <th>size</th>";
    html += "  <th>%</th>";
    html += "</tr>";
    let sizeUnknown = sizeBin;
    for (let i in sizes)
    {
        // html+=i+':'+Math.round(sizes[i]/1024);
        html += "<tr>";
        html += "<td>" + i + "</td>";
        html += "<td>" + readableSize(sizes[i]) + " </td>";
        html += "<td>" + Math.round(sizes[i] / sizeBin * 100) + "% </td>";
        html += "<tr>";
        sizeUnknown -= sizes[i];
    }

    if (sizeUnknown != 0)
    {
        html += "<tr>";
        html += "<td>unknown</td>";
        html += "<td>" + readableSize(sizeUnknown) + " </td>";
        html += "<td>" + Math.round(sizeUnknown / sizeBin * 100) + "% </td>";
        html += "<tr>";
    }

    html += "</table>";
    html += "</div>";

    tab = new CABLES.UI.Tab("GLTF " + CABLES.basename(inFile.get()), { "icon": "cube", "infotext": "tab_gltf", "padding": true, "singleton": true });
    gui.mainTabs.addTab(tab, true);

    tab.addEventListener("close", closeTab);
    tab.html(html);

    CABLES.UI.Collapsable.setup(ele.byId("groupNodes"), ele.byId("sectionNodes"), false);
    CABLES.UI.Collapsable.setup(ele.byId("groupMaterials"), ele.byId("materialtable"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupAnims"), ele.byId("sectionAnim"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupMeshes"), ele.byId("meshestable"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupCameras"), ele.byId("sectionCameras"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupImages"), ele.byId("sectionImages"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupSkins"), ele.byId("sectionSkins"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupBinary"), ele.byId("sectionBinary"), true);
    CABLES.UI.Collapsable.setup(ele.byId("groupTiming"), ele.byId("sectionTiming"), true);

    gui.maintabPanel.show(true);
}

function readableSize(n)
{
    if (n > 1024) return Math.round(n / 1024) + " kb";
    if (n > 1024 * 500) return Math.round(n / 1024) + " mb";
    else return n + " bytes";
}
const GltfSkin = class
{
    constructor(node)
    {
        this._mod = null;
        this._node = node;
        this._lastTime = 0;
        this._matArr = [];
        this._m = mat4.create();
        this._invBindMatrix = mat4.create();
        this.identity = true;
    }

    renderFinish(cgl)
    {
        cgl.popModelMatrix();
        this._mod.unbind();
    }

    renderStart(cgl, time)
    {
        if (!this._mod)
        {
            this._mod = new CGL.ShaderModifier(cgl, op.name + this._node.name);

            this._mod.addModule({
                "priority": -2,
                "name": "MODULE_VERTEX_POSITION",
                "srcHeadVert": attachments.skin_head_vert || "",
                "srcBodyVert": attachments.skin_vert || ""
            });

            this._mod.addUniformVert("m4[]", "MOD_boneMats", []);// bohnenmatze
            const tr = vec3.create();
        }

        const skinIdx = this._node.skin;
        const arrLength = gltf.json.skins[skinIdx].joints.length * 16;

        // if (this._lastTime != time || !time)
        {
            // this._lastTime=inTime.get();
            if (this._matArr.length != arrLength) this._matArr.length = arrLength;

            for (let i = 0; i < gltf.json.skins[skinIdx].joints.length; i++)
            {
                const i16 = i * 16;
                const jointIdx = gltf.json.skins[skinIdx].joints[i];
                const nodeJoint = gltf.nodes[jointIdx];

                for (let j = 0; j < 16; j++)
                    this._invBindMatrix[j] = gltf.accBuffers[gltf.json.skins[skinIdx].inverseBindMatrices][i16 + j];

                mat4.mul(this._m, nodeJoint.modelMatAbs(), this._invBindMatrix);

                for (let j = 0; j < this._m.length; j++) this._matArr[i16 + j] = this._m[j];
            }

            this._mod.setUniformValue("MOD_boneMats", this._matArr);
            this._lastTime = time;
        }

        this._mod.define("SKIN_NUM_BONES", gltf.json.skins[skinIdx].joints.length);
        this._mod.bind();

        // draw mesh...
        cgl.pushModelMatrix();
        if (this.identity)mat4.identity(cgl.mMatrix);
    }
};
const GltfTargetsRenderer = class
{
    constructor(mesh)
    {
        this.mesh = mesh;
        this.tex = null;
        this.numRowsPerTarget = 0;

        this.makeTex(mesh.geom);
    }

    renderFinish(cgl)
    {
        cgl.popModelMatrix();
        this._mod.unbind();
    }

    renderStart(cgl, time)
    {
        if (!this._mod)
        {
            this._mod = new CGL.ShaderModifier(cgl, "gltftarget");

            this._mod.addModule({
                "priority": -2,
                "name": "MODULE_VERTEX_POSITION",
                "srcHeadVert": attachments.targets_head_vert || "",
                "srcBodyVert": attachments.targets_vert || ""
            });

            this._mod.addUniformVert("4f", "MOD_targetTexInfo", [0, 0, 0, 0]);
            this._mod.addUniformVert("t", "MOD_targetTex", 1);
            this._mod.addUniformVert("f[]", "MOD_weights", []);

            const tr = vec3.create();
        }

        this._mod.pushTexture("MOD_targetTex", this.tex);
        if (this.tex && this.mesh.weights)
        {
            this._mod.setUniformValue("MOD_weights", this.mesh.weights);
            this._mod.setUniformValue("MOD_targetTexInfo", [this.tex.width, this.tex.height, this.numRowsPerTarget, this.mesh.weights.length]);

            this._mod.define("MOD_NUM_WEIGHTS", Math.max(1, this.mesh.weights.length));
        }
        else
        {
            this._mod.define("MOD_NUM_WEIGHTS", 1);
        }
        this._mod.bind();

        // draw mesh...
        cgl.pushModelMatrix();
        if (this.identity)mat4.identity(cgl.mMatrix);
    }

    makeTex(geom)
    {
        if (!geom.morphTargets || !geom.morphTargets.length) return;

        let w = geom.morphTargets[0].vertices.length / 3;
        let h = 0;
        this.numRowsPerTarget = 0;

        if (geom.morphTargets[0].vertices && geom.morphTargets[0].vertices.length) this.numRowsPerTarget++;
        if (geom.morphTargets[0].vertexNormals && geom.morphTargets[0].vertexNormals.length) this.numRowsPerTarget++;
        if (geom.morphTargets[0].tangents && geom.morphTargets[0].tangents.length) this.numRowsPerTarget++;
        if (geom.morphTargets[0].bitangents && geom.morphTargets[0].bitangents.length) this.numRowsPerTarget++;

        h = geom.morphTargets.length * this.numRowsPerTarget;

        // console.log("this.numRowsPerTarget", this.numRowsPerTarget);

        const pixels = new Float32Array(w * h * 4);
        let row = 0;

        for (let i = 0; i < geom.morphTargets.length; i++)
        {
            if (geom.morphTargets[i].vertices && geom.morphTargets[i].vertices.length)
            {
                for (let j = 0; j < geom.morphTargets[i].vertices.length; j += 3)
                {
                    pixels[((row * w) + (j / 3)) * 4 + 0] = geom.morphTargets[i].vertices[j + 0];
                    pixels[((row * w) + (j / 3)) * 4 + 1] = geom.morphTargets[i].vertices[j + 1];
                    pixels[((row * w) + (j / 3)) * 4 + 2] = geom.morphTargets[i].vertices[j + 2];
                    pixels[((row * w) + (j / 3)) * 4 + 3] = 1;
                }
                row++;
            }

            if (geom.morphTargets[i].vertexNormals && geom.morphTargets[i].vertexNormals.length)
            {
                for (let j = 0; j < geom.morphTargets[i].vertexNormals.length; j += 3)
                {
                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].vertexNormals[j + 0];
                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].vertexNormals[j + 1];
                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].vertexNormals[j + 2];
                    pixels[(row * w + j / 3) * 4 + 3] = 1;
                }

                row++;
            }

            if (geom.morphTargets[i].tangents && geom.morphTargets[i].tangents.length)
            {
                for (let j = 0; j < geom.morphTargets[i].tangents.length; j += 3)
                {
                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].tangents[j + 0];
                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].tangents[j + 1];
                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].tangents[j + 2];
                    pixels[(row * w + j / 3) * 4 + 3] = 1;
                }
                row++;
            }

            if (geom.morphTargets[i].bitangents && geom.morphTargets[i].bitangents.length)
            {
                for (let j = 0; j < geom.morphTargets[i].bitangents.length; j += 3)
                {
                    pixels[(row * w + j / 3) * 4 + 0] = geom.morphTargets[i].bitangents[j + 0];
                    pixels[(row * w + j / 3) * 4 + 1] = geom.morphTargets[i].bitangents[j + 1];
                    pixels[(row * w + j / 3) * 4 + 2] = geom.morphTargets[i].bitangents[j + 2];
                    pixels[(row * w + j / 3) * 4 + 3] = 1;
                }
                row++;
            }
        }

        this.tex = new CGL.Texture(cgl, { "isFloatingPointTexture": true, "name": "targetsTexture" });

        this.tex.initFromData(pixels, w, h, CGL.Texture.FILTER_LINEAR, CGL.Texture.WRAP_REPEAT);

        // console.log("morphTargets generated texture", w, h);
    }
};
// https://raw.githubusercontent.com/KhronosGroup/glTF/master/specification/2.0/figures/gltfOverview-2.0.0b.png

const
    inExec = op.inTrigger("Render"),
    dataPort = op.inString("data"),
    inFile = op.inUrl("glb File", [".glb"]),
    inRender = op.inBool("Draw", true),
    inCamera = op.inDropDown("Camera", ["None"], "None"),
    inAnimation = op.inString("Animation", ""),
    inShow = op.inTriggerButton("Show Structure"),
    inCenter = op.inSwitch("Center", ["None", "XYZ", "XZ"], "XYZ"),
    inRescale = op.inBool("Rescale", true),
    inRescaleSize = op.inFloat("Rescale Size", 2.5),

    inTime = op.inFloat("Time"),
    inTimeLine = op.inBool("Sync to timeline", false),
    inLoop = op.inBool("Loop", true),

    inNormFormat = op.inSwitch("Normals Format", ["XYZ", "X-ZY"], "XYZ"),
    inVertFormat = op.inSwitch("Vertices Format", ["XYZ", "XZ-Y"], "XYZ"),
    inCalcNormals = op.inSwitch("Calc Normals", ["Auto", "Force Smooth", "Never"]),

    inMaterials = op.inObject("Materials"),
    inHideNodes = op.inArray("Hide Nodes"),
    inUseMatProps = op.inBool("Use Material Properties", true),

    inActive = op.inBool("Active", true),

    nextBefore = op.outTrigger("Render Before"),
    next = op.outTrigger("Next"),
    outGenerator = op.outString("Generator"),

    outVersion = op.outNumber("GLTF Version"),
    outExtensions = op.outArray("GLTF Extensions Used"),
    outAnimLength = op.outNumber("Anim Length", 0),
    outAnimTime = op.outNumber("Anim Time", 0),
    outJson = op.outObject("Json"),
    outAnims = op.outArray("Anims"),
    outPoints = op.outArray("BoundingPoints"),
    outBounds = op.outObject("Bounds"),
    outAnimFinished = op.outTrigger("Finished"),
    outLoading = op.outBool("Loading");

op.setPortGroup("Timing", [inTime, inTimeLine, inLoop]);

const cgl = op.patch.cgl;
let gltfLoadingErrorMesh = null;
let gltfLoadingError = false;
let gltfTransforms = 0;
let finishedLoading = false;
let cam = null;
let boundingPoints = [];
let gltf = null;
let maxTime = 0;
let time = 0;
let needsMatUpdate = true;
let timedLoader = null;
let loadingId = null;
let data = null;
const scale = vec3.create();
let lastTime = 0;
let doCenter = false;
const boundsCenter = vec3.create();

inFile.onChange =
    inVertFormat.onChange =
    inCalcNormals.onChange =
    inNormFormat.onChange = reloadSoon;

inShow.onTriggered = printInfo;
dataPort.onChange = loadData;
inHideNodes.onChange = hideNodesFromData;
inAnimation.onChange = updateAnimation;
inCenter.onChange = updateCenter;
op.toWorkPortsNeedToBeLinked(inExec);

dataPort.setUiAttribs({ "hideParam": true, "hidePort": true });
op.setPortGroup("Transform", [inRescale, inRescaleSize, inCenter]);

function updateCamera()
{
    const arr = ["None"];
    if (gltf)
    {
        for (let i = 0; i < gltf.nodes.length; i++)
        {
            if (gltf.nodes[i].camera >= 0)
            {
                arr.push(gltf.nodes[i].name);
            }
        }
    }
    inCamera.uiAttribs.values = arr;
}

function updateCenter()
{
    doCenter = inCenter.get() != "None";

    if (gltf && gltf.bounds)
    {
        boundsCenter.set(gltf.bounds.center);
        boundsCenter[0] = -boundsCenter[0];
        boundsCenter[1] = -boundsCenter[1];
        boundsCenter[2] = -boundsCenter[2];
        if (inCenter.get() == "XZ") boundsCenter[1] = -gltf.bounds.minY;
    }
}

inRescale.onChange = function ()
{
    inRescaleSize.setUiAttribs({ "greyout": !inRescale.get() });
};

inMaterials.onChange = function ()
{
    needsMatUpdate = true;
};

op.onDelete = function ()
{
    closeTab();
};

inTimeLine.onChange = function ()
{
    inTime.setUiAttribs({ "greyout": inTimeLine.get() });
};

inCamera.onChange = setCam;

function setCam()
{
    cam = null;
    if (!gltf) return;

    for (let i = 0; i < gltf.nodes.length; i++)
    {
        if (gltf.nodes[i].name == inCamera.get())cam = new gltfCamera(gltf, gltf.nodes[i]);
    }
}

inExec.onTriggered = function ()
{
    if (!finishedLoading) return;
    if (!inActive.get()) return;

    if (gltfLoadingError)
    {
        if (!gltfLoadingErrorMesh) gltfLoadingErrorMesh = CGL.MESHES.getSimpleCube(cgl, "ErrorCube");
        gltfLoadingErrorMesh.render(cgl.getShader());
    }

    gltfTransforms = 0;
    if (inTimeLine.get()) time = op.patch.timer.getTime();
    else time = Math.max(0, inTime.get());

    if (inLoop.get())
    {
        time %= maxTime;
        if (time < lastTime) outAnimFinished.trigger();
    }
    else
    {
        if (maxTime > 0 && time >= maxTime) outAnimFinished.trigger();
    }

    lastTime = time;

    cgl.pushModelMatrix();

    outAnimTime.set(time || 0);

    if (finishedLoading && gltf && gltf.bounds)
    {
        if (inRescale.get())
        {
            let sc = inRescaleSize.get() / gltf.bounds.maxAxis;
            gltf.scale = sc;
            vec3.set(scale, sc, sc, sc);
            mat4.scale(cgl.mMatrix, cgl.mMatrix, scale);
        }
        if (doCenter)
        {
            mat4.translate(cgl.mMatrix, cgl.mMatrix, boundsCenter);
        }
    }

    let oldScene = cgl.frameStore.currentScene || null;
    cgl.frameStore.currentScene = gltf;

    nextBefore.trigger();

    if (finishedLoading)
    {
        if (needsMatUpdate) updateMaterials();

        if (cam) cam.start(time);

        if (gltf)
        {
            gltf.time = time;

            if (gltf.bounds && cgl.shouldDrawHelpers(op))
            {
                if (CABLES.UI.renderHelper)cgl.pushShader(CABLES.GL_MARKER.getDefaultShader(cgl));
                else cgl.pushShader(CABLES.GL_MARKER.getSelectedShader(cgl));
                gltf.bounds.render(cgl);
                cgl.popShader();
            }

            if (inRender.get())
            {
                for (let i = 0; i < gltf.nodes.length; i++)
                    if (!gltf.nodes[i].isChild)
                        gltf.nodes[i].render(cgl);
            }
            else
            {
                for (let i = 0; i < gltf.nodes.length; i++)
                    if (!gltf.nodes[i].isChild)
                        gltf.nodes[i].render(cgl, false, true);
            }
        }
    }

    next.trigger();
    cgl.frameStore.currentScene = oldScene;

    cgl.popModelMatrix();

    if (cam)cam.end();
};

function finishLoading()
{
    if (!gltf)
    {
        finishedLoading = true;
        gltfLoadingError = true;
        cgl.patch.loading.finished(loadingId);

        op.setUiError("nogltf", "GLTF File not found");
        return;
    }

    op.setUiError("nogltf", null);

    if (gltf.loadingMeshes > 0)
    {
        // op.log("waiting for async meshes...");
        setTimeout(finishLoading, 100);
        return;
    }

    gltf.timing.push(["finishLoading()", Math.round((performance.now() - gltf.startTime))]);

    needsMatUpdate = true;
    // op.refreshParams();
    outAnimLength.set(maxTime);

    gltf.bounds = new CABLES.CG.BoundingBox();
    // gltf.bounds.applyPos(0, 0, 0);

    // if (!gltf)op.setUiError("urlerror", "could not load gltf:<br/>\"" + inFile.get() + "\"", 2);
    // else op.setUiError("urlerror", null);

    gltf.timing.push(["start calc bounds", Math.round((performance.now() - gltf.startTime))]);

    for (let i = 0; i < gltf.nodes.length; i++)
    {
        const node = gltf.nodes[i];
        node.updateMatrix();
        if (!node.isChild) node.calcBounds(gltf, null, gltf.bounds);
    }

    if (gltf.bounds)outBounds.set(gltf.bounds);

    gltf.timing.push(["calced bounds", Math.round((performance.now() - gltf.startTime))]);

    hideNodesFromData();

    gltf.timing.push(["hideNodesFromData", Math.round((performance.now() - gltf.startTime))]);

    if (tab)printInfo();

    gltf.timing.push(["printinfo", Math.round((performance.now() - gltf.startTime))]);

    updateCamera();
    setCam();
    outPoints.set(boundingPoints);

    if (gltf)
    {
        if (inFile.get() && !inFile.get().startsWith("data:"))
        {
            op.setUiAttrib({ "extendTitle": CABLES.basename(inFile.get()) });
        }

        gltf.loaded = Date.now();
        // if (gltf.bounds)outBounds.set(gltf.bounds);
    }

    if (gltf)
    {
        for (let i = 0; i < gltf.nodes.length; i++)
        {
            if (!gltf.nodes[i].isChild)
            {
                gltf.nodes[i].render(cgl, false, true, true, false, true, 0);
            }
        }

        for (let i = 0; i < gltf.nodes.length; i++)
        {
            const node = gltf.nodes[i];
            node.children = uniqueArray(node.children); // stupid fix why are there too many children ?!
        }
    }

    updateCenter();
    updateAnimation();

    outLoading.set(false);

    cgl.patch.loading.finished(loadingId);
    loadingId = null;

    // if (gltf.chunks.length > 1) gltf.chunks[1] = null;
    // if (gltf.chunks.length > 2) gltf.chunks[2] = null;

    // op.setUiAttrib({ "accBuffersDelete": CABLES.basename(inFile.get()) });

    if (gltf.accBuffersDelete)
    {
        for (let i = 0; i < gltf.accBuffersDelete.length; i++)
        {
            gltf.accBuffers[gltf.accBuffersDelete[i]] = null;
        }
    }

    // setTimeout(() =>
    // {
    //     for (let i = 0; i < gltf.nodes.length; i++)
    //     {
    //     // console.log(gltf.nodes[i]);

    //         if (gltf.nodes[i].mesh && gltf.nodes[i].mesh.meshes)
    //         {
    //         // console.log(gltf.nodes[i].mesh.meshes.length);
    //             for (let j = 0; j < gltf.nodes[i].mesh.meshes.length; j++)
    //             {
    //                 console.log(gltf.nodes[i].mesh.meshes[j]);

    //                 // for (let k = 0; k < gltf.nodes[i].mesh.meshes.length; k++)
    //                 {
    //                     if (gltf.nodes[i].mesh.meshes[j].mesh)
    //                     {
    //                         gltf.nodes[i].mesh.meshes[j].mesh.freeMem();
    //                         // console.log(gltf.nodes[i].mesh.meshes[j].mesh);
    //                         // for (let l = 0; l < gltf.nodes[i].mesh.meshes[j].mesh._attributes.length; l++)
    //                         //     gltf.nodes[i].mesh.meshes[j].mesh._attributes[l] = null;
    //                     }
    //                 }

    //                 gltf.nodes[i].mesh.meshes[j].geom.clear();
    //                 console.log("clear!");
    //             }
    //         }
    //     }
    // }, 1000);

    if (!(gltf.json.images && gltf.json.images.length)) gltf.chunks = null;

    finishedLoading = true;
}

function loadBin(addCacheBuster)
{
    if (!inActive.get()) return;

    if (!loadingId)loadingId = cgl.patch.loading.start("gltfScene", inFile.get(), op);

    let fileToLoad = inFile.get();
    let url = op.patch.getFilePath(String(inFile.get()));
    if (inFile.get() && !inFile.get().startsWith("data:"))
    {
        if (addCacheBuster === true)url += "?rnd=" + CABLES.generateUUID();
    }
    needsMatUpdate = true;
    outLoading.set(true);
    fetch(url)
        .then((res) => { return res.arrayBuffer(); })
        .then((arrayBuffer) =>
        {
            if (inFile.get() != fileToLoad)
            {
                cgl.patch.loading.finished(loadingId);
                loadingId = null;
                return;
            }

            boundingPoints = [];
            maxTime = 0;
            gltf = parseGltf(arrayBuffer);
            arrayBuffer = null;
            finishLoading();
        });
    closeTab();

    const oReq = new XMLHttpRequest();
    oReq.open("GET", url, true);
    oReq.responseType = "arraybuffer";

    cgl.patch.loading.addAssetLoadingTask(() =>
    {

    });
}

// op.onFileChanged = function (fn)
// {
//     gltf.accBuffersDelete[i];
//     if (fn && fn.length > 3 && inFile.get() && inFile.get().indexOf(fn) > -1) reloadSoon(true);
// };

op.onFileChanged = function (fn)
{
    if (inFile.get() && inFile.get().indexOf(fn) > -1)
    {
        reloadSoon(true);
    }
};

inActive.onChange = () =>
{
    if (inActive.get()) reloadSoon();

    if (!inActive.get())
    {
        gltf = null;
    }
};

function reloadSoon(nocache)
{
    clearTimeout(timedLoader);
    timedLoader = setTimeout(function () { loadBin(nocache); }, 30);
}

function updateMaterials()
{
    if (!gltf) return;

    gltf.shaders = {};

    if (inMaterials.links.length == 1 && inMaterials.get())
    {
        // just accept a associative object with s
        needsMatUpdate = true;
        const op = inMaterials.links[0].portOut.op;

        const portShader = op.getPort("Shader");
        const portName = op.getPort("Material Name");

        if (!portShader && !portName)
        {
            const inMats = inMaterials.get();
            for (let matname in inMats)
            {
                if (inMats[matname] && gltf.json.materials)
                    for (let i = 0; i < gltf.json.materials.length; i++)
                    {
                        if (gltf.json.materials[i].name == matname)
                        {
                            if (gltf.shaders[i])
                            {
                                op.warn("double material assignment:", name);
                            }
                            gltf.shaders[i] = inMats[matname];
                        }
                    }
            }
        }
    }

    if (inMaterials.get())
    {
        for (let j = 0; j < inMaterials.links.length; j++)
        {
            const op = inMaterials.links[j].portOut.op;
            const portShader = op.getPort("Shader");
            const portName = op.getPort("Material Name");

            if (portShader && portName && portShader.get())
            {
                const name = portName.get();
                if (gltf.json.materials)
                    for (let i = 0; i < gltf.json.materials.length; i++)
                        if (gltf.json.materials[i].name == name)
                        {
                            if (gltf.shaders[i])
                            {
                                op.warn("double material assignment:", name);
                            }
                            gltf.shaders[i] = portShader.get();
                        }
            }
        }
    }
    needsMatUpdate = false;
    if (tab)printInfo();
}

function hideNodesFromArray()
{
    const hideArr = inHideNodes.get();

    if (!gltf || !data || !data.hiddenNodes) return;
    if (!hideArr)
    {
        return;
    }

    for (let i = 0; i < hideArr.length; i++)
    {
        const n = gltf.getNode(hideArr[i]);
        if (n)n.hidden = true;
    }
}

function hideNodesFromData()
{
    if (!data)loadData();
    if (!gltf) return;

    gltf.unHideAll();

    if (data && data.hiddenNodes)
    {
        for (const i in data.hiddenNodes)
        {
            const n = gltf.getNode(i);
            if (n) n.hidden = true;
            else op.verbose("node to be hidden not found", i, n);
        }
    }
    hideNodesFromArray();
}

function loadData()
{
    data = dataPort.get();

    if (!data || data === "")data = {};
    else data = JSON.parse(data);

    if (gltf)hideNodesFromData();

    return data;
}

function saveData()
{
    dataPort.set(JSON.stringify(data));
}

function updateAnimation()
{
    if (gltf && gltf.nodes)
    {
        for (let i = 0; i < gltf.nodes.length; i++)
        {
            gltf.nodes[i].setAnimAction(inAnimation.get());
        }
    }
}

function findParents(nodes, childNodeIndex)
{
    for (let i = 0; i < gltf.nodes.length; i++)
    {
        if (gltf.nodes[i].children.indexOf(childNodeIndex) >= 0)
        {
            nodes.push(gltf.nodes[i]);
            if (gltf.nodes[i].isChild) findParents(nodes, i);
        }
    }
}

op.exposeTexture = function (name)
{
    const newop = gui.corePatch().addOp("Ops.Gl.GLTF.GltfTexture");
    newop.getPort("Name").set(name);
    setNewOpPosition(newop, 1);
    op.patch.link(op, next.name, newop, "Render");
    gui.patchView.testCollision(newop);
    gui.patchView.centerSelectOp(newop.id, true);
};

op.exposeGeom = function (name, idx)
{
    const newop = gui.corePatch().addOp("Ops.Gl.GLTF.GltfGeometry");
    newop.getPort("Name").set(name);
    newop.getPort("Submesh").set(idx);
    setNewOpPosition(newop, 1);
    op.patch.link(op, next.name, newop, "Update");
    gui.patchView.testCollision(newop);
    gui.patchView.centerSelectOp(newop.id, true);
};

function setNewOpPosition(newOp, num)
{
    num = num || 1;

    newOp.setUiAttrib(
        {
            "subPatch": op.uiAttribs.subPatch,
            "translate": { "x": op.uiAttribs.translate.x, "y": op.uiAttribs.translate.y + num * CABLES.GLUI.glUiConfig.newOpDistanceY }
        });
}

op.exposeNode = function (name, type, options)
{
    let tree = type == "hierarchy";
    if (tree)
    {
        let ops = [];

        for (let i = 0; i < gltf.nodes.length; i++)
        {
            if (gltf.nodes[i].name == name)
            {
                let arrHierarchy = [];
                const node = gltf.nodes[i];
                findParents(arrHierarchy, i);

                arrHierarchy = arrHierarchy.reverse();
                arrHierarchy.push(node, node);

                let prevPort = next.name;
                let prevOp = op;
                for (let j = 0; j < arrHierarchy.length; j++)
                {
                    const newop = gui.corePatch().addOp("Ops.Gl.GLTF.GltfNode_v2");
                    newop.getPort("Node Name").set(arrHierarchy[j].name);
                    op.patch.link(prevOp, prevPort, newop, "Render");
                    setNewOpPosition(newop, j);

                    if (j == arrHierarchy.length - 1)
                    {
                        newop.getPort("Transformation").set(false);
                    }
                    else
                    {
                        newop.getPort("Draw Mesh").set(false);
                        newop.getPort("Draw Childs").set(false);
                    }

                    prevPort = "Next";
                    prevOp = newop;
                    ops.push(newop);
                    gui.patchView.testCollision(newop);
                }
            }
        }

        for (let i = 0; i < ops.length; i++)
        {
            ops[i].selectChilds();
        }
    }
    else
    {
        let newopname = "Ops.Gl.GLTF.GltfNode_v2";
        if (options && options.skin)newopname = "Ops.Gl.GLTF.GltfSkin";
        if (type == "transform")newopname = "Ops.Gl.GLTF.GltfNodeTransform_v2";

        gui.serverOps.loadOpLibs(newopname, () =>
        {
            let newop = gui.corePatch().addOp(newopname);

            newop.getPort("Node Name").set(name);
            setNewOpPosition(newop);
            op.patch.link(op, next.name, newop, "Render");
            gui.patchView.testCollision(newop);
            gui.patchView.centerSelectOp(newop.id, true);
        });
    }
    gui.closeModal();
};

op.assignMaterial = function (name)
{
    const newop = gui.corePatch().addOp("Ops.Gl.GLTF.GltfSetMaterial");
    newop.getPort("Material Name").set(name);
    op.patch.link(op, inMaterials.name, newop, "Material");
    setNewOpPosition(newop);
    gui.patchView.testCollision(newop);
    gui.patchView.centerSelectOp(newop.id, true);

    gui.closeModal();
};

op.toggleNodeVisibility = function (name)
{
    const n = gltf.getNode(name);
    n.hidden = !n.hidden;
    data.hiddenNodes = data.hiddenNodes || {};

    if (n)
        if (n.hidden)data.hiddenNodes[name] = true;
        else delete data.hiddenNodes[name];

    saveData();
};

function uniqueArray(arr)
{
    const u = {}, a = [];
    for (let i = 0, l = arr.length; i < l; ++i)
    {
        if (!u.hasOwnProperty(arr[i]))
        {
            a.push(arr[i]);
            u[arr[i]] = 1;
        }
    }
    return a;
}


};

Ops.Gl.GLTF.GltfScene_v4.prototype = new CABLES.Op();
CABLES.OPS["c9cbb226-46f7-4ca6-8dab-a9d0bdca4331"]={f:Ops.Gl.GLTF.GltfScene_v4,objName:"Ops.Gl.GLTF.GltfScene_v4"};




// **************************************************************
// 
// Ops.Gl.GLTF.GltfNode_v2
// 
// **************************************************************

Ops.Gl.GLTF.GltfNode_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    inExec = op.inTrigger("Render"),
    inNodeName = op.inString("Node Name"),
    inTrans = op.inBool("Transformation", true),
    inDraw = op.inBool("Draw Mesh", true),
    inChilds = op.inBool("Draw Childs", true),
    inIgnMaterial = op.inBool("Ignore Material", true),

    inSceneTime = op.inBool("Use Scene Time", true),
    inTime = op.inFloat("Time", 0),

    next = op.outTrigger("Next"),
    outGeom = op.outObject("Geometry", null, "geometry"),
    outFound = op.outBool("Found");
const cgl = op.patch.cgl;

let node = null;
let currentSceneLoaded = null;

inNodeName.onChange = function ()
{
    outGeom.set(null);
    node = null;
    outFound.set(false);
    if (!inNodeName.isLinked())op.setUiAttrib({ "extendTitle": inNodeName.get() });
};

inSceneTime.onChange = updateTimeInputs;

updateTimeInputs();

function updateTimeInputs()
{
    inTime.setUiAttribs({ "greyout": inSceneTime.get() });
}

inExec.onTriggered = function ()
{
    if (!cgl.frameStore.currentScene) return;
    if (currentSceneLoaded != cgl.frameStore.currentScene.loaded) node = null;

    if (!node)
    {
        const name = inNodeName.get();

        if (!cgl.frameStore || !cgl.frameStore.currentScene || !cgl.frameStore.currentScene.nodes)
        {
            return;
        }
        currentSceneLoaded = cgl.frameStore.currentScene.loaded;

        for (let i = 0; i < cgl.frameStore.currentScene.nodes.length; i++)
        {
            if (cgl.frameStore.currentScene.nodes[i].name == name)
            {
                node = cgl.frameStore.currentScene.nodes[i];
                outFound.set(true);

                if (node && node.mesh && node.mesh.meshes && node.mesh.meshes[0].geom) outGeom.set(node.mesh.meshes[0].geom);
                else outGeom.set(null);
            }
        }
    }

    cgl.pushModelMatrix();

    if (node)
    {
        if (inTrans.get())
        {
            cgl.pushModelMatrix();
            node.transform(cgl);
        }

        // node.updateMatrix();

        // render(cgl, dontTransform, dontDrawMesh, ignoreMaterial, ignoreChilds, drawHidden, _time)

        let time;
        if (!inSceneTime.get()) time = inTime.get();

        node.render(cgl, !inTrans.get(), !inDraw.get(), inIgnMaterial.get(), !inChilds.get(), true, time);
    }

    next.trigger();

    if (node)
    {
        if (inTrans.get()) cgl.popModelMatrix();
    }

    cgl.popModelMatrix();
};


};

Ops.Gl.GLTF.GltfNode_v2.prototype = new CABLES.Op();
CABLES.OPS["10d09387-0085-4162-ab5b-b89eebbf3cf4"]={f:Ops.Gl.GLTF.GltfNode_v2,objName:"Ops.Gl.GLTF.GltfNode_v2"};




// **************************************************************
// 
// Ops.Html.CSS_v2
// 
// **************************************************************

Ops.Html.CSS_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const code = op.inStringEditor("css code");

code.setUiAttribs(
    {
        "editorSyntax": "css",
        "ignoreBigPort": true
    });

let styleEle = null;
const eleId = "css_" + CABLES.uuid();

code.onChange = update;
update();

function getCssContent()
{
    let css = code.get();
    if (css)
    {
        let patchId = null;
        if (op.storage && op.storage.blueprint && op.storage.blueprint.patchId)
        {
            patchId = op.storage.blueprint.patchId;
        }
        css = css.replace(new RegExp("{{ASSETPATH}}", "g"), op.patch.getAssetPath(patchId));
    }
    return css;
}

function update()
{
    styleEle = op.patch.getDocument().getElementById(eleId);

    if (styleEle)
    {
        styleEle.textContent = getCssContent();
    }
    else
    {
        styleEle = op.patch.getDocument().createElement("style");
        styleEle.type = "text/css";
        styleEle.id = eleId;
        styleEle.textContent = attachments.css_spinner;
        styleEle.classList.add("cablesEle");

        const head = op.patch.getDocument().getElementsByTagName("body")[0];
        head.appendChild(styleEle);
    }
}

op.onDelete = function ()
{
    styleEle = op.patch.getDocument().getElementById(eleId);
    if (styleEle)styleEle.remove();
};


};

Ops.Html.CSS_v2.prototype = new CABLES.Op();
CABLES.OPS["a56d3edd-06ad-44ed-9810-dbf714600c67"]={f:Ops.Html.CSS_v2,objName:"Ops.Html.CSS_v2"};




// **************************************************************
// 
// Ops.Html.CSSProperty_v2
// 
// **************************************************************

Ops.Html.CSSProperty_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    inEle = op.inObject("Element"),
    inProperty = op.inString("Property"),
    inValue = op.inFloat("Value"),
    inValueSuffix = op.inString("Value Suffix", "px"),
    outEle = op.outObject("HTML Element");

op.setPortGroup("Element", [inEle]);
op.setPortGroup("Attributes", [inProperty, inValue, inValueSuffix]);

inProperty.onChange = updateProperty;
inValue.onChange = update;
inValueSuffix.onChange = update;
let ele = null;

inEle.onChange = inEle.onLinkChanged = function ()
{
    if (ele && ele.style)
    {
        ele.style[inProperty.get()] = "initial";
    }
    update();
};

function updateProperty()
{
    update();
    op.setUiAttrib({ "extendTitle": inProperty.get() + "" });
}

function update()
{
    ele = inEle.get();
    if (ele && ele.style)
    {
        const str = inValue.get() + inValueSuffix.get();
        try
        {
            if (ele.style[inProperty.get()] != str)
                ele.style[inProperty.get()] = str;
        }
        catch (e)
        {
            op.logError(e);
        }
    }
    else
    {
        setTimeout(update, 50);
    }

    outEle.set(inEle.get());
}


};

Ops.Html.CSSProperty_v2.prototype = new CABLES.Op();
CABLES.OPS["c179aa0e-b558-4130-8c2d-2deab2919a07"]={f:Ops.Html.CSSProperty_v2,objName:"Ops.Html.CSSProperty_v2"};




// **************************************************************
// 
// Ops.Html.DivElement_v3
// 
// **************************************************************

Ops.Html.DivElement_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    inText = op.inString("Text", "Hello Div"),
    inId = op.inString("Id"),
    inClass = op.inString("Class"),
    inStyle = op.inStringEditor("Style", "position:absolute;\nz-index:100;", "inline-css"),
    inInteractive = op.inValueBool("Interactive", false),
    inVisible = op.inValueBool("Visible", true),
    inBreaks = op.inValueBool("Convert Line Breaks", false),
    inPropagation = op.inValueBool("Propagate Click-Events", true),
    outElement = op.outObject("DOM Element", null, "element"),
    outHover = op.outBoolNum("Hover"),
    outClicked = op.outTrigger("Clicked");

let listenerElement = null;
let oldStr = null;
let prevDisplay = "block";
let div = null;

const canvas = op.patch.cgl.canvas.parentElement;

createElement();

inClass.onChange = updateClass;
inBreaks.onChange = inText.onChange = updateText;
inStyle.onChange = updateStyle;
inInteractive.onChange = updateInteractive;
inVisible.onChange = updateVisibility;

updateText();
updateStyle();
warning();
updateInteractive();

op.onDelete = removeElement;

outElement.onLinkChanged = updateStyle;

function createElement()
{
    div = op.patch.getDocument().createElement("div");
    div.dataset.op = op.id;
    div.classList.add("cablesEle");

    if (inId.get()) div.id = inId.get();

    canvas.appendChild(div);
    outElement.set(div);
}

function removeElement()
{
    if (div) removeClasses();
    if (div && div.parentNode) div.parentNode.removeChild(div);
    oldStr = null;
    div = null;
}

function setCSSVisible(visible)
{
    if (!visible)
    {
        div.style.visibility = "hidden";
        prevDisplay = div.style.display || "block";
        div.style.display = "none";
    }
    else
    {
        // prevDisplay=div.style.display||'block';
        if (prevDisplay == "none") prevDisplay = "block";
        div.style.visibility = "visible";
        div.style.display = prevDisplay;
    }
}

function updateVisibility()
{
    setCSSVisible(inVisible.get());
}

function updateText()
{
    let str = inText.get();

    if (oldStr === str) return;
    oldStr = str;

    if (str && inBreaks.get()) str = str.replace(/(?:\r\n|\r|\n)/g, "<br>");

    if (div.innerHTML != str) div.innerHTML = str;
    outElement.set(null);
    outElement.set(div);
}

// inline css inisde div
function updateStyle()
{
    if (!div) return;
    // if (inStyle.get() != div.style)
    // {
    div.setAttribute("style", inStyle.get());
    updateVisibility();
    outElement.set(null);
    outElement.set(div);
    // }

    if (!div.parentElement)
    {
        canvas.appendChild(div);
    }

    warning();
}

let oldClassesStr = "";

function removeClasses()
{
    if (!div) return;

    const classes = (inClass.get() || "").split(" ");
    for (let i = 0; i < classes.length; i++)
    {
        if (classes[i]) div.classList.remove(classes[i]);
    }
    oldClassesStr = "";
}

function updateClass()
{
    const classes = (inClass.get() || "").split(" ");
    const oldClasses = (oldClassesStr || "").split(" ");

    let found = false;

    for (let i = 0; i < oldClasses.length; i++)
    {
        if (
            oldClasses[i] &&
            classes.indexOf(oldClasses[i].trim()) == -1)
        {
            found = true;
            div.classList.remove(oldClasses[i]);
        }
    }

    for (let i = 0; i < classes.length; i++)
    {
        if (classes[i])
        {
            div.classList.add(classes[i].trim());
        }
    }

    oldClassesStr = inClass.get();
    warning();
}

function onMouseEnter(e)
{
    outHover.set(true);
}

function onMouseLeave(e)
{
    outHover.set(false);
}

function onMouseClick(e)
{
    if (!inPropagation.get())
    {
        e.stopPropagation();
    }
    outClicked.trigger();
}

function updateInteractive()
{
    removeListeners();
    if (inInteractive.get()) addListeners();
}

inId.onChange = function ()
{
    div.id = inId.get();
};

function removeListeners()
{
    if (listenerElement)
    {
        listenerElement.removeEventListener("pointerdown", onMouseClick);
        listenerElement.removeEventListener("pointerleave", onMouseLeave);
        listenerElement.removeEventListener("pointerenter", onMouseEnter);
        listenerElement = null;
    }
}

function addListeners()
{
    if (listenerElement)removeListeners();

    listenerElement = div;

    if (listenerElement)
    {
        listenerElement.addEventListener("pointerdown", onMouseClick);
        listenerElement.addEventListener("pointerleave", onMouseLeave);
        listenerElement.addEventListener("pointerenter", onMouseEnter);
    }
}

op.addEventListener("onEnabledChange", function (enabled)
{
    removeElement();
    if (enabled)
    {
        createElement();
        updateStyle();
        updateClass();
        updateText();
        updateInteractive();
    }
    // if(enabled) updateVisibility();
    // else setCSSVisible(false);
});

function warning()
{
    if (inClass.get() && inStyle.get())
    {
        op.setUiError("error", "Element uses external and inline CSS", 1);
    }
    else
    {
        op.setUiError("error", null);
    }
}


};

Ops.Html.DivElement_v3.prototype = new CABLES.Op();
CABLES.OPS["d55d398c-e68e-486b-b0ce-d9c4bdf7df05"]={f:Ops.Html.DivElement_v3,objName:"Ops.Html.DivElement_v3"};




// **************************************************************
// 
// Ops.Math.TriggerRandomNumber_v2
// 
// **************************************************************

Ops.Math.TriggerRandomNumber_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    exe = op.inTriggerButton("Generate"),
    min = op.inValue("min", 0),
    max = op.inValue("max", 1),
    outTrig = op.outTrigger("next"),
    result = op.outNumber("result"),
    inInteger = op.inValueBool("Integer", false),
    noDupe = op.inValueBool("No consecutive duplicates", false);

op.setPortGroup("Value Range", [min, max]);

exe.onTriggered =
    max.onChange =
    min.onChange =
    inInteger.onChange = genRandom;

genRandom();

function genRandom()
{
    let r = (Math.random() * (max.get() - min.get())) + min.get();

    if (inInteger.get())r = randInt();

    if (min.get() != max.get() && max.get() > min.get())
        while (noDupe.get() && r == result.get()) r = randInt();

    result.set(r);
    outTrig.trigger();
}

function randInt()
{
    return Math.floor((Math.random() * ((max.get() - min.get() + 1))) + min.get());
}


};

Ops.Math.TriggerRandomNumber_v2.prototype = new CABLES.Op();
CABLES.OPS["26f446cc-9107-4164-8209-5254487fa132"]={f:Ops.Math.TriggerRandomNumber_v2,objName:"Ops.Math.TriggerRandomNumber_v2"};




// **************************************************************
// 
// Ops.String.Concat_v2
// 
// **************************************************************

Ops.String.Concat_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    string1 = op.inString("string1", "ABC"),
    string2 = op.inString("string2", "XYZ"),
    newLine = op.inValueBool("New Line", false),
    active = op.inBool("Active", true),
    result = op.outString("result");

newLine.onChange =
    string2.onChange =
    string1.onChange =
    active.onChange = exec;

exec();

function exec()
{
    if (!active.get())
    {
        return result.set(string1.get());
    }
    let s1 = string1.get();
    let s2 = string2.get();
    if (!s1 && !s2)
    {
        result.set("");
        return;
    }
    if (!s1)s1 = "";
    if (!s2)s2 = "";

    let nl = "";
    if (s1 && s2 && newLine.get())nl = "\n";
    result.set(String(s1) + nl + String(s2));
}


};

Ops.String.Concat_v2.prototype = new CABLES.Op();
CABLES.OPS["a52722aa-0ca9-402c-a844-b7e98a6c6e60"]={f:Ops.String.Concat_v2,objName:"Ops.String.Concat_v2"};




// **************************************************************
// 
// Ops.String.String_v2
// 
// **************************************************************

Ops.String.String_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    v = op.inString("value", ""),
    result = op.outString("String");

v.onChange = function ()
{
    result.set(v.get());
};


};

Ops.String.String_v2.prototype = new CABLES.Op();
CABLES.OPS["d697ff82-74fd-4f31-8f54-295bc64e713d"]={f:Ops.String.String_v2,objName:"Ops.String.String_v2"};




// **************************************************************
// 
// Ops.String.NumberToString_v2
// 
// **************************************************************

Ops.String.NumberToString_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    val = op.inValue("Number"),
    result = op.outString("Result");

val.onChange = update;
update();

function update()
{
    result.set(String(val.get() || 0));
}


};

Ops.String.NumberToString_v2.prototype = new CABLES.Op();
CABLES.OPS["5c6d375a-82db-4366-8013-93f56b4061a9"]={f:Ops.String.NumberToString_v2,objName:"Ops.String.NumberToString_v2"};




// **************************************************************
// 
// Ops.Gl.Meshes.RectangleFrame_v2
// 
// **************************************************************

Ops.Gl.Meshes.RectangleFrame_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("Render"),
    width = op.inValueFloat("Width", 1),
    height = op.inValueFloat("Height", 1),
    thickness = op.inValueFloat("Thickness", -0.1),
    pivotX = op.inSwitch("pivot x", ["center", "left", "right"], "center"),
    pivotY = op.inSwitch("pivot y", ["center", "top", "bottom"], "center"),

    trigger = op.outTrigger("trigger"),
    geomOut = op.outObject("Geometry"),

    drawTop = op.inValueBool("Draw Top", true),
    drawBottom = op.inValueBool("Draw Bottom", true),
    drawLeft = op.inValueBool("Draw Left", true),
    drawRight = op.inValueBool("Draw Right", true),
    active = op.inValueBool("Active", true);

op.toWorkPortsNeedToBeLinked(render);
op.setPortGroup("Geometry", [width, height, thickness]);
op.setPortGroup("Transform", [pivotX, pivotY]);
op.setPortGroup("Sections", [drawTop, drawBottom, drawLeft, drawRight]);

const cgl = op.patch.cgl;
let mesh = null;
const geom = new CGL.Geometry(op.name);
geom.tangents = [];
geom.biTangents = [];

geomOut.ignoreValueSerialize = true;

width.onChange =
    pivotX.onChange =
    pivotY.onChange =
    height.onChange =
    thickness.onChange =
    drawTop.onChange =
    drawBottom.onChange =
    drawLeft.onChange =
    drawRight.onChange = () => { mesh = null; };

render.onTriggered = function ()
{
    if (!mesh) create();
    if (active.get() && mesh) mesh.render(cgl.getShader());

    trigger.trigger();
};

function create()
{
    const w = width.get();
    const h = height.get();
    let x = -w / 2;
    let y = -h / 2;
    const th = thickness.get();//* Math.min(height.get(),width.get())*-0.5;

    if (pivotX.get() == "right") x = -w;
    else if (pivotX.get() == "left") x = 0;

    if (pivotY.get() == "top") y = -h;
    else if (pivotY.get() == "bottom") y = 0;

    geom.vertices.length = 0;
    geom.vertices.push(
        x, y, 0,
        x + w, y, 0,
        x + w, y + h, 0,
        x, y + h, 0,
        x - th, y - th, 0,
        x + w + th, y - th, 0,
        x + w + th, y + h + th, 0,
        x - th, y + h + th, 0
    );

    if (geom.vertexNormals.length === 0) geom.vertexNormals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
    if (geom.tangents.length === 0) geom.tangents = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0];
    if (geom.biTangents.length === 0) geom.biTangents = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];

    if (geom.verticesIndices)geom.verticesIndices.length = 0;
    else geom.verticesIndices = [];

    const vertInd = [];
    if (drawBottom.get()) vertInd.push(0, 1, 4, 1, 5, 4);
    if (drawRight.get()) vertInd.push(1, 2, 5, 5, 2, 6);
    if (drawTop.get()) vertInd.push(7, 6, 3, 6, 2, 3);
    if (drawLeft.get()) vertInd.push(0, 4, 3, 4, 7, 3);
    geom.verticesIndices = vertInd;

    if (geom.texCoords.length === 0)
    {
        const tc = [];
        for (let i = 0, j = 0; i < geom.vertices.length; i += 3, j += 2)
        {
            tc[j] = geom.vertices[i + 0] / w - 0.5;
            tc[j + 1] = geom.vertices[i + 1] / h - 0.5;
        }
        geom.texCoords = tc;
    }

    if (!mesh) mesh = new CGL.Mesh(cgl, geom);
    else mesh.setGeom(geom);

    geomOut.set(null);
    geomOut.set(geom);
}


};

Ops.Gl.Meshes.RectangleFrame_v2.prototype = new CABLES.Op();
CABLES.OPS["34e4535e-a784-4474-9b6f-a7e54e26f09e"]={f:Ops.Gl.Meshes.RectangleFrame_v2,objName:"Ops.Gl.Meshes.RectangleFrame_v2"};




// **************************************************************
// 
// Ops.Gl.Meshes.Rectangle_v4
// 
// **************************************************************

Ops.Gl.Meshes.Rectangle_v4 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    render = op.inTrigger("render"),
    doRender = op.inValueBool("Render Mesh", true),
    width = op.inValue("width", 1),
    height = op.inValue("height", 1),
    pivotX = op.inSwitch("pivot x", ["left", "center", "right"], "center"),
    pivotY = op.inSwitch("pivot y", ["top", "center", "bottom"], "center"),
    axis = op.inSwitch("axis", ["xy", "xz"], "xy"),
    flipTcX = op.inBool("Flip TexCoord X", false),
    flipTcY = op.inBool("Flip TexCoord Y", true),
    nColumns = op.inValueInt("num columns", 1),
    nRows = op.inValueInt("num rows", 1),
    trigger = op.outTrigger("trigger"),
    geomOut = op.outObject("geometry", null, "geometry");

geomOut.ignoreValueSerialize = true;

const cgl = op.patch.cgl;
const geom = new CGL.Geometry("rectangle");

doRender.setUiAttribs({ "title": "Render" });
render.setUiAttribs({ "title": "Trigger" });
trigger.setUiAttribs({ "title": "Next" });
op.setPortGroup("Pivot", [pivotX, pivotY, axis]);
op.setPortGroup("Size", [width, height]);
op.setPortGroup("Structure", [nColumns, nRows]);
op.toWorkPortsNeedToBeLinked(render);
op.toWorkShouldNotBeChild("Ops.Gl.TextureEffects.ImageCompose", CABLES.OP_PORT_TYPE_TRIGGER);

const AXIS_XY = 0;
const AXIS_XZ = 1;

let curAxis = AXIS_XY;
let mesh = null;
let needsRebuild = true;
let doScale = true;

const vScale = vec3.create();
vec3.set(vScale, 1, 1, 1);

axis.onChange =
    pivotX.onChange =
    pivotY.onChange =
    flipTcX.onChange =
    flipTcY.onChange =
    nRows.onChange =
    nColumns.onChange = rebuildLater;
updateScale();

width.onChange =
    height.onChange =
    () =>
    {
        if (doScale) updateScale();
        else needsRebuild = true;
    };

function updateScale()
{
    if (curAxis === AXIS_XY) vec3.set(vScale, width.get(), height.get(), 1);
    if (curAxis === AXIS_XZ) vec3.set(vScale, width.get(), 1, height.get());
}

geomOut.onLinkChanged = () =>
{
    doScale = !geomOut.isLinked();
    updateScale();
    needsRebuild = true;
};

function rebuildLater()
{
    needsRebuild = true;
}

render.onTriggered = () =>
{
    if (needsRebuild) rebuild();
    const cg = op.patch.cg;
    if (mesh && doRender.get())
    {
        if (doScale)
        {
            cg.pushModelMatrix();
            mat4.scale(cg.mMatrix, cg.mMatrix, vScale);
        }

        mesh.render(cg.getShader());

        if (doScale) cg.popModelMatrix();
    }

    trigger.trigger();
};

op.onDelete = () =>
{
    if (mesh) mesh.dispose();
    rebuildLater();
};

function rebuild()
{
    if (axis.get() == "xy") curAxis = AXIS_XY;
    if (axis.get() == "xz") curAxis = AXIS_XZ;

    updateScale();
    let w = width.get();
    let h = height.get();

    if (doScale) w = h = 1;

    let x = 0;
    let y = 0;

    if (pivotX.get() == "center") x = 0;
    else if (pivotX.get() == "right") x = -w / 2;
    else if (pivotX.get() == "left") x = +w / 2;

    if (pivotY.get() == "center") y = 0;
    else if (pivotY.get() == "top") y = -h / 2;
    else if (pivotY.get() == "bottom") y = +h / 2;

    const numRows = Math.max(1, Math.round(nRows.get()));
    const numColumns = Math.max(1, Math.round(nColumns.get()));

    const stepColumn = w / numColumns;
    const stepRow = h / numRows;

    const indices = [];
    const tc = new Float32Array((numColumns + 1) * (numRows + 1) * 2);
    const verts = new Float32Array((numColumns + 1) * (numRows + 1) * 3);
    const norms = new Float32Array((numColumns + 1) * (numRows + 1) * 3);
    const tangents = new Float32Array((numColumns + 1) * (numRows + 1) * 3);
    const biTangents = new Float32Array((numColumns + 1) * (numRows + 1) * 3);

    let idxTc = 0;
    let idxVert = 0;
    let idxNorms = 0;
    let idxTangent = 0;
    let idxBiTangent = 0;

    for (let r = 0; r <= numRows; r++)
    {
        for (let c = 0; c <= numColumns; c++)
        {
            verts[idxVert++] = c * stepColumn - w / 2 + x;
            if (curAxis == AXIS_XZ) verts[idxVert++] = 0;
            verts[idxVert++] = r * stepRow - h / 2 + y;

            if (curAxis == AXIS_XY)verts[idxVert++] = 0;

            tc[idxTc++] = c / numColumns;
            tc[idxTc++] = r / numRows;

            if (curAxis == AXIS_XY) // default
            {
                norms[idxNorms++] = 0;
                norms[idxNorms++] = 0;
                norms[idxNorms++] = 1;

                tangents[idxTangent++] = 1;
                tangents[idxTangent++] = 0;
                tangents[idxTangent++] = 0;

                biTangents[idxBiTangent++] = 0;
                biTangents[idxBiTangent++] = 1;
                biTangents[idxBiTangent++] = 0;
            }
            else if (curAxis == AXIS_XZ)
            {
                norms[idxNorms++] = 0;
                norms[idxNorms++] = 1;
                norms[idxNorms++] = 0;

                biTangents[idxBiTangent++] = 0;
                biTangents[idxBiTangent++] = 0;
                biTangents[idxBiTangent++] = 1;
            }
        }
    }

    indices.length = numColumns * numRows * 6;
    let idx = 0;

    for (let c = 0; c < numColumns; c++)
    {
        for (let r = 0; r < numRows; r++)
        {
            const ind = c + (numColumns + 1) * r;
            const v1 = ind;
            const v2 = ind + 1;
            const v3 = ind + numColumns + 1;
            const v4 = ind + 1 + numColumns + 1;

            if (curAxis == AXIS_XY) // default
            {
                indices[idx++] = v1;
                indices[idx++] = v2;
                indices[idx++] = v3;

                indices[idx++] = v3;
                indices[idx++] = v2;
                indices[idx++] = v4;
            }
            else
            if (curAxis == AXIS_XZ)
            {
                indices[idx++] = v1;
                indices[idx++] = v3;
                indices[idx++] = v2;

                indices[idx++] = v2;
                indices[idx++] = v3;
                indices[idx++] = v4;
            }
        }
    }

    if (flipTcY.get()) for (let i = 0; i < tc.length; i += 2)tc[i + 1] = 1.0 - tc[i + 1];
    if (flipTcX.get()) for (let i = 0; i < tc.length; i += 2)tc[i] = 1.0 - tc[i];

    geom.clear();
    geom.vertices = verts;
    geom.texCoords = tc;
    geom.verticesIndices = indices;
    geom.vertexNormals = norms;
    geom.tangents = tangents;
    geom.biTangents = biTangents;

    if (!mesh) mesh = op.patch.cg.createMesh(geom);
    else mesh.setGeom(geom);

    geomOut.setRef(geom);
    needsRebuild = false;
}


};

Ops.Gl.Meshes.Rectangle_v4.prototype = new CABLES.Op();
CABLES.OPS["cc8c3ede-7103-410b-849f-a645793cab39"]={f:Ops.Gl.Meshes.Rectangle_v4,objName:"Ops.Gl.Meshes.Rectangle_v4"};




// **************************************************************
// 
// Ops.Gl.Shader.BasicMaterial_v3
// 
// **************************************************************

Ops.Gl.Shader.BasicMaterial_v3 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={"basicmaterial_frag":"{{MODULES_HEAD}}\n\nIN vec2 texCoord;\n\n#ifdef VERTEX_COLORS\nIN vec4 vertCol;\n#endif\n\n#ifdef HAS_TEXTURES\n    IN vec2 texCoordOrig;\n    #ifdef HAS_TEXTURE_DIFFUSE\n        UNI sampler2D tex;\n    #endif\n    #ifdef HAS_TEXTURE_OPACITY\n        UNI sampler2D texOpacity;\n   #endif\n#endif\n\n\n\nvoid main()\n{\n    {{MODULE_BEGIN_FRAG}}\n    vec4 col=color;\n\n\n    #ifdef HAS_TEXTURES\n        vec2 uv=texCoord;\n\n        #ifdef CROP_TEXCOORDS\n            if(uv.x<0.0 || uv.x>1.0 || uv.y<0.0 || uv.y>1.0) discard;\n        #endif\n\n        #ifdef HAS_TEXTURE_DIFFUSE\n            col=texture(tex,uv);\n\n            #ifdef COLORIZE_TEXTURE\n                col.r*=color.r;\n                col.g*=color.g;\n                col.b*=color.b;\n            #endif\n        #endif\n        col.a*=color.a;\n        #ifdef HAS_TEXTURE_OPACITY\n            #ifdef TRANSFORMALPHATEXCOORDS\n                uv=texCoordOrig;\n            #endif\n            #ifdef ALPHA_MASK_IALPHA\n                col.a*=1.0-texture(texOpacity,uv).a;\n            #endif\n            #ifdef ALPHA_MASK_ALPHA\n                col.a*=texture(texOpacity,uv).a;\n            #endif\n            #ifdef ALPHA_MASK_LUMI\n                col.a*=dot(vec3(0.2126,0.7152,0.0722), texture(texOpacity,uv).rgb);\n            #endif\n            #ifdef ALPHA_MASK_R\n                col.a*=texture(texOpacity,uv).r;\n            #endif\n            #ifdef ALPHA_MASK_G\n                col.a*=texture(texOpacity,uv).g;\n            #endif\n            #ifdef ALPHA_MASK_B\n                col.a*=texture(texOpacity,uv).b;\n            #endif\n            // #endif\n        #endif\n    #endif\n\n    {{MODULE_COLOR}}\n\n    #ifdef DISCARDTRANS\n        if(col.a<0.2) discard;\n    #endif\n\n    #ifdef VERTEX_COLORS\n        col*=vertCol;\n    #endif\n\n    outColor = col;\n}\n","basicmaterial_vert":"\n{{MODULES_HEAD}}\n\nOUT vec2 texCoord;\nOUT vec2 texCoordOrig;\n\nUNI mat4 projMatrix;\nUNI mat4 modelMatrix;\nUNI mat4 viewMatrix;\n\n#ifdef HAS_TEXTURES\n    UNI float diffuseRepeatX;\n    UNI float diffuseRepeatY;\n    UNI float texOffsetX;\n    UNI float texOffsetY;\n#endif\n\n#ifdef VERTEX_COLORS\n    in vec4 attrVertColor;\n    out vec4 vertCol;\n\n#endif\n\n\nvoid main()\n{\n    mat4 mMatrix=modelMatrix;\n    mat4 mvMatrix;\n\n    norm=attrVertNormal;\n    texCoordOrig=attrTexCoord;\n    texCoord=attrTexCoord;\n    #ifdef HAS_TEXTURES\n        texCoord.x=texCoord.x*diffuseRepeatX+texOffsetX;\n        texCoord.y=(1.0-texCoord.y)*diffuseRepeatY+texOffsetY;\n    #endif\n\n    #ifdef VERTEX_COLORS\n        vertCol=attrVertColor;\n    #endif\n\n    vec4 pos = vec4(vPosition, 1.0);\n\n    #ifdef BILLBOARD\n       vec3 position=vPosition;\n       mvMatrix=viewMatrix*modelMatrix;\n\n       gl_Position = projMatrix * mvMatrix * vec4((\n           position.x * vec3(\n               mvMatrix[0][0],\n               mvMatrix[1][0],\n               mvMatrix[2][0] ) +\n           position.y * vec3(\n               mvMatrix[0][1],\n               mvMatrix[1][1],\n               mvMatrix[2][1]) ), 1.0);\n    #endif\n\n    {{MODULE_VERTEX_POSITION}}\n\n    #ifndef BILLBOARD\n        mvMatrix=viewMatrix * mMatrix;\n    #endif\n\n\n    #ifndef BILLBOARD\n        // gl_Position = projMatrix * viewMatrix * modelMatrix * pos;\n        gl_Position = projMatrix * mvMatrix * pos;\n    #endif\n}\n",};
const render = op.inTrigger("render");

const trigger = op.outTrigger("trigger");
const shaderOut = op.outObject("shader", null, "shader");

shaderOut.ignoreValueSerialize = true;

op.toWorkPortsNeedToBeLinked(render);
op.toWorkShouldNotBeChild("Ops.Gl.TextureEffects.ImageCompose", CABLES.OP_PORT_TYPE_FUNCTION);

const cgl = op.patch.cgl;
const shader = new CGL.Shader(cgl, "basicmaterialnew");
shader.addAttribute({ "type": "vec3", "name": "vPosition" });
shader.addAttribute({ "type": "vec2", "name": "attrTexCoord" });
shader.addAttribute({ "type": "vec3", "name": "attrVertNormal", "nameFrag": "norm" });
shader.addAttribute({ "type": "float", "name": "attrVertIndex" });

shader.setModules(["MODULE_VERTEX_POSITION", "MODULE_COLOR", "MODULE_BEGIN_FRAG"]);

shader.setSource(attachments.basicmaterial_vert, attachments.basicmaterial_frag);

shaderOut.setRef(shader);

render.onTriggered = doRender;

// rgba colors
const r = op.inValueSlider("r", Math.random());
const g = op.inValueSlider("g", Math.random());
const b = op.inValueSlider("b", Math.random());
const a = op.inValueSlider("a", 1);
r.setUiAttribs({ "colorPick": true });

// const uniColor=new CGL.Uniform(shader,'4f','color',r,g,b,a);
const colUni = shader.addUniformFrag("4f", "color", r, g, b, a);

shader.uniformColorDiffuse = colUni;

// diffuse outTexture

const diffuseTexture = op.inTexture("texture");
let diffuseTextureUniform = null;
diffuseTexture.onChange = updateDiffuseTexture;

const colorizeTexture = op.inValueBool("colorizeTexture", false);
const vertexColors = op.inValueBool("Vertex Colors", false);

// opacity texture
const textureOpacity = op.inTexture("textureOpacity");
let textureOpacityUniform = null;

const alphaMaskSource = op.inSwitch("Alpha Mask Source", ["Luminance", "R", "G", "B", "A", "1-A"], "Luminance");
alphaMaskSource.setUiAttribs({ "greyout": true });
textureOpacity.onChange = updateOpacity;

const texCoordAlpha = op.inValueBool("Opacity TexCoords Transform", false);
const discardTransPxl = op.inValueBool("Discard Transparent Pixels");

// texture coords
const
    diffuseRepeatX = op.inValue("diffuseRepeatX", 1),
    diffuseRepeatY = op.inValue("diffuseRepeatY", 1),
    diffuseOffsetX = op.inValue("Tex Offset X", 0),
    diffuseOffsetY = op.inValue("Tex Offset Y", 0),
    cropRepeat = op.inBool("Crop TexCoords", false);

shader.addUniformFrag("f", "diffuseRepeatX", diffuseRepeatX);
shader.addUniformFrag("f", "diffuseRepeatY", diffuseRepeatY);
shader.addUniformFrag("f", "texOffsetX", diffuseOffsetX);
shader.addUniformFrag("f", "texOffsetY", diffuseOffsetY);

const doBillboard = op.inValueBool("billboard", false);

alphaMaskSource.onChange =
    doBillboard.onChange =
    discardTransPxl.onChange =
    texCoordAlpha.onChange =
    cropRepeat.onChange =
    vertexColors.onChange =
    colorizeTexture.onChange = updateDefines;

op.setPortGroup("Color", [r, g, b, a]);
op.setPortGroup("Color Texture", [diffuseTexture, vertexColors, colorizeTexture]);
op.setPortGroup("Opacity", [textureOpacity, alphaMaskSource, discardTransPxl, texCoordAlpha]);
op.setPortGroup("Texture Transform", [diffuseRepeatX, diffuseRepeatY, diffuseOffsetX, diffuseOffsetY, cropRepeat]);

updateOpacity();
updateDiffuseTexture();

op.preRender = function ()
{
    shader.bind();
    doRender();
};

function doRender()
{
    if (!shader) return;

    cgl.pushShader(shader);
    shader.popTextures();

    if (diffuseTextureUniform && diffuseTexture.get()) shader.pushTexture(diffuseTextureUniform, diffuseTexture.get());
    if (textureOpacityUniform && textureOpacity.get()) shader.pushTexture(textureOpacityUniform, textureOpacity.get());

    trigger.trigger();

    cgl.popShader();
}

function updateOpacity()
{
    if (textureOpacity.get())
    {
        if (textureOpacityUniform !== null) return;
        shader.removeUniform("texOpacity");
        shader.define("HAS_TEXTURE_OPACITY");
        if (!textureOpacityUniform)textureOpacityUniform = new CGL.Uniform(shader, "t", "texOpacity");
    }
    else
    {
        shader.removeUniform("texOpacity");
        shader.removeDefine("HAS_TEXTURE_OPACITY");
        textureOpacityUniform = null;
    }

    updateDefines();
}

function updateDiffuseTexture()
{
    if (diffuseTexture.get())
    {
        if (!shader.hasDefine("HAS_TEXTURE_DIFFUSE"))shader.define("HAS_TEXTURE_DIFFUSE");
        if (!diffuseTextureUniform)diffuseTextureUniform = new CGL.Uniform(shader, "t", "texDiffuse");
    }
    else
    {
        shader.removeUniform("texDiffuse");
        shader.removeDefine("HAS_TEXTURE_DIFFUSE");
        diffuseTextureUniform = null;
    }
    updateUi();
}

function updateUi()
{
    diffuseRepeatX.setUiAttribs({ "greyout": !diffuseTexture.get() });
    diffuseRepeatY.setUiAttribs({ "greyout": !diffuseTexture.get() });
    diffuseOffsetX.setUiAttribs({ "greyout": !diffuseTexture.get() });
    diffuseOffsetY.setUiAttribs({ "greyout": !diffuseTexture.get() });
    colorizeTexture.setUiAttribs({ "greyout": !diffuseTexture.get() });

    alphaMaskSource.setUiAttribs({ "greyout": !textureOpacity.get() });
    texCoordAlpha.setUiAttribs({ "greyout": !textureOpacity.get() });

    let notUsingColor = true;
    notUsingColor = diffuseTexture.get() && !colorizeTexture.get();
    r.setUiAttribs({ "greyout": notUsingColor });
    g.setUiAttribs({ "greyout": notUsingColor });
    b.setUiAttribs({ "greyout": notUsingColor });
}

function updateDefines()
{
    shader.toggleDefine("VERTEX_COLORS", vertexColors.get());
    shader.toggleDefine("CROP_TEXCOORDS", cropRepeat.get());
    shader.toggleDefine("COLORIZE_TEXTURE", colorizeTexture.get());
    shader.toggleDefine("TRANSFORMALPHATEXCOORDS", texCoordAlpha.get());
    shader.toggleDefine("DISCARDTRANS", discardTransPxl.get());
    shader.toggleDefine("BILLBOARD", doBillboard.get());

    shader.toggleDefine("ALPHA_MASK_ALPHA", alphaMaskSource.get() == "A");
    shader.toggleDefine("ALPHA_MASK_IALPHA", alphaMaskSource.get() == "1-A");
    shader.toggleDefine("ALPHA_MASK_LUMI", alphaMaskSource.get() == "Luminance");
    shader.toggleDefine("ALPHA_MASK_R", alphaMaskSource.get() == "R");
    shader.toggleDefine("ALPHA_MASK_G", alphaMaskSource.get() == "G");
    shader.toggleDefine("ALPHA_MASK_B", alphaMaskSource.get() == "B");
    updateUi();
}


};

Ops.Gl.Shader.BasicMaterial_v3.prototype = new CABLES.Op();
CABLES.OPS["ec55d252-3843-41b1-b731-0482dbd9e72b"]={f:Ops.Gl.Shader.BasicMaterial_v3,objName:"Ops.Gl.Shader.BasicMaterial_v3"};




// **************************************************************
// 
// Ops.Anim.Timer_v2
// 
// **************************************************************

Ops.Anim.Timer_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    inSpeed = op.inValue("Speed", 1),
    playPause = op.inValueBool("Play", true),
    reset = op.inTriggerButton("Reset"),
    inSyncTimeline = op.inValueBool("Sync to timeline", false),
    outTime = op.outNumber("Time");

op.setPortGroup("Controls", [playPause, reset, inSpeed]);

const timer = new CABLES.Timer();
let lastTime = null;
let time = 0;
let syncTimeline = false;

playPause.onChange = setState;
setState();

function setState()
{
    if (playPause.get())
    {
        timer.play();
        op.patch.addOnAnimFrame(op);
    }
    else
    {
        timer.pause();
        op.patch.removeOnAnimFrame(op);
    }
}

reset.onTriggered = doReset;

function doReset()
{
    time = 0;
    lastTime = null;
    timer.setTime(0);
    outTime.set(0);
}

inSyncTimeline.onChange = function ()
{
    syncTimeline = inSyncTimeline.get();
    playPause.setUiAttribs({ "greyout": syncTimeline });
    reset.setUiAttribs({ "greyout": syncTimeline });
};

op.onAnimFrame = function (tt, frameNum, deltaMs)
{
    if (timer.isPlaying())
    {
        if (CABLES.overwriteTime !== undefined)
        {
            outTime.set(CABLES.overwriteTime * inSpeed.get());
        }
        else

        if (syncTimeline)
        {
            outTime.set(tt * inSpeed.get());
        }
        else
        {
            timer.update();
            const timerVal = timer.get();

            if (lastTime === null)
            {
                lastTime = timerVal;
                return;
            }

            const t = Math.abs(timerVal - lastTime);
            lastTime = timerVal;

            time += t * inSpeed.get();
            if (time != time)time = 0;
            outTime.set(time);
        }
    }
};


};

Ops.Anim.Timer_v2.prototype = new CABLES.Op();
CABLES.OPS["aac7f721-208f-411a-adb3-79adae2e471a"]={f:Ops.Anim.Timer_v2,objName:"Ops.Anim.Timer_v2"};




// **************************************************************
// 
// Ops.Math.Sum
// 
// **************************************************************

Ops.Math.Sum = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments=op.attachments={};
const
    number1 = op.inValueFloat("number1", 1),
    number2 = op.inValueFloat("number2", 1),
    result = op.outNumber("result");

op.setTitle("+");

number1.onChange =
number2.onChange = exec;
exec();

function exec()
{
    const v = number1.get() + number2.get();
    if (!isNaN(v))
        result.set(v);
}


};

Ops.Math.Sum.prototype = new CABLES.Op();
CABLES.OPS["c8fb181e-0b03-4b41-9e55-06b6267bc634"]={f:Ops.Math.Sum,objName:"Ops.Math.Sum"};



window.addEventListener('load', function(event) {
CABLES.jsLoaded=new Event('CABLES.jsLoaded');
document.dispatchEvent(CABLES.jsLoaded);
});
