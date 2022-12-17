let run = true;
let modelFile = "models/cornell-box.json";

let exposure = 7;
let object = null;

let model = null;
let camera = null;
let cam = null;
let projMatrix = null;
let viewMatrix = [];
let angle = 0;
let panangle = 0;

let tempRadio = null;
let tempOrder = 0;

// options
function init() {
  window.iterations = parseInt(document.getElementById("iterations").value);
  window.subdivisions = parseInt(document.getElementById("subdivisions").value);
  parseModelJson(modelFile);
}

function toggleStatus() {
  let btn = document.getElementById("control-status");
  if (run) {
    run = !run;
    btn.innerText = "Continue";
  } else {
    run = !run;
    btn.innerText = "Stop";
    genRadiosity(gl, tempRadio, iterations - tempOrder);
  }
}

function draw() {
  viewMatrix = camera.getViewMatrix();
  projMatrix = camera.getProjMatrix();
  model.draw(projMatrix, viewMatrix, null);

  window.requestAnimationFrame(draw);
}

/*
The function appears to be taking in an object with a triangles property, which is an array of triangle objects. It then performs several steps to compute the radiosity for each triangle:

It iterates over the triangles array and finds the triangle with the highest unshotMag property. This property is likely a measure of the amount of light that has not yet been computed for the triangle.

It sets up a camera and renders the scene from five different viewpoints, using the triangle's center, normal, tangent, and bitangent properties to determine the camera's position and orientation.

It calls a function formFactors for each of the five renderings, passing in the rendering results, the index of the triangle being processed, and a value of 1 or 0. It's not clear what the formFactors function does, but it's likely that it calculates some kind of weighting or scaling factor based on the rendered image.

It sets the triangle's unshot property to [0, 0, 0] and its unshotMag property to 0, indicating that all of the light for this triangle has now been computed.

 */
function interRadiosity(radiosity) {
  //1 added to meshID right before draw, so subtract to get correct meshID
  let max = -1;
  //find the max
  for (let j = 0; j < radiosity.triangles.length; j++) {
    //if we haven't picked a first candidate
    if (max == -1 && radiosity.triangles[j].unshotMag > 0) {
      max = j;
    }
    //else find the highest value
    else if (
      max > -1 &&
      radiosity.triangles[j].unshotMag > radiosity.triangles[max].unshotMag
    ) {
      max = j;
    }
  }
  //if there's something to shoot
  if (max > -1) {
    let tan = new Float32Array(radiosity.triangles[max].tangent);
    let norm = new Float32Array(radiosity.triangles[max].normal);
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //make a camera
    cam.setAt(tan);
    cam.setUp(radiosity.triangles[max].normal);
    cam.setEye(radiosity.triangles[max].center);
    viewMatrix = cam.getViewMatrix();
    projMatrix = cam.getProjMatrix();
    //draw the first face
    radiosity.formFactors(radiosity.draw(projMatrix, viewMatrix, null), max, 1);
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //make a cam
    tan = [-tan[0], -tan[1], -tan[2]];
    cam.setAt(tan);
    cam.setUp(radiosity.triangles[max].normal);
    cam.setEye(radiosity.triangles[max].center);
    viewMatrix = cam.getViewMatrix();
    projMatrix = cam.getProjMatrix();
    //draw the second face
    radiosity.formFactors(radiosity.draw(projMatrix, viewMatrix, null), max, 1);

    //make a cam
    tan = new Float32Array(radiosity.triangles[max].bitangent);
    cam.setAt(tan);
    cam.setUp(radiosity.triangles[max].normal);
    cam.setEye(radiosity.triangles[max].center);
    viewMatrix = cam.getViewMatrix();
    projMatrix = cam.getProjMatrix();
    //draw the third face
    radiosity.formFactors(radiosity.draw(projMatrix, viewMatrix, null), max, 1);

    //make a cam
    tan = [-tan[0], -tan[1], -tan[2]];
    cam.setAt(tan);
    cam.setUp(radiosity.triangles[max].normal);
    cam.setEye(radiosity.triangles[max].center);
    viewMatrix = cam.getViewMatrix();
    projMatrix = cam.getProjMatrix();
    //draw the fourth face
    radiosity.formFactors(radiosity.draw(projMatrix, viewMatrix, null), max, 1);

    //make a cam
    cam.setAt(norm);
    cam.setUp(tan);
    cam.setEye(radiosity.triangles[max].center);
    viewMatrix = cam.getViewMatrix();
    projMatrix = cam.getProjMatrix();
    //draw the last face
    radiosity.formFactors(radiosity.draw(projMatrix, viewMatrix, null), max, 0);

    radiosity.triangles[max].unshot[0] = 0;
    radiosity.triangles[max].unshot[1] = 0;
    radiosity.triangles[max].unshot[2] = 0;
    radiosity.triangles[max].unshotMag = 0;
  }
}
/*
This function appears to be a higher-level function that manages the process of generating radiosity for a 3D scene. It performs the following steps:

It clears the color and depth buffers of the WebGL context gl.

It enters a loop that runs for a specified number of iterations. For each iteration, it calls the interRadiosity function, passing in the radiosity object. It also checks the value of a run variable and exits the loop if run is false.

If the current iteration is a multiple of 10, it calls the mapColor function on the radiosity object and then draws the scene using the draw function.

If the loop completed all of its iterations, it sets the tempRadio and tempOrder variables to the radiosity object and the number of iterations, respectively, and then calls the mapColor function and the draw function to render the final result.

If the loop exited early because run was false, it sets a timeout to call itself again with the remaining number of iterations, or it calls itself immediately if config.show is false.


 */

