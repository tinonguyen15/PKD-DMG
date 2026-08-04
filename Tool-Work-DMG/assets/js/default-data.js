(function () {
  const now = () => new Date().toISOString();

  const menuCategories = [
    { id: "lau-suon-chia", name: "Lẩu sườn chìa", sortOrder: 1 },
    { id: "lau-xi-quach", name: "Lẩu xí quách", sortOrder: 2 },
    { id: "mon-them", name: "Món thêm", sortOrder: 3 },
    { id: "do-uong", name: "Đồ uống", sortOrder: 4 }
  ];

  const menuImagePath = (id) => `assets/images/menu/${id}.jpg`;

  const menuItems = [
    ["lau-dac-biet", "lau-xi-quach", "Lẩu đặc biệt Đắng Mà Ghiền", "Lẩu đặc biệt ĐMG", "Lẩu đặc biệt Đắng Mà Ghiền", 529000, "phần", 1, menuImagePath("lau-dac-biet")],
    ["lau-suon-chia-dac-biet", "lau-suon-chia", "Lẩu sườn chìa lớn", "Lẩu sườn chìa (Lớn)", "Lẩu sườn chìa (Lớn)", 449000, "phần", 2, menuImagePath("lau-suon-chia-dac-biet")],
    ["lau-suon-chia-nho", "lau-suon-chia", "Lẩu sườn chìa nhỏ", "Lẩu sườn chìa (Nhỏ)", "Lẩu sườn chìa (Nhỏ)", 309000, "phần", 3, menuImagePath("lau-suon-chia-nho")],
    ["lau-lon", "lau-xi-quach", "Lẩu xí quách lớn", "Lẩu xí quách (Lớn)", "Lẩu xí quách (Lớn)", 309000, "phần", 4, menuImagePath("lau-lon")],
    ["lau-nho", "lau-xi-quach", "Lẩu xí quách nhỏ", "Lẩu xí quách (Nhỏ)", "Lẩu xí quách (Nhỏ)", 209000, "phần", 5, menuImagePath("lau-nho")],
    ["ca-thac-lac-vien", "mon-them", "Cá thác lác viên", "Cá viên", "Cá thác lác viên", 69000, "phần", 6, menuImagePath("ca-thac-lac-vien")],
    ["cha-ca-chien", "mon-them", "Chả cá chiên", "Chả cá", "Chả cá chiên", 95000, "phần", 7, menuImagePath("cha-ca-chien")],
    ["suon-chia-them", "mon-them", "Sườn chìa", "Sườn chìa", "Sườn chìa", 69000, "phần", 8, menuImagePath("suon-chia-them")],
    ["xi-quach", "mon-them", "Xí quách", "Xí quách", "Xí quách", 69000, "phần", 9, menuImagePath("xi-quach")],
    ["tuy", "mon-them", "Tủy", "Tủy", "Tủy", 49000, "phần", 10, ""],
    ["dot-kho-qua-rung", "mon-them", "Đọt khổ qua rừng lớn", "Đọt (Lớn)", "Đọt Khổ Qua Rừng (Lớn)", 49000, "phần", 11, menuImagePath("dot-kho-qua-rung")],
    ["dot-kho-qua-rung-nho", "mon-them", "Đọt khổ qua rừng nhỏ", "Đọt (Nhỏ)", "Đọt Khổ Qua Rừng (Nhỏ)", 29000, "phần", 12, menuImagePath("dot-kho-qua-rung")],
    ["set-rau", "mon-them", "Set rau tổng hợp lớn", "Set rau (Lớn)", "Set rau tổng hợp (Lớn)", 69000, "set", 13, menuImagePath("set-rau")],
    ["set-rau-nho", "mon-them", "Set rau tổng hợp nhỏ", "Set rau (Nhỏ)", "Set rau tổng hợp (Nhỏ)", 49000, "set", 14, menuImagePath("set-rau")],
    ["rau-ngot", "mon-them", "Rau ngót", "Rau ngót", "Rau ngót", 16000, "phần", 15, menuImagePath("rau-ngot")],
    ["muop", "mon-them", "Mướp", "Mướp", "Mướp", 16000, "phần", 16, ""],
    ["kho-qua-bao", "mon-them", "Khổ qua bào", "Khổ qua bào", "Khổ qua bào", 16000, "phần", 17, menuImagePath("kho-qua-bao")],
    ["nam-them", "mon-them", "Nấm lớn", "Nấm (Lớn)", "Nấm (Lớn)", 49000, "phần", 18, menuImagePath("nam-them")],
    ["nam-them-nho", "mon-them", "Nấm nhỏ", "Nấm (Nhỏ)", "Nấm (Nhỏ)", 29000, "phần", 19, menuImagePath("nam-them")],
    ["kho-qua-rung-nhoi", "mon-them", "Khổ qua rừng nhồi", "Nhồi", "Khổ qua rừng nhồi", 55000, "phần", 20, menuImagePath("kho-qua-rung-nhoi")],
    ["kho-qua-rung", "mon-them", "Khổ qua rừng", "Khổ qua rừng", "Khổ qua rừng", 16000, "phần", 21, ""],
    ["bun", "mon-them", "Bún", "Bún", "Bún", 10000, "phần", 22, menuImagePath("bun")],
    ["nuoc-lau-them", "mon-them", "Nước lẩu", "Nước lẩu", "Nước lẩu", 10000, "phần", 23, menuImagePath("nuoc-lau-them")],
    ["mi-goi", "mon-them", "Mì gói", "Mì gói", "Mì gói", 7000, "gói", 24, menuImagePath("mi-goi"), false],
    ["coca", "do-uong", "Coca", "Coca", "Coca", 15000, "lon", 25, ""],
    ["sprite", "do-uong", "Sprite", "Sprite", "Sprite", 15000, "lon", 26, ""],
    ["nuoc-sam", "do-uong", "Nước sâm", "Nước sâm", "Nước sâm", 12000, "chai", 27, ""],
    ["nuoc-suoi", "do-uong", "Nước suối", "Nước suối", "Nước suối", 10000, "chai", 28, ""],
    ["tiger-crystal", "do-uong", "Tiger Crystal", "Tiger Crystal", "Tiger Crystal", 26000, "lon", 29, ""],
    ["tiger", "do-uong", "Tiger", "Tiger", "Tiger", 24000, "lon", 30, ""],
    ["heineken-lon-cao", "do-uong", "Heineken (lon cao)", "Heineken cao", "Heineken lon cao", 27000, "lon", 31, ""],
    ["heineken-lon-lun", "do-uong", "Heineken (lon lùn)", "Heineken lùn", "Heineken lon lùn", 22000, "lon", 32, ""],
    ["sai-gon", "do-uong", "Sài Gòn", "Sài Gòn", "Sài Gòn", 18000, "lon", 33, ""]
  ].map(([id, category, name, branchName, customerName, price, unit, sortOrder, imageData, active = true]) => ({
    id,
    category,
    name,
    branchName,
    customerName,
    shortName: branchName,
    price,
    unit,
    active,
    sortOrder,
    imageData,
    imagePlaceholder: name.split(" ").slice(0, 2).join(" ")
  }));

  const messageCategories = [
    "Xác nhận đơn",
    "Hỏi thông tin khách",
    "Thanh toán",
    "Giao hàng",
    "Hết món",
    "Chăm sóc sau đơn",
    "Khác"
  ].map((name, index) => ({
    id: `msg-cat-${index + 1}`,
    name,
    sortOrder: index + 1,
    createdAt: now(),
    updatedAt: now()
  }));

  const categoryIdByName = Object.fromEntries(messageCategories.map((item) => [item.name, item.id]));
  const templateRows = [
    ["Hỏi thông tin khách", "Xin thông tin giao hàng", "Dạ anh/chị cho em xin tên người nhận, số điện thoại, địa chỉ và thời gian muốn nhận món để em lên đơn giúp mình ạ."],
    ["Hỏi thông tin khách", "Xin thời gian nhận", "Dạ anh/chị muốn nhận món vào khoảng mấy giờ để bên em chuẩn bị món tốt nhất ạ?"],
    ["Xác nhận đơn", "Xác nhận đơn đã lên", "Dạ bên em đã ghi nhận đơn của {{ten_khach}}. Tổng thanh toán là {{tong_tien}}. Thời gian nhận dự kiến: {{thoi_gian}} ạ."],
    ["Thanh toán", "Xác nhận chuyển khoản", "Dạ bên em đã nhận được thông tin chuyển khoản của anh/chị. Bên em sẽ tiến hành chuẩn bị món ngay ạ."],
    ["Giao hàng", "Đơn đang được giao", "Dạ đơn của anh/chị đã được bàn giao cho tài xế. Anh/chị để ý điện thoại giúp em ạ."],
    ["Hết món", "Thông báo hết món", "Dạ hiện tại món anh/chị chọn đang tạm hết. Anh/chị có thể đổi sang món khác hoặc bên em hỗ trợ điều chỉnh đơn giúp mình ạ."],
    ["Chăm sóc sau đơn", "Cảm ơn khách", "Dạ cảm ơn anh/chị đã đặt món tại Lẩu Khổ Qua Rừng Đắng Mà Ghiền. Chúc anh/chị và gia đình dùng bữa ngon miệng ạ."]
  ];

  const messageTemplates = templateRows.map(([categoryName, title, content], index) => ({
    id: `msg-${index + 1}`,
    categoryId: categoryIdByName[categoryName],
    title,
    content,
    keywords: "",
    isPinned: index === 2,
    sortOrder: index + 1,
    createdAt: now(),
    updatedAt: now()
  }));

  const abbreviationRules = [
    ["lau-dac-biet", "Lẩu đặc biệt Đắng Mà Ghiền", "Lẩu đặc biệt ĐMG", true, 1],
    ["lau-suon-chia-dac-biet", "Lẩu sườn chìa lớn", "Lẩu sườn chìa (Lớn)", true, 2],
    ["lau-suon-chia-nho", "Lẩu sườn chìa nhỏ", "Lẩu sườn chìa (Nhỏ)", true, 3],
    ["lau-lon", "Lẩu xí quách lớn", "Lẩu xí quách (Lớn)", true, 4],
    ["lau-nho", "Lẩu xí quách nhỏ", "Lẩu xí quách (Nhỏ)", true, 5],
    ["ca-thac-lac-vien", "Cá thác lác viên", "cá thác lác viên", false, 6],
    ["cha-ca-chien", "Chả cá chiên", "chả cá chiên", false, 7],
    ["suon-chia-them", "Sườn chìa", "sườn chìa", false, 8],
    ["xi-quach", "Xí quách", "xí quách", false, 9],
    ["tuy", "Tủy", "tủy", false, 10],
    ["dot-kho-qua-rung", "Đọt khổ qua rừng lớn", "Đọt (Lớn)", false, 11],
    ["dot-kho-qua-rung-nho", "Đọt khổ qua rừng nhỏ", "Đọt (Nhỏ)", false, 12],
    ["set-rau", "Set rau tổng hợp lớn", "Set rau (Lớn)", false, 13],
    ["set-rau-nho", "Set rau tổng hợp nhỏ", "Set rau (Nhỏ)", false, 14],
    ["rau-ngot", "Rau ngót", "rau ngót", false, 15],
    ["muop", "Mướp", "mướp", false, 16],
    ["kho-qua-bao", "Khổ qua bào", "khổ qua bào", false, 17],
    ["nam-them", "Nấm lớn", "Nấm (Lớn)", false, 18],
    ["nam-them-nho", "Nấm nhỏ", "Nấm (Nhỏ)", false, 19],
    ["kho-qua-rung-nhoi", "Khổ qua rừng nhồi", "nhồi", false, 20],
    ["kho-qua-rung", "Khổ qua rừng", "khổ qua rừng", false, 21],
    ["bun", "Bún", "bún", false, 22],
    ["nuoc-lau-them", "Nước lẩu", "nước lẩu", false, 23],
    ["mi-goi", "Mì gói", "mì gói", false, 24],
    ["coca", "Coca", "Coca", false, 25],
    ["sprite", "Sprite", "Sprite", false, 26],
    ["nuoc-sam", "Nước sâm", "nước sâm", false, 27],
    ["nuoc-suoi", "Nước suối", "nước suối", false, 28],
    ["tiger-crystal", "Tiger Crystal", "Tiger Crystal", false, 29],
    ["tiger", "Tiger", "Tiger", false, 30],
    ["heineken-lon-cao", "Heineken (lon cao)", "Heineken cao", false, 31],
    ["heineken-lon-lun", "Heineken (lon lùn)", "Heineken lùn", false, 32],
    ["sai-gon", "Sài Gòn", "Sài Gòn", false, 33]
  ].map(([id, match, output, showPrice, sortOrder]) => ({
    id,
    match,
    output,
    showPrice,
    active: true,
    sortOrder
  }));

  const orderSources = [
    "Facebook",
    "Zalo",
    "Hotline",
    "Google",
    "Khách quen",
    "Walk-in",
    "Khác"
  ].map((name, index) => ({ id: `source-${index + 1}`, name, active: true, sortOrder: index + 1 }));

  const emptyDraftOrder = () => ({
    orderType: "delivery",
    source: "",
    status: "",
    customerName: "",
    phone: "",
    address: "",
    branch: "",
    items: {},
    paymentMethod: "Tiền mặt",
    receiveTime: "",
    note: "",
    editingOrderId: ""
  });

  const itemById = Object.fromEntries(menuItems.map((item) => [item.id, item]));
  const formatMoney = (value) => `${value.toLocaleString("vi-VN")}đ`;
  const historyRows = [
    ["seed-order-001", "2026-07-21T21:18:25+07:00", "Zl Chipi", "delivery", [["lau-lon", 1, "Lẩu xí quách (Lớn) 309k"]]],
    ["seed-order-002", "2026-07-21T20:25:41+07:00", "FB Phamsang", "delivery", [["lau-nho", 1, "Lẩu xí quách (Nhỏ) 209k"]]],
    ["seed-order-003", "2026-07-21T20:10:05+07:00", "a Dự", "pickup", [["lau-dac-biet", 1, "lẩu đặc biệt ĐMG 529k"]]],
    ["seed-order-004", "2026-07-21T20:09:15+07:00", "FB Chuyên Đồ Thanh Lý", "delivery", [["lau-nho", 1, "Lẩu xí quách (Nhỏ) 209k"], ["set-rau", 1, "Set rau (Lớn)"], ["bun", 1, "Bún"]]],
    ["seed-order-005", "2026-07-21T19:30:42+07:00", "FB Lé Louis", "delivery", [["lau-dac-biet", 1, "lẩu đặc biệt ĐMG 529k"]]],
    ["seed-order-006", "2026-07-21T19:26:25+07:00", "FB Chí Tâm", "delivery", [["lau-dac-biet", 1, "lẩu đặc biệt ĐMG 529k"]]],
    ["seed-order-007", "2026-07-21T19:24:21+07:00", "FB Bình Minh", "delivery", [["lau-suon-chia-dac-biet", 1, "Lẩu sườn chìa (Lớn) 449k"]]],
    ["seed-order-008", "2026-07-21T18:42:02+07:00", "FB Phạm Anh Minh", "delivery", [["lau-nho", 1, "Lẩu xí quách (Nhỏ)"]]],
    ["seed-order-009", "2026-07-21T17:36:31+07:00", "FB Nhung Nguyen", "delivery", [["lau-nho", 1, "Lẩu xí quách (Nhỏ)"]]],
    ["seed-order-010", "2026-07-21T17:15:19+07:00", "FB Phung Pham", "delivery", [["lau-dac-biet", 1, "lẩu đặc biệt ĐMG"]]]
  ];

  const orderHistory = historyRows.map(([id, createdAt, customerName, orderType, rows]) => {
    const items = rows.map(([itemId, quantity, shortName]) => {
      const item = itemById[itemId];
      const lineTotal = item.price * quantity;
      return {
        id: item.id,
        name: item.name,
        branchName: shortName || item.branchName,
        customerName: item.customerName,
        shortName,
        price: item.price,
        quantity,
        lineTotal
      };
    });
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const title = orderType === "pickup" ? "ĐƠN GHÉ LẤY" : "ĐƠN MANG VỀ";
    const timeLabel = orderType === "pickup" ? "Thời gian ghé lấy" : "Thời gian nhận";
    const generatedText = [
      title,
      "",
      "• Chi nhánh: Chưa chọn",
      `• Tên: ${customerName}`,
      "• SĐT: Chưa nhập",
      ...(orderType === "delivery" ? ["• Địa chỉ: Chưa nhập"] : []),
      `• Món: ${items[0] ? `${items[0].quantity} ${items[0].shortName}` : "Chưa chọn món"}`,
      ...items.slice(1).map((item) => `${item.quantity} ${item.shortName}`),
      `• ${timeLabel}: ${orderType === "delivery" ? "Giao ngay" : "Chưa nhập"}`
    ].join("\n");

    return {
      id,
      createdAt,
      createdDate: "2026-07-21",
      workflowStatus: "completed",
      staffId: "001",
      staffName: "001",
      orderType,
      source: "",
      status: "",
      customerName,
      phone: "",
      address: "",
      branch: "",
      items,
      subtotal: total,
      total,
      paymentMethod: "Tiền mặt",
      receiveTime: "",
      note: "",
      generatedText
    };
  });

  window.DMG_DEFAULTS = {
    dataVersion: 3,
    menuCategories,
    menuItems,
    branches: [],
    orderSources,
    orderStatuses: [
      "Done",
      "CK",
      "COD",
      "Đã thanh toán",
      "Chưa thanh toán",
      "Đã xác nhận",
      "Đã hủy"
    ].map((name, index) => ({ id: `status-${index + 1}`, name, sortOrder: index + 1 })),
    paymentMethods: [
      "Tiền mặt",
      "Chuyển khoản",
      "COD",
      "Thanh toán khi ghé lấy",
      "Đã thanh toán trước"
    ].map((name, index) => ({ id: `pay-${index + 1}`, name, sortOrder: index + 1 })),
    messageCategories,
    messageTemplates,
    settings: {
      historyLimit: 100,
      missingTemplateVariableMode: "keep",
      defaultBranchId: "",
      defaultStaffId: "",
      defaultOrderSource: "Facebook",
      menuAssetsVersion: 3,
      abbreviationRules
    },
    staffProfiles: [],
    currentStaffId: "",
    draftOrder: emptyDraftOrder(),
    orderHistory
  };

  window.DMG_EMPTY_DRAFT_ORDER = emptyDraftOrder;
})();
