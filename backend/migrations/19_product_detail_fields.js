exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS country_of_origin varchar(100),
      ADD COLUMN IF NOT EXISTS material text,
      ADD COLUMN IF NOT EXISTS model_height varchar(50),
      ADD COLUMN IF NOT EXISTS model_chest varchar(50),
      ADD COLUMN IF NOT EXISTS model_waist varchar(50),
      ADD COLUMN IF NOT EXISTS model_hips varchar(50),
      ADD COLUMN IF NOT EXISTS model_size varchar(20),
      ADD COLUMN IF NOT EXISTS sizes text[];
  `)
}

// This migration replaces the removed 12_product_detail_fields file for
// databases that already recorded later notification migrations.
exports.down = () => {}
