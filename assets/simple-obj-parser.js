(function () {
  // Minimal Wavefront OBJ parser: positions + normals only (no materials,
  // textures, or groups) — enough geometry to render a spinning preview
  // mesh for a cart line item without pulling in a full loader.
  function resolveIndex(token, length) {
    var n = parseInt(token, 10);
    if (n > 0) return n - 1;
    if (n < 0) return length + n;
    return 0;
  }

  function parseOBJ(text) {
    var positions = [];
    var normals = [];
    var outPositions = [];
    var outNormals = [];

    var lines = text.split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.charAt(0) === '#') {
        continue;
      }

      var parts = line.split(/\s+/);
      var keyword = parts[0];

      if (keyword === 'v') {
        positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
      } else if (keyword === 'vn') {
        normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
      } else if (keyword === 'f') {
        var verts = parts.slice(1).map(function (token) {
          var segments = token.split('/');
          var vIndex = resolveIndex(segments[0], positions.length);
          var nIndex = segments[2] ? resolveIndex(segments[2], normals.length) : null;
          return { v: vIndex, n: nIndex };
        });

        for (var f = 1; f < verts.length - 1; f++) {
          [verts[0], verts[f], verts[f + 1]].forEach(function (vert) {
            var p = positions[vert.v];
            if (!p) {
              return;
            }
            outPositions.push(p[0], p[1], p[2]);
            if (vert.n !== null && normals[vert.n]) {
              var nrm = normals[vert.n];
              outNormals.push(nrm[0], nrm[1], nrm[2]);
            }
          });
        }
      }
    }

    return {
      positions: new Float32Array(outPositions),
      normals: outNormals.length === outPositions.length ? new Float32Array(outNormals) : null
    };
  }

  window.ROGParseOBJ = parseOBJ;
})();
