exports.up = (pgm) => {
  pgm.addColumns('products', {
    country_of_origin: { type: 'varchar(100)' },
    material: { type: 'text' },
    model_height: { type: 'varchar(50)' },
    model_chest: { type: 'varchar(50)' },
    model_waist: { type: 'varchar(50)' },
    model_hips: { type: 'varchar(50)' },
    model_size: { type: 'varchar(20)' },
    sizes: { type: 'text[]' },
  })
}

exports.down = (pgm) => {
  pgm.dropColumns('products', [
    'country_of_origin',
    'material',
    'model_height',
    'model_chest',
    'model_waist',
    'model_hips',
    'model_size',
    'sizes',
  ])
}
