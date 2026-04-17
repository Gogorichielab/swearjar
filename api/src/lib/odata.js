function escapeOdata(value) {
  return String(value).replace(/'/g, "''");
}

module.exports = { escapeOdata };
