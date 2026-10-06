// Strips MongoDB operator keys from user input (prevents NoSQL injection such as {"email":{"$ne":null}})
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).filter(([k]) => !k.startsWith('$') && !k.includes('.')).map(([k, v]) => [k, clean(v)])
    );
  }
  return value;
}

function mongoSanitize(req, _res, next) {
  if (req.body) req.body = clean(req.body);
  if (req.params) req.params = clean(req.params);
  if (req.query) {
    const q = clean(req.query);
    Object.keys(req.query).forEach((k) => { if (!(k in q)) delete req.query[k]; });
  }
  next();
}

module.exports = { mongoSanitize };
