exports.options = { transaction: false };

exports.up = (pgm) => {
  pgm.addColumn(
    { schema: "public", name: "products" },
    {
      model: {
        type: "varchar(255)",
        notNull: false,
      },
      serial_number: {
        type: "varchar(255)",
        notNull: false,
        unique: true,
      },
      warranty_status: {
        type: "varchar(255)",
        notNull: false,
      },
      distributor_info: {
        type: "text",
        notNull: false,
      },
    },
  );
};

exports.down = (pgm) => {
  pgm.dropColumn({ schema: "public", name: "products" }, "model");
  pgm.dropColumn({ schema: "public", name: "products" }, "serial_number");
  pgm.dropColumn({ schema: "public", name: "products" }, "warranty_status");
  pgm.dropColumn({ schema: "public", name: "products" }, "distributor_info");
};
