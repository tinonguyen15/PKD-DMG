(function () {
  const keys = [
    "menuCategories",
    "menuItems",
    "branches",
    "orderSources",
    "orderStatuses",
    "paymentMethods",
    "messageCategories",
    "messageTemplates",
    "settings",
    "draftOrder",
    "orderHistory",
    "dataVersion",
    "staffProfiles",
    "currentStaffId"
  ];

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const chromeGet = (input) => new Promise((resolve) => chrome.storage.local.get(input, resolve));
  const chromeSet = (input) => new Promise((resolve) => chrome.storage.local.set(input, resolve));
  const chromeClear = () => new Promise((resolve) => chrome.storage.local.clear(resolve));

  function normalizeMenuMessageNames(item = {}) {
    const branchName = String(item.branchName || item.shortName || item.name || "").trim();
    const customerName = String(item.customerName || item.name || branchName).trim();
    return {
      ...item,
      branchName,
      customerName,
      shortName: item.shortName || branchName
    };
  }

  function normalizeMenuMessageNameList(items = []) {
    return (Array.isArray(items) ? items : []).map(normalizeMenuMessageNames);
  }

  function mergeMenuAssetDefaults(menuItems = [], { preferDefaults = false } = {}) {
    const defaults = clone(window.DMG_DEFAULTS.menuItems);
    const defaultById = new Map(defaults.map((item) => [item.id, item]));
    const currentById = new Map((Array.isArray(menuItems) ? menuItems : []).map((item) => [item.id, item]));
    const merged = (Array.isArray(menuItems) ? menuItems : []).map((item) => {
      const defaultItem = defaultById.get(item.id);
      if (!defaultItem) return normalizeMenuMessageNames(item);
      if (preferDefaults) {
        return normalizeMenuMessageNames({
          ...item,
          ...defaultItem,
          imageData: item.imageData || defaultItem.imageData || "",
          imagePlaceholder: defaultItem.imagePlaceholder || item.imagePlaceholder || item.name?.slice(0, 2) || ""
        });
      }
      return normalizeMenuMessageNames({
        ...defaultItem,
        ...item,
        imageData: item.imageData || defaultItem.imageData || "",
        imagePlaceholder: item.imagePlaceholder || defaultItem.imagePlaceholder || item.name?.slice(0, 2) || ""
      });
    });
    defaults.forEach((item) => {
      if (!currentById.has(item.id)) merged.push(item);
    });
    return merged;
  }

  function mergeAbbreviationDefaults(rules = [], { preferDefaults = false } = {}) {
    const defaults = clone(window.DMG_DEFAULTS.settings.abbreviationRules || []);
    const sourceRules = Array.isArray(rules) ? rules : [];
    const defaultById = new Map(defaults.map((rule) => [rule.id, rule]));
    const currentById = new Map(sourceRules.map((rule) => [rule.id, rule]));
    const merged = sourceRules.map((rule) => {
      const defaultRule = defaultById.get(rule.id);
      if (!defaultRule) return rule;
      return preferDefaults ? { ...rule, ...defaultRule } : { ...defaultRule, ...rule };
    });
    defaults.forEach((rule) => {
      if (!currentById.has(rule.id)) merged.push(rule);
    });
    return merged;
  }

  function hasMissingDefaultItems(items = []) {
    if (!Array.isArray(items) || !items.length) return true;
    const currentIds = new Set(items.map((item) => item.id));
    return window.DMG_DEFAULTS.menuItems.some((item) => !currentIds.has(item.id));
  }

  function hasMissingMenuMessageNames(items = []) {
    if (!Array.isArray(items) || !items.length) return true;
    return items.some((item) => !String(item.branchName || "").trim() || !String(item.customerName || "").trim());
  }

  function hasMissingDefaultAbbreviations(rules = []) {
    if (!Array.isArray(rules) || !rules.length) return true;
    const currentIds = new Set(rules.map((rule) => rule.id));
    return (window.DMG_DEFAULTS.settings.abbreviationRules || []).some((rule) => !currentIds.has(rule.id));
  }

  function buildSettingsPatch(current, patch, menuAssetsVersion, abbreviationRules) {
    return {
      ...clone(window.DMG_DEFAULTS.settings),
      ...(current.settings || {}),
      ...(patch.settings || {}),
      ...(abbreviationRules ? { abbreviationRules } : {}),
      menuAssetsVersion
    };
  }

  async function initialize() {
    const current = await chromeGet(keys);
    const patch = {};
    for (const key of keys) {
      if (typeof current[key] === "undefined") patch[key] = clone(window.DMG_DEFAULTS[key]);
    }
    if ((Number(current.dataVersion) || 0) < window.DMG_DEFAULTS.dataVersion) {
      patch.dataVersion = window.DMG_DEFAULTS.dataVersion;
      patch.orderHistory = clone(window.DMG_DEFAULTS.orderHistory);
      patch.draftOrder = clone(window.DMG_DEFAULTS.draftOrder);
    }
    const menuAssetsVersion = Number(current.settings?.menuAssetsVersion) || 0;
    if (menuAssetsVersion < 1) {
      patch.menuItems = mergeMenuAssetDefaults(patch.menuItems || current.menuItems);
      patch.settings = buildSettingsPatch(current, patch, 1);
    }
    if (menuAssetsVersion < 2) {
      patch.menuItems = mergeMenuAssetDefaults(patch.menuItems || current.menuItems, { preferDefaults: true });
      patch.settings = buildSettingsPatch(
        current,
        patch,
        2,
        mergeAbbreviationDefaults(patch.settings?.abbreviationRules || current.settings?.abbreviationRules, { preferDefaults: true })
      );
    }
    if (menuAssetsVersion < 3) {
      patch.menuItems = mergeMenuAssetDefaults(patch.menuItems || current.menuItems, { preferDefaults: true });
      patch.settings = buildSettingsPatch(
        current,
        patch,
        3,
        mergeAbbreviationDefaults(patch.settings?.abbreviationRules || current.settings?.abbreviationRules, { preferDefaults: true })
      );
    }
    if (menuAssetsVersion >= window.DMG_DEFAULTS.settings.menuAssetsVersion) {
      const nextMenuItems = patch.menuItems || current.menuItems;
      const nextRules = patch.settings?.abbreviationRules || current.settings?.abbreviationRules;
      const shouldRepairMenu = hasMissingDefaultItems(nextMenuItems);
      const shouldRepairNames = hasMissingMenuMessageNames(nextMenuItems);
      const shouldRepairAbbreviations = hasMissingDefaultAbbreviations(nextRules);
      if (shouldRepairMenu) {
        patch.menuItems = mergeMenuAssetDefaults(nextMenuItems, { preferDefaults: true });
      } else if (shouldRepairNames) {
        patch.menuItems = normalizeMenuMessageNameList(nextMenuItems);
      }
      if (shouldRepairMenu || shouldRepairNames || shouldRepairAbbreviations) {
        patch.settings = buildSettingsPatch(
          current,
          patch,
          window.DMG_DEFAULTS.settings.menuAssetsVersion,
          mergeAbbreviationDefaults(nextRules, { preferDefaults: true })
        );
      }
    }
    if (Object.keys(patch).length) await chromeSet(patch);
    return getAll();
  }

  async function getAll() {
    const data = await chromeGet(keys);
    const merged = clone(window.DMG_DEFAULTS);
    for (const key of keys) {
      if (typeof data[key] !== "undefined") merged[key] = data[key];
    }
    merged.settings = {
      ...clone(window.DMG_DEFAULTS.settings),
      ...(data.settings || {}),
      defaultOrderSource: data.settings?.defaultOrderSource || window.DMG_DEFAULTS.settings.defaultOrderSource,
      abbreviationRules: Array.isArray(data.settings?.abbreviationRules)
        ? data.settings.abbreviationRules
        : clone(window.DMG_DEFAULTS.settings.abbreviationRules)
    };
    return merged;
  }

  async function setValue(key, value) {
    await chromeSet({ [key]: value });
  }

  async function setMany(values) {
    await chromeSet(values);
  }

  async function resetDefaults({ keepHistory = false } = {}) {
    const history = keepHistory ? (await getAll()).orderHistory : [];
    await chromeClear();
    const defaults = clone(window.DMG_DEFAULTS);
    defaults.orderHistory = history;
    await chromeSet(defaults);
    return getAll();
  }

  function validateImport(data) {
    const required = [
      "menuCategories",
      "menuItems",
      "branches",
      "orderStatuses",
      "paymentMethods",
      "messageCategories",
      "messageTemplates",
      "settings",
      "orderHistory"
    ];
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("File sao lưu phải là một object JSON.");
    }
    for (const key of required) {
      if (typeof data[key] === "undefined") throw new Error(`Thiếu key ${key}.`);
      if (key !== "settings" && !Array.isArray(data[key])) throw new Error(`Key ${key} phải là danh sách.`);
    }
    if (typeof data.orderSources !== "undefined" && !Array.isArray(data.orderSources)) {
      throw new Error("Key orderSources phải là danh sách.");
    }
    if (typeof data.settings !== "object" || Array.isArray(data.settings)) {
      throw new Error("Key settings phải là object.");
    }
  }

  async function importData(data) {
    validateImport(data);
    const next = clone(window.DMG_DEFAULTS);
    for (const key of keys) {
      if (typeof data[key] !== "undefined") next[key] = data[key];
    }
    await chromeSet(next);
    return getAll();
  }

  window.DMGStorage = {
    getAll,
    importData,
    initialize,
    keys,
    resetDefaults,
    setMany,
    setValue,
    validateImport
  };
})();
