// parse model

/*

This function appears to be a utility function for subdividing a 3D mesh into a grid of smaller triangles. It does this by taking a mesh with quadrilaterals (four-sided polygons) as its primitives and breaking each quad into a grid of smaller triangles.

The function takes in a modelData object and the number of divisions nDivs to use for each quad. The modelData object has a meshes property, which is an array of mesh objects. Each mesh object has several properties, including vertexPositions, vertexNormals, and indices, which are arrays of vertex data for the mesh.

The function iterates over the meshes array and processes each mesh individually. For each mesh, it processes each quad by:

Creating a two-dimensional array vertexGrid to store the vertices of the subdivided quad.

Calculating the change in position between each pair of vertices along the top and bottom edges of the quad and using these values to create the first and last rows of the vertexGrid.

Calculating the change in position between the vertices at the top and bottom of each column of the vertexGrid and using these values to create the intermediate rows.

Iterating over the rows and columns of the vertexGrid and using the vertex positions to create new vertices for the subdivided mesh. It also uses the normal of the original quad for all of the new vertices.

Creating new indices for the subdivided mesh by connecting the vertices in the vertexGrid into triangles.

Appending the new vertex positions, normals, and indices to the arrays newMeshVpositions, newMeshVnormals, and newMeshIndices, respectively.

Finally, the function updates the original mesh object with the new vertex data and indices by replacing the values of the vertexPositions, vertexNormals, and indices properties with the contents of newMeshVpositions, newMeshVnormals, and newMeshIndices, respectively. This effectively replaces the original mesh with a subdivided version.
 */
function parseModelJson(jsonFile) {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", jsonFile, true);
  xhr.overrideMimeType("application/json");
  xhr.send();
  xhr.onreadystatechange = function() {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      // get response
      if (xhr.status == 200) {
        object = JSON.parse(xhr.responseText);
        divideCornellBoxFaces(object, subdivisions);
        console.log(
          "Vertex num is " + object.meshes[0].vertexPositions.length + "."
        );
      } else {
        console.log("Fail:", xhr.status);
      }
    }
  };
}
// subdivide
function divideCornellBoxFaces(modelData, nDivs) {
  let meshes = modelData.meshes;
  for (let meshId = 0; meshId < meshes.length; meshId++) {
    let meshVpositions = meshes[meshId].vertexPositions;
    let nVertices = meshVpositions.length / 3;
    let meshVnormals = meshes[meshId].vertexNormals;
    let meshIndices = meshes[meshId].indices;
    let newMeshVpositions = [];
    let newMeshVnormals = [];
    let newMeshIndices = [];
    // take each quad and subdivide into n*m quads
    var meshIndex = 0;
    for (var i = 0; i < nVertices; i += 4) {
      var quad = new Array(4);
      for (var j = 0; j < 4; j++) {
        quad[j] = [
          meshVpositions[(i + j) * 3 + 0],
          meshVpositions[(i + j) * 3 + 1],
          meshVpositions[(i + j) * 3 + 2]
        ];
      }
      // assumes same normal for all vertices of the quad
      var normal = [
        meshVnormals[i * 3 + 0],
        meshVnormals[i * 3 + 1],
        meshVnormals[i * 3 + 2]
      ];
      // create vertex grid
      var vertexGrid = new Array(nDivs + 1); //rows
      for (var m = 0; m <= nDivs; m++) vertexGrid[m] = new Array(nDivs + 1);
      // create the first row of the vertex grid.
      // and create the last row of the vertex grid.
      var dHoriz1 = [
        (quad[1][0] - quad[0][0]) / nDivs,
        (quad[1][1] - quad[0][1]) / nDivs,
        (quad[1][2] - quad[0][2]) / nDivs
      ];
      var dHoriz2 = [
        (quad[2][0] - quad[3][0]) / nDivs,
        (quad[2][1] - quad[3][1]) / nDivs,
        (quad[2][2] - quad[3][2]) / nDivs
      ];
      for (var n = 0; n <= nDivs; n++) {
        vertexGrid[0][n] = [
          quad[0][0] + n * dHoriz1[0],
          quad[0][1] + n * dHoriz1[1],
          quad[0][2] + n * dHoriz1[2]
        ];
        vertexGrid[nDivs][n] = [
          quad[3][0] + n * dHoriz2[0],
          quad[3][1] + n * dHoriz2[1],
          quad[3][2] + n * dHoriz2[2]
        ];
        // create intermediate rows for the vertex grid.
        var dVert = [
          (vertexGrid[nDivs][n][0] - vertexGrid[0][n][0]) / nDivs,
          (vertexGrid[nDivs][n][1] - vertexGrid[0][n][1]) / nDivs,
          (vertexGrid[nDivs][n][2] - vertexGrid[0][n][2]) / nDivs
        ];
        for (var m = 1; m < nDivs; m++) {
          vertexGrid[m][n] = [
            vertexGrid[0][n][0] + m * dVert[0],
            vertexGrid[0][n][1] + m * dVert[1],
            vertexGrid[0][n][2] + m * dVert[2]
          ];
        }
      }
      // create new mesh positions, normals, indices from the grid
      for (var m = 0; m < nDivs; m++) {
        // vertical subdivisions
        for (var n = 0; n < nDivs; n++) {
          newMeshIndices.push(meshIndex + (m + 1) * (nDivs + 1) + n);
          newMeshIndices.push(meshIndex + m * (nDivs + 1) + n);
          newMeshIndices.push(meshIndex + m * (nDivs + 1) + n + 1);
          newMeshIndices.push(meshIndex + m * (nDivs + 1) + n + 1);
          newMeshIndices.push(meshIndex + (m + 1) * (nDivs + 1) + n + 1);
          newMeshIndices.push(meshIndex + (m + 1) * (nDivs + 1) + n);
        }
      }
      for (var m = 0; m <= nDivs; m++) {
        // vertical subdivisions
        for (var n = 0; n <= nDivs; n++, meshIndex++) {
          // horizontal subdivisions
          var k;
          for (k = 0; k < 3; k++) newMeshVpositions.push(vertexGrid[m][n][k]);
          for (k = 0; k < 3; k++) newMeshVnormals.push(normal[k]);
        }
      }
    }
    meshes[meshId].vertexPositions = newMeshVpositions;
    meshes[meshId].vertexNormals = newMeshVnormals;
    meshes[meshId].indices = newMeshIndices;
  }
}
