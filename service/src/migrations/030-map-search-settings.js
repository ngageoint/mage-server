exports.id = 'map-search-settings';

exports.up = async function (done) {

  const roles = this.db.collection('roles');
  try {
    await roles.updateOne({ name: 'USER_ROLE' }, { $push: { permissions: 'MAP_SETTINGS_READ' } });
  } catch (e) { done(e) }

  try {
    await roles.updateOne({ name: 'USER_NO_EDIT_ROLE' }, { $push: { permissions: 'MAP_SETTINGS_READ' } });
  } catch (e) { done(e) }


  try {
    await roles.updateOne({ name: 'EVENT_MANAGER_ROLE' }, { $push: { permissions: 'MAP_SETTINGS_READ' } });
  } catch (e) { done(e) }

  try {
    await roles.updateOne({ name: 'ADMIN_ROLE' }, { $push: { permissions: { $each: ['MAP_SETTINGS_READ', 'MAP_SETTINGS_UPDATE'] } } });
  } catch (e) { done(e) }

  const settings = this.db.collection('settings');
  try {
    await settings.insertOne({
      type: 'map',
      settings: {
        webSearchType: "NOMINATIM",
        webNominatimUrl: "https://nominatim.openstreetmap.org",
        mobileSearchType: "NATIVE",
      }
    });
  } catch (e) { done(e) }

  done();
};

exports.down = function (done) {
  done();
};