function genRadiosity(gl, radiosity, iterations) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  let i;
  for (i = 0; i < iterations; i++) {
    if (run) {
      interRadiosity(radiosity);
    } else {
      break;
    }

    if (i != 0 && i % 10 == 0) {
      radiosity.mapColor();
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      model = new RenderableModel(gl, object);
      draw();
      break;
    }
  }
  if (i < iterations && run == true) {
    if (config.show) {
      setTimeout(() => {
        console.log("Last iterations:", iterations - i);
        genRadiosity(gl, radiosity, iterations - i);
      }, 10);
    } else {
      genRadiosity(gl, radiosity, iterations - i);
    }
  } else {
    tempRadio = radiosity;
    tempOrder = i;
    radiosity.mapColor();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    model = new RenderableModel(gl, object);
    draw();
  }
}

function scrollToScale(e) {
  if (e.wheelDelta > 0) {
    // big
    camera.decFOV();
    projMatrix = camera.getProjMatrix();
  } else if (e.wheelDelta < 0) {
    // small
    camera.incFOV();
    projMatrix = camera.getProjMatrix();
  }
}

function keyIsDown(event) {
  // w
  if (event.keyCode == 87) {
    camera.pedestal(viewMatrix, camera.getDiag() * 0.02);
  }
  //Dolly Backwards with S
  else if (event.keyCode == 83) {
    camera.pedestal(viewMatrix, camera.getDiag() * -0.02);
  }
  //Truck Right with D
  else if (event.keyCode == 65) {
    camera.truck(viewMatrix, camera.getDiag() * -0.02);
  }
  //Truck Left with A
  else if (event.keyCode == 68) {
    camera.truck(viewMatrix, camera.getDiag() * 0.02);
  }
  // up
  else if (event.keyCode == 38) {
    if (angle > -30) {
      angle--;
      camera.tilt(viewMatrix, -1);
    }
  }
  // down
  else if (event.keyCode == 40) {
    if (angle < 30) {
      angle++;
      camera.tilt(viewMatrix, 1);
    }
  }
  // left
  else if (event.keyCode == 37) {
    panangle--;
    if (panangle < 0) panangle += 360;
    viewMatrix = camera.pan(viewMatrix, -1);
  }
  // right
  else if (event.keyCode == 39) {
    panangle++;
    if (panangle > 360) panangle -= 360;
    viewMatrix = camera.pan(viewMatrix, 1);
  }
}

let gl;

function setupWebGL() {
  // setup WebGL
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Getting_started_with_WebGL
  // https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLCanvasElement/getContext
  const canvas = document.getElementById("glCanvas");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (gl === null) {
    alert(
      "Unable to initialize WebGL. Your browser or machine may not support it."
    );
    return;
  }
}

function main() {
  setupWebGL();
  model = new RenderableModel(gl, object);
  camera = new Camera(gl, model.getBounds(), [0, 1, 0]);
  cam = new radCam(gl, model.getBounds(), [0, 1, 0]);
  projMatrix = camera.getProjMatrix();
  viewMatrix = camera.getRotatedViewMatrix(0);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/enable
  gl.enable(gl.DEPTH_TEST);

  // -------
  radio = new radiosity(gl, object);
  radio.triangles = radio.idTriangles(object);

  console.time("Render");
  genRadiosity(gl, radio, iterations);
  console.timeEnd("Render");
}

window.onmousewheel = scrollToScale;
window.onload = init;
window.onkeydown = keyIsDown;
