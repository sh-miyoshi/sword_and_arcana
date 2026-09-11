const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

// A solid sphere of radius 16 model units (= 1 block), made from supported
// Bedrock cubes. Adjacent strips touch; no billboard or restricted poly_mesh.
const radius = 16
const cubes = []
for (let y = -radius; y < radius; y++) {
  for (let z = -radius; z < radius; z++) {
    const squaredWidth = radius ** 2 - (y + 0.5) ** 2 - (z + 0.5) ** 2
    if (squaredWidth <= 0) continue
    const halfWidth = Math.round(Math.sqrt(squaredWidth) * 10000) / 10000
    cubes.push({ origin: [-halfWidth, y, z], size: [halfWidth * 2, 1, 1], uv: [0, 0] })
  }
}
const directory = join(__dirname, '../resource/models/entity')
mkdirSync(directory, { recursive: true })
// Keep each strip on one line so that the generated geometry stays reviewable.
const output = `{
  "format_version": "1.12.0",
  "minecraft:geometry": [{
    "description": {
      "identifier": "geometry.black_magic_sphere",
      "texture_width": 128,
      "texture_height": 128,
      "visible_bounds_width": 2.2,
      "visible_bounds_height": 2.2,
      "visible_bounds_offset": [0, 0, 0]
    },
    "bones": [{
      "name": "sphere",
      "pivot": [0, 0, 0],
      "cubes": [
${cubes.map(cube => '        ' + JSON.stringify(cube)).join(',\n')}
      ]
    }]
  }]
}
`
writeFileSync(join(directory, 'black_magic_sphere.geo.json'), output)
console.log(`Generated black magic sphere (${cubes.length} strips).`)
