const { createCatalogController } = require('./catalogController');

module.exports = createCatalogController({
  collectionName: 'handhelds',
  categoryType: 'handheld',
});
