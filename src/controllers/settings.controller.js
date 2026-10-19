// Settings are stored in a simple JSON file / env for MongoDB version
// For full settings, use a Settings collection
const { ok, serverError } = require('../utils/response');

const defaults = {
  system_name:          'QuranClass',
  default_currency:     'ETB',
  timezone:             'Africa/Addis_Ababa',
  mid_month_rule:       'count_at_end',
  telegram_bot_token:   '',
  telegram_bot_username:'',
};

// In-memory store (gets reset on server restart; for production use a DB collection)
let settingsStore = { ...defaults };

exports.list = async (req, res) => {
  try {
    return ok(res, { settings: settingsStore });
  } catch (err) {
    return serverError(res, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const { settings } = req.body;
    settingsStore = { ...settingsStore, ...settings };
    return ok(res, {}, 'Settings updated');
  } catch (err) {
    return serverError(res, err.message);
  }
};